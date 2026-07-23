-- =====================================================================
-- SISTEMA DE GESTION DE CONTROL DE DESIGNACIONES Y PAGOS - RV16
-- Base de datos: PostgreSQL
-- =====================================================================

-- Ejecutar primero: CREATE DATABASE rv16_sistema;
-- Luego conectarse a esa base y correr todo este archivo.

-- ---------------------------------------------------------------------
-- TIPOS ENUMERADOS
-- ---------------------------------------------------------------------
CREATE TYPE rol_usuario AS ENUM ('administrador', 'directivo', 'arbitro');
CREATE TYPE nivel_arbitro AS ENUM ('formacion', 'con_experiencia', 'nivel_a', 'nivel_b', 'nivel_c');
CREATE TYPE categoria_partido AS ENUM ('senior', 'femenino', 'ninos', 'categoria_a', 'categoria_b', 'master');
CREATE TYPE intensidad_partido AS ENUM ('alta', 'media', 'baja');
CREATE TYPE estado_encuentro AS ENUM ('programado', 'designado', 'publicado', 'jugado', 'cancelado');
CREATE TYPE rol_designacion AS ENUM ('central', 'linea');
CREATE TYPE estado_designacion AS ENUM ('propuesta', 'confirmada', 'publicada');
CREATE TYPE estado_adelanto AS ENUM ('pendiente', 'aprobado', 'descontado', 'rechazado');
CREATE TYPE periodo_liquidacion AS ENUM ('quincenal', 'mensual');
CREATE TYPE estado_liquidacion AS ENUM ('generada', 'aceptada', 'observada', 'pagada');

-- ---------------------------------------------------------------------
-- USUARIOS (login y control de acceso)
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    cedula          VARCHAR(10) UNIQUE NOT NULL,
    nombres         VARCHAR(100) NOT NULL,
    apellidos       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    telefono        VARCHAR(15),
    rol             rol_usuario NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- ARBITROS (perfil extendido, 1 a 1 con usuarios de rol 'arbitro')
-- ---------------------------------------------------------------------
CREATE TABLE arbitros (
    id                  SERIAL PRIMARY KEY,
    usuario_id          INTEGER UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nivel               nivel_arbitro NOT NULL DEFAULT 'formacion',
    fecha_ingreso        DATE NOT NULL DEFAULT CURRENT_DATE,
    penalizacion_activa  BOOLEAN NOT NULL DEFAULT FALSE,
    observaciones        TEXT,
    reglamento_aceptado  BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_aceptacion_reglamento TIMESTAMP
);

-- ---------------------------------------------------------------------
-- DISPONIBILIDAD SEMANAL DEL ARBITRO
-- ---------------------------------------------------------------------
CREATE TABLE disponibilidad (
    id           SERIAL PRIMARY KEY,
    arbitro_id   INTEGER NOT NULL REFERENCES arbitros(id) ON DELETE CASCADE,
    fecha        DATE NOT NULL,
    disponible   BOOLEAN NOT NULL DEFAULT TRUE,
    comentario   VARCHAR(255),
    UNIQUE (arbitro_id, fecha)
);

-- ---------------------------------------------------------------------
-- CAMPEONATOS (contrato con la liga contratante)
-- ---------------------------------------------------------------------
CREATE TABLE campeonatos (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    liga            VARCHAR(150) NOT NULL,
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE,
    activo          BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------
-- TARIFAS (tabla paramétrica de pagos por campeonato/categoria/rol)
-- ---------------------------------------------------------------------
CREATE TABLE tarifas (
    id              SERIAL PRIMARY KEY,
    campeonato_id   INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
    categoria       categoria_partido NOT NULL,
    intensidad      intensidad_partido NOT NULL,
    rol_arbitro     rol_designacion NOT NULL,
    monto           NUMERIC(8,2) NOT NULL,
    viatico         NUMERIC(8,2) NOT NULL DEFAULT 0,
    vigente         BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (campeonato_id, categoria, intensidad, rol_arbitro)
);

-- ---------------------------------------------------------------------
-- ENCUENTROS (partidos programados)
-- ---------------------------------------------------------------------
CREATE TABLE encuentros (
    id              SERIAL PRIMARY KEY,
    campeonato_id   INTEGER NOT NULL REFERENCES campeonatos(id),
    categoria       categoria_partido NOT NULL,
    intensidad      intensidad_partido NOT NULL,
    fecha           DATE NOT NULL,
    hora            TIME NOT NULL,
    cancha          VARCHAR(100) NOT NULL,
    estado          estado_encuentro NOT NULL DEFAULT 'programado',
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- DESIGNACIONES (tabla intermedia N:M entre arbitros y encuentros)
-- ---------------------------------------------------------------------
CREATE TABLE designaciones (
    id              SERIAL PRIMARY KEY,
    encuentro_id    INTEGER NOT NULL REFERENCES encuentros(id) ON DELETE CASCADE,
    arbitro_id      INTEGER NOT NULL REFERENCES arbitros(id),
    rol_designacion rol_designacion NOT NULL,
    estado          estado_designacion NOT NULL DEFAULT 'propuesta',
    fecha_publicacion TIMESTAMP,
    UNIQUE (encuentro_id, arbitro_id),
    UNIQUE (encuentro_id, rol_designacion, arbitro_id)
);

-- Evita que un mismo arbitro quede en dos encuentros que se cruzan de horario
-- (se valida en el backend con una consulta antes de insertar, ver Fase 2)

-- ---------------------------------------------------------------------
-- ADELANTOS (solicitudes de anticipo de dinero)
-- ---------------------------------------------------------------------
CREATE TABLE adelantos (
    id              SERIAL PRIMARY KEY,
    arbitro_id      INTEGER NOT NULL REFERENCES arbitros(id) ON DELETE CASCADE,
    monto           NUMERIC(8,2) NOT NULL,
    fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
    estado          estado_adelanto NOT NULL DEFAULT 'pendiente',
    liquidacion_id  INTEGER -- se asigna cuando se descuenta en una liquidacion (FK se agrega abajo)
);

-- ---------------------------------------------------------------------
-- LIQUIDACIONES (cierre de pago quincenal/mensual por arbitro)
-- ---------------------------------------------------------------------
CREATE TABLE liquidaciones (
    id                  SERIAL PRIMARY KEY,
    arbitro_id          INTEGER NOT NULL REFERENCES arbitros(id) ON DELETE CASCADE,
    periodo             periodo_liquidacion NOT NULL,
    fecha_inicio        DATE NOT NULL,
    fecha_fin           DATE NOT NULL,
    monto_bruto         NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_adelantos      NUMERIC(10,2) NOT NULL DEFAULT 0,
    monto_neto          NUMERIC(10,2) NOT NULL DEFAULT 0,
    estado              estado_liquidacion NOT NULL DEFAULT 'generada',
    novedad_reportada    TEXT,
    fecha_generacion     TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_pago           TIMESTAMP
);

ALTER TABLE adelantos
    ADD CONSTRAINT fk_adelanto_liquidacion
    FOREIGN KEY (liquidacion_id) REFERENCES liquidaciones(id);

-- ---------------------------------------------------------------------
-- DETALLE_LIQUIDACION (relaciona cada designacion pagada con su liquidacion)
-- ---------------------------------------------------------------------
CREATE TABLE detalle_liquidacion (
    id               SERIAL PRIMARY KEY,
    liquidacion_id   INTEGER NOT NULL REFERENCES liquidaciones(id) ON DELETE CASCADE,
    designacion_id   INTEGER NOT NULL REFERENCES designaciones(id),
    monto            NUMERIC(8,2) NOT NULL
);

-- ---------------------------------------------------------------------
-- INDICES para acelerar las consultas mas frecuentes
-- ---------------------------------------------------------------------
CREATE INDEX idx_disponibilidad_arbitro_fecha ON disponibilidad(arbitro_id, fecha);
CREATE INDEX idx_encuentros_fecha ON encuentros(fecha);
CREATE INDEX idx_designaciones_encuentro ON designaciones(encuentro_id);
CREATE INDEX idx_designaciones_arbitro ON designaciones(arbitro_id);
CREATE INDEX idx_liquidaciones_arbitro ON liquidaciones(arbitro_id);
