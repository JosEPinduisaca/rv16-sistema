# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

RV16 is a management system for a referee association (Núcleo Arbitral): scheduling referee availability, assigning referees to matches (`designaciones`), tracking championships/tariffs, cash advances (`adelantos`), and generating periodic payment settlements (`liquidaciones`). All domain names, UI copy, and code comments are in Spanish — keep new code consistent with that (Spanish variable/function names in domain code, Spanish user-facing messages).

Monorepo layout:
- `backend/` — Express 5 + PostgreSQL REST API (CommonJS)
- `frontend/` — React 19 + Vite + Tailwind v4 SPA
- `database/` — SQL schema and migrations, run manually against Postgres (no migration tool/ORM)

## Commands

Backend (run from `backend/`):
- `npm run dev` — start API with `node --watch` on `http://localhost:4000` (port from `.env`)
- `npm start` — start without watch
- `node crear-admin.js` — one-off script to create/reset the admin user (`admin@rv16.com`)
- No test suite is configured (`npm test` is a placeholder).

Frontend (run from `frontend/`):
- `npm run dev` — Vite dev server at `http://localhost:5173`
- `npm run build` — production build
- `npm run lint` — Oxlint
- `npm run preview` — preview a production build

Database: no migration framework. To set up a fresh database, run `database/schema.sql` first, then apply every `database/migracion_*.sql` file **in order** (see below) — the schema file is not kept in sync with later migrations.

## Environment

Backend reads config from `backend/.env` (see `.env.example`): `PORT`, `DB_*` (Postgres connection), `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL` (used for CORS allowlist and password-reset links), and optional `RESEND_API_KEY`/`RESEND_FROM` for sending the password-reset email via the Resend HTTP API (`src/utils/correo.js`) — if `RESEND_API_KEY` is empty, the recovery link is just printed to the backend console instead of sent, useful for local dev. (`.env.example` still documents unused legacy `SMTP_*` vars — nodemailer is a leftover dependency, not actually wired up anywhere.)

Frontend reads `VITE_API_URL` (defaults to `/api`).

## Architecture

### Backend structure
Classic layered Express app, one file per resource in each layer:
- `server.js` → loads env, starts `src/app.js`
- `src/app.js` → wires CORS (allowlist: `localhost:5173` + `FRONTEND_URL`), JSON body parsing, static `/uploads`, and mounts one router per resource under `/api/<resource>`
- `src/routes/*Routes.js` → declares endpoints, applies `verificarToken` / `permitirRoles(...)` middleware per route
- `src/controllers/*Controller.js` → thin request handlers: destructure `req`, call the matching service function, wrap in `try/catch` and pass failures to `manejarError(res, error, mensajePorDefecto)`
- `src/services/*Service.js` → business logic and validation; throws `AppError(status, mensaje, extra?)` (`src/utils/AppError.js`) for expected failures (bad input, ownership checks, invalid state transitions, conflicts); calls the matching repository for all DB access; owns transaction orchestration where needed
- `src/repositories/*Repository.js` → the only layer that runs SQL (no ORM/query builder). Functions that participate in a transaction take a `db` param (a `pool.connect()` client between `BEGIN`/`COMMIT`) instead of importing `pool` directly, so the same query function works inside or outside a transaction. The `auth`/`usuarios` resource's repository is `usuarioRepository.js` (there's no "auth" table).
- `src/utils/manejarError.js` → shared controller error translator: `AppError` → `{ error: message, ...extra }` with its own status, anything else → logged + generic 500. `AppError`'s third constructor arg (`extra`) is for the rare case a client needs a structured field alongside the message (e.g. `arbitroService.eliminarArbitro` throws `{ tieneHistorial: true }` when blocking a delete that would lose history; `designacionService.crearDesignacion` throws `{ conflicto }` with the clashing designación on a schedule-overlap 409).
- `src/middlewares/auth.js` → `verificarToken` (JWT from `Authorization: Bearer`) and `permitirRoles(...roles)` for RBAC
- `src/middlewares/upload.js` → Multer disk storage for liquidación receipt images (`uploads/liquidaciones/`, 8MB limit, image-only filter)
- `src/utils/validaciones.js` → shared validators (Ecuadorian cédula checksum, email, phone, name charset, positive/non-negative money) — reused by hand in services rather than a schema-validation library, despite `express-validator` being a dependency
- `src/utils/correo.js` → Resend HTTP API wrapper for password-reset emails

Every resource follows this controller → service → repository split (there is no legacy pool.query-in-controller code left).

**Route ordering matters**: static sub-paths like `/me` and `/candidatos` must be declared before `/:id` in a router, or Express will try to match them as an `:id` param (see `arbitroRoutes.js`).

**Auth model**: JWT payload is `{ id, rol, email }`; `req.usuario` carries it after `verificarToken`. Three roles: `administrador`, `directivo`, `arbitro`. Route-level `permitirRoles(...)` is the only authorization mechanism — there's no ownership-based ACL beyond what services check manually (e.g. `liquidacionService.responderLiquidacion` verifies the `arbitro` owns the `liquidacion` before allowing a response).

**Multi-step writes use explicit transactions**: anywhere a service performs multiple related inserts/updates (e.g. `liquidacionService.generarParaUnArbitro`, `arbitroService.eliminarArbitro`'s cascading delete), it takes a dedicated client from `pool.connect()`, wraps the work in `BEGIN`/`COMMIT`, and `ROLLBACK`s on any failure or business-rule violation, passing that `client` into the repository functions it calls — follow this pattern for new multi-table writes instead of firing independent `pool.query` calls.

### Database
PostgreSQL with enum types for all status/category fields (`rol_usuario`, `nivel_arbitro`, `estado_designacion`, `estado_liquidacion`, etc. — see `database/schema.sql`). Core entity relationships:
- `usuarios` (login/RBAC) 1:1 `arbitros` (extended referee profile) when `rol = 'arbitro'`
- `arbitros` 1:N `disponibilidad` (per-date availability)
- `campeonatos` 1:N `tarifas` (pay rate matrix by categoría/intensidad/rol_arbitro) and 1:N `encuentros` (matches)
- `encuentros` N:M `arbitros` through `designaciones` (one row per referee-role assignment on a match)
- `liquidaciones` (a payment settlement for one referee over a date range) aggregates unpaid `designaciones` (via `detalle_liquidacion`) and pending `adelantos`, computing `monto_neto = monto_bruto - total_adelantos`

`database/schema.sql` is the original baseline and is **not** updated after the fact — schema drift since then lives in standalone `database/migracion_*.sql` files (bloqueo/recuperación de cuenta, cantidad de canchas por campeonato, simplificación de niveles de árbitro). When reasoning about the current schema, or in doubt about a column's existence, check schema.sql *and* every migration file, not just the base schema.

### Frontend structure
- `frontend/App.jsx` is the actual app entry (not `src/App.jsx`) — routes are declared here with `react-router-dom` v7, wrapped in `AuthProvider` and a `RutaProtegida` guard that takes an optional `rolesPermitidos` array per route
- `src/context/AuthContext.jsx` — holds the logged-in user and JWT in state + `localStorage` (`rv16_token`, `rv16_usuario`); `login`/`logout` are the only mutations
- `src/api/client.js` — shared Axios instance; request interceptor attaches the bearer token, response interceptor force-logs-out on a 401 *except* for the public auth endpoints (login/olvide-password/restablecer-password), where a 401 is a normal "wrong credentials" response that must stay on-page
- `src/pages/*.jsx` — one page per route/resource, matching the backend resource split
- Styling via Tailwind v4 (`@tailwindcss/vite` plugin); linting via Oxlint (`.oxlintrc.json`), not ESLint
