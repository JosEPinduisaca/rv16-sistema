-- =====================================================================
-- DATOS DE PRUEBA - RV16
-- Contraseña de TODOS los árbitros de este script: arbitro123
-- (el hash de abajo corresponde a esa contraseña, generado con bcrypt)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ÁRBITROS NUEVOS (usuario + perfil de árbitro en un solo paso)
-- ---------------------------------------------------------------------
WITH datos_arbitros AS (
  SELECT * FROM (VALUES
    ('1710000001', 'Carlos',   'Andrade', 'carlos.andrade@rv16.com',  '0991000001', 'formacion'::nivel_arbitro),
    ('1710000002', 'Mónica',   'Salazar', 'monica.salazar@rv16.com',  '0991000002', 'con_experiencia'::nivel_arbitro),
    ('1710000003', 'Diego',    'Chávez',  'diego.chavez@rv16.com',    '0991000003', 'con_experiencia'::nivel_arbitro),
    ('1710000004', 'Andrea',   'Torres',  'andrea.torres@rv16.com',   '0991000004', 'nuevo'::nivel_arbitro),
    ('1710000005', 'Fernando', 'Yépez',   'fernando.yepez@rv16.com',  '0991000005', 'nuevo'::nivel_arbitro)
  ) AS t(cedula, nombres, apellidos, email, telefono, nivel)
),
nuevos_usuarios AS (
  INSERT INTO usuarios (cedula, nombres, apellidos, email, password_hash, telefono, rol)
  SELECT cedula, nombres, apellidos, email,
         '$2b$10$BpBF1nEdb/k545tHHwFUQuwdZekjJUr0BysiCkTd3sn2BQY8HlgNi', -- arbitro123
         telefono, 'arbitro'
  FROM datos_arbitros
  RETURNING id, email
),
nuevos_arbitros AS (
  INSERT INTO arbitros (usuario_id, nivel)
  SELECT nu.id, d.nivel
  FROM nuevos_usuarios nu
  JOIN datos_arbitros d ON d.email = nu.email
  RETURNING id
)
SELECT
  (SELECT count(*) FROM nuevos_usuarios) AS arbitros_creados;


-- ---------------------------------------------------------------------
-- 2. CAMPEONATO DE PRUEBA + TARIFAS + ENCUENTROS
-- ---------------------------------------------------------------------
WITH nuevo_campeonato AS (
  INSERT INTO campeonatos (nombre, liga, fecha_inicio, fecha_fin)
  VALUES ('Copa RV16 Verano 2026', 'Liga Deportiva Sangolquí', '2026-07-01', '2026-09-30')
  RETURNING id
),
nuevas_tarifas AS (
  INSERT INTO tarifas (campeonato_id, categoria, intensidad, rol_arbitro, monto, viatico)
  SELECT nc.id, t.categoria, t.intensidad, t.rol_arbitro, t.monto, t.viatico
  FROM nuevo_campeonato nc, (VALUES
    ('senior'::categoria_partido,   'alta'::intensidad_partido,  'central'::rol_designacion, 30.00, 5.00),
    ('senior'::categoria_partido,   'alta'::intensidad_partido,  'linea'::rol_designacion,   20.00, 5.00),
    ('senior'::categoria_partido,   'media'::intensidad_partido, 'central'::rol_designacion, 25.00, 5.00),
    ('senior'::categoria_partido,   'media'::intensidad_partido, 'linea'::rol_designacion,   15.00, 5.00),
    ('femenino'::categoria_partido, 'media'::intensidad_partido, 'central'::rol_designacion, 22.00, 5.00),
    ('femenino'::categoria_partido, 'media'::intensidad_partido, 'linea'::rol_designacion,   14.00, 5.00),
    ('senior'::categoria_partido,   'baja'::intensidad_partido,  'central'::rol_designacion, 18.00, 3.00),
    ('senior'::categoria_partido,   'baja'::intensidad_partido,  'linea'::rol_designacion,   12.00, 3.00)
  ) AS t(categoria, intensidad, rol_arbitro, monto, viatico)
  RETURNING id
),
nuevos_encuentros AS (
  INSERT INTO encuentros (campeonato_id, categoria, intensidad, fecha, hora, cancha)
  SELECT nc.id, e.categoria, e.intensidad, e.fecha, e.hora, e.cancha
  FROM nuevo_campeonato nc, (VALUES
    ('senior'::categoria_partido,   'alta'::intensidad_partido,  '2026-07-12'::date, '10:00'::time, 'Cancha 1'),
    ('senior'::categoria_partido,   'media'::intensidad_partido, '2026-07-12'::date, '12:00'::time, 'Cancha 2'),
    ('femenino'::categoria_partido, 'media'::intensidad_partido, '2026-07-12'::date, '14:00'::time, 'Cancha 1'),
    ('senior'::categoria_partido,   'alta'::intensidad_partido,  '2026-07-19'::date, '09:00'::time, 'Cancha 3'),
    ('senior'::categoria_partido,   'media'::intensidad_partido, '2026-07-19'::date, '11:00'::time, 'Cancha 1'),
    ('femenino'::categoria_partido, 'media'::intensidad_partido, '2026-07-19'::date, '13:00'::time, 'Cancha 2'),
    ('senior'::categoria_partido,   'baja'::intensidad_partido,  '2026-07-26'::date, '15:00'::time, 'Cancha 1'),
    ('senior'::categoria_partido,   'alta'::intensidad_partido,  '2026-07-26'::date, '17:00'::time, 'Cancha 2')
  ) AS e(categoria, intensidad, fecha, hora, cancha)
  RETURNING id
)
SELECT
  (SELECT count(*) FROM nuevo_campeonato)  AS campeonatos_creados,
  (SELECT count(*) FROM nuevas_tarifas)    AS tarifas_creadas,
  (SELECT count(*) FROM nuevos_encuentros) AS encuentros_creados;
