-- =====================================================================
-- MIGRACIÓN: cantidad de canchas por campeonato
-- Las canchas no se registran una por una: se genera automáticamente
-- "Cancha 1"..."Cancha N" según este número.
-- =====================================================================

ALTER TABLE campeonatos ADD COLUMN cantidad_canchas INTEGER NOT NULL DEFAULT 1;
