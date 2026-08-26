-- =====================================================================
-- DATOS DE PRUEBA: CRONOGRAMA ESTILO CARTELERA
-- Requiere haber corrido antes "datos-prueba.sql" (necesita los 5 árbitros
-- de ese script: carlos.andrade, monica.salazar, diego.chavez,
-- andrea.torres, fernando.yepez @rv16.com)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CREAR LOS "TORNEOS" (cada uno funciona como una cancha/liga distinta)
-- ---------------------------------------------------------------------
INSERT INTO campeonatos (nombre, liga, fecha_inicio, fecha_fin) VALUES
  ('Corazón de Jesús', 'Liga Barrial Sangolquí', '2026-07-01', '2026-09-30'),
  ('Pintag',            'Liga Parroquial Pintag', '2026-07-01', '2026-09-30'),
  ('Santa Isabel 1',    'Liga Santa Isabel',      '2026-07-01', '2026-09-30'),
  ('Santa Isabel 2',    'Liga Santa Isabel',      '2026-07-01', '2026-09-30'),
  ('Uyumbicho',         'Liga Uyumbicho',         '2026-07-01', '2026-09-30'),
  ('Yanahuaico',        'Liga Yanahuaico',        '2026-07-01', '2026-09-30'),
  ('Torneo Bravo',      'Liga Bravo',             '2026-07-01', '2026-09-30');

-- ---------------------------------------------------------------------
-- 2. TARIFA BÁSICA PARA CADA TORNEO (necesaria para poder designar)
-- ---------------------------------------------------------------------
INSERT INTO tarifas (campeonato_id, categoria, intensidad, rol_arbitro, monto)
SELECT c.id, 'senior', 'media', r.rol, 20.00
FROM campeonatos c
CROSS JOIN (VALUES ('central'::rol_designacion), ('linea'::rol_designacion)) AS r(rol)
WHERE c.nombre IN ('Corazón de Jesús','Pintag','Santa Isabel 1','Santa Isabel 2','Uyumbicho','Yanahuaico','Torneo Bravo');

-- ---------------------------------------------------------------------
-- 3. ENCUENTROS DEL DÍA (domingo 12 de julio de 2026), uno por horario
-- ---------------------------------------------------------------------
INSERT INTO encuentros (campeonato_id, categoria, intensidad, fecha, hora, cancha)
SELECT c.id, 'senior', 'media', '2026-07-12', v.hora, v.cancha
FROM campeonatos c
JOIN (VALUES
  ('Corazón de Jesús', '08:00'::time, 'Cancha Corazón de Jesús'),
  ('Corazón de Jesús', '09:30'::time, 'Cancha Corazón de Jesús'),
  ('Corazón de Jesús', '11:00'::time, 'Cancha Corazón de Jesús'),
  ('Corazón de Jesús', '12:30'::time, 'Cancha Corazón de Jesús'),
  ('Corazón de Jesús', '14:00'::time, 'Cancha Corazón de Jesús'),
  ('Corazón de Jesús', '15:30'::time, 'Cancha Corazón de Jesús'),
  ('Pintag',           '08:00'::time, 'Cancha Pintag'),
  ('Pintag',           '14:00'::time, 'Cancha Pintag'),
  ('Pintag',           '16:00'::time, 'Cancha Pintag'),
  ('Santa Isabel 1',   '09:00'::time, 'Cancha Santa Isabel 1'),
  ('Santa Isabel 1',   '10:30'::time, 'Cancha Santa Isabel 1'),
  ('Santa Isabel 1',   '12:00'::time, 'Cancha Santa Isabel 1'),
  ('Santa Isabel 2',   '09:00'::time, 'Cancha Santa Isabel 2'),
  ('Santa Isabel 2',   '10:30'::time, 'Cancha Santa Isabel 2'),
  ('Santa Isabel 2',   '12:00'::time, 'Cancha Santa Isabel 2'),
  ('Uyumbicho',        '08:45'::time, 'Cancha Uyumbicho'),
  ('Uyumbicho',        '10:45'::time, 'Cancha Uyumbicho'),
  ('Uyumbicho',        '12:45'::time, 'Cancha Uyumbicho'),
  ('Uyumbicho',        '14:45'::time, 'Cancha Uyumbicho'),
  ('Yanahuaico',       '08:00'::time, 'Cancha Yanahuaico'),
  ('Yanahuaico',       '10:00'::time, 'Cancha Yanahuaico'),
  ('Yanahuaico',       '12:00'::time, 'Cancha Yanahuaico'),
  ('Yanahuaico',       '14:00'::time, 'Cancha Yanahuaico'),
  ('Yanahuaico',       '16:00'::time, 'Cancha Yanahuaico'),
  ('Torneo Bravo',     '11:00'::time, 'Cancha Torneo Bravo'),
  ('Torneo Bravo',     '12:10'::time, 'Cancha Torneo Bravo'),
  ('Torneo Bravo',     '13:20'::time, 'Cancha Torneo Bravo'),
  ('Torneo Bravo',     '14:30'::time, 'Cancha Torneo Bravo'),
  ('Torneo Bravo',     '15:40'::time, 'Cancha Torneo Bravo'),
  ('Torneo Bravo',     '16:50'::time, 'Cancha Torneo Bravo')
) AS v(nombre_torneo, hora, cancha) ON v.nombre_torneo = c.nombre
WHERE c.nombre IN ('Corazón de Jesús','Pintag','Santa Isabel 1','Santa Isabel 2','Uyumbicho','Yanahuaico','Torneo Bravo');

-- ---------------------------------------------------------------------
-- 4. DESIGNAR ÁRBITROS (reparte los 5 árbitros de "datos-prueba.sql"
--    de forma rotativa entre todos los partidos del día, como en la imagen)
-- ---------------------------------------------------------------------
WITH lista_arbitros AS (
  SELECT a.id AS arbitro_id, ROW_NUMBER() OVER (ORDER BY a.id) AS orden
  FROM arbitros a
  JOIN usuarios u ON u.id = a.usuario_id
  WHERE u.email IN (
    'carlos.andrade@rv16.com', 'monica.salazar@rv16.com', 'diego.chavez@rv16.com',
    'andrea.torres@rv16.com', 'fernando.yepez@rv16.com'
  )
),
partidos_torneo AS (
  SELECT e.id AS encuentro_id, ROW_NUMBER() OVER (ORDER BY e.fecha, e.cancha, e.hora) AS orden
  FROM encuentros e
  JOIN campeonatos c ON c.id = e.campeonato_id
  WHERE c.nombre IN ('Corazón de Jesús','Pintag','Santa Isabel 1','Santa Isabel 2','Uyumbicho','Yanahuaico','Torneo Bravo')
    AND e.fecha = '2026-07-12'
)
INSERT INTO designaciones (encuentro_id, arbitro_id, rol_designacion, estado)
SELECT p.encuentro_id, la.arbitro_id, 'central', 'publicada'
FROM partidos_torneo p
JOIN lista_arbitros la
  ON la.orden = ((p.orden - 1) % (SELECT count(*) FROM lista_arbitros)) + 1;

-- Actualiza el estado de esos encuentros a "publicado"
UPDATE encuentros SET estado = 'publicado'
WHERE id IN (
  SELECT e.id FROM encuentros e
  JOIN campeonatos c ON c.id = e.campeonato_id
  WHERE c.nombre IN ('Corazón de Jesús','Pintag','Santa Isabel 1','Santa Isabel 2','Uyumbicho','Yanahuaico','Torneo Bravo')
    AND e.fecha = '2026-07-12'
);
