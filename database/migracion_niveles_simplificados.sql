-- =====================================================================
-- MIGRACIÓN: Simplificar niveles de árbitro a solo 3 opciones
-- (formación, con experiencia, nuevo), migrando los datos existentes.
-- =====================================================================

-- 1. Crear el tipo nuevo con exactamente 3 valores
CREATE TYPE nivel_arbitro_nuevo AS ENUM ('formacion', 'con_experiencia', 'nuevo');

-- 2. Agregar una columna temporal con el tipo nuevo
ALTER TABLE arbitros ADD COLUMN nivel_temp nivel_arbitro_nuevo;

-- 3. Migrar los datos existentes con un mapeo razonable:
--    nivel_a y nivel_b (los más altos) -> con_experiencia
--    nivel_c (el más bajo)             -> nuevo
--    formacion y con_experiencia se mantienen igual
UPDATE arbitros SET nivel_temp = CASE
  WHEN nivel = 'con_experiencia' THEN 'con_experiencia'::nivel_arbitro_nuevo
  WHEN nivel = 'formacion'       THEN 'formacion'::nivel_arbitro_nuevo
  WHEN nivel = 'nivel_a'         THEN 'con_experiencia'::nivel_arbitro_nuevo
  WHEN nivel = 'nivel_b'         THEN 'con_experiencia'::nivel_arbitro_nuevo
  WHEN nivel = 'nivel_c'         THEN 'nuevo'::nivel_arbitro_nuevo
  ELSE 'nuevo'::nivel_arbitro_nuevo
END;

-- 4. Quitar la columna vieja y poner la nueva en su lugar
ALTER TABLE arbitros DROP COLUMN nivel;
ALTER TABLE arbitros RENAME COLUMN nivel_temp TO nivel;
ALTER TABLE arbitros ALTER COLUMN nivel SET DEFAULT 'formacion';
ALTER TABLE arbitros ALTER COLUMN nivel SET NOT NULL;

-- 5. Borrar el tipo enumerado viejo (ya no se usa) y renombrar el nuevo
DROP TYPE nivel_arbitro;
ALTER TYPE nivel_arbitro_nuevo RENAME TO nivel_arbitro;
