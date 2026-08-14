const pool = require('../config/db');

async function existeDuplicado(fecha, hora, cancha, excluirId = null) {
  const resultado = excluirId
    ? await pool.query(
        'SELECT id FROM encuentros WHERE fecha = $1 AND hora = $2 AND cancha = $3 AND id != $4',
        [fecha, hora, cancha, excluirId]
      )
    : await pool.query(
        'SELECT id FROM encuentros WHERE fecha = $1 AND hora = $2 AND cancha = $3',
        [fecha, hora, cancha]
      );
  return resultado.rows.length > 0;
}

async function crear(datos) {
  const { campeonatoId, categoria, intensidad, fecha, hora, cancha, modo } = datos;
  const resultado = await pool.query(
    `INSERT INTO encuentros (campeonato_id, categoria, intensidad, fecha, hora, cancha, modo_designacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [campeonatoId, categoria, intensidad, fecha, hora, cancha, modo]
  );
  return resultado.rows[0];
}

async function listarTodos() {
  const resultado = await pool.query('SELECT * FROM encuentros ORDER BY fecha_creacion DESC');
  return resultado.rows;
}

async function listarPorEstado(estado) {
  const resultado = await pool.query(
    'SELECT * FROM encuentros WHERE estado = $1 ORDER BY fecha_creacion DESC',
    [estado]
  );
  return resultado.rows;
}

async function obtenerPorId(id) {
  const resultado = await pool.query('SELECT * FROM encuentros WHERE id = $1', [id]);
  return resultado.rows[0] || null;
}

async function obtenerDesignacionesDe(id) {
  const resultado = await pool.query(`
    SELECT d.id, d.rol_designacion, d.estado, u.nombres, u.apellidos
    FROM designaciones d
    JOIN arbitros a ON a.id = d.arbitro_id
    JOIN usuarios u ON u.id = a.usuario_id
    WHERE d.encuentro_id = $1
  `, [id]);
  return resultado.rows;
}

// Vista tipo "cartelera": todos los encuentros de una fecha, agrupados por
// campeonato/cancha, con el nombre del árbitro ya designado en cada uno.
async function listarConDesignaciones(fecha) {
  const params = [];
  let filtroFecha = '';
  if (fecha) {
    params.push(fecha);
    filtroFecha = `WHERE e.fecha = $1`;
  }

  const resultado = await pool.query(`
    SELECT
      e.id, e.fecha, e.hora, e.cancha, e.categoria, e.intensidad, e.estado, e.modo_designacion,
      c.id AS campeonato_id, c.nombre AS campeonato_nombre,
      COALESCE(
        json_agg(
          json_build_object(
            'designacion_id', d.id,
            'arbitro_id', d.arbitro_id,
            'rol', d.rol_designacion,
            'nombre', u.nombres || ' ' || u.apellidos,
            'estado', d.estado
          )
        ) FILTER (WHERE d.id IS NOT NULL),
        '[]'
      ) AS designados
    FROM encuentros e
    JOIN campeonatos c ON c.id = e.campeonato_id
    LEFT JOIN designaciones d ON d.encuentro_id = e.id
    LEFT JOIN arbitros a ON a.id = d.arbitro_id
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ${filtroFecha}
    GROUP BY e.id, c.id, c.nombre
    ORDER BY c.nombre, e.fecha, e.hora
  `, params);
  return resultado.rows;
}

async function actualizar(id, datos) {
  const { categoria, intensidad, fecha, hora, cancha } = datos;
  const resultado = await pool.query(
    `UPDATE encuentros
     SET categoria = $1, intensidad = $2, fecha = $3, hora = $4, cancha = $5
     WHERE id = $6 RETURNING *`,
    [categoria, intensidad, fecha, hora, cancha, id]
  );
  return resultado.rows[0] || null;
}

async function tieneDesignaciones(id) {
  const resultado = await pool.query('SELECT id FROM designaciones WHERE encuentro_id = $1 LIMIT 1', [id]);
  return resultado.rows.length > 0;
}

async function eliminar(id) {
  const resultado = await pool.query('DELETE FROM encuentros WHERE id = $1 RETURNING id', [id]);
  return resultado.rows[0] || null;
}

module.exports = {
  existeDuplicado,
  crear,
  listarTodos,
  listarPorEstado,
  obtenerPorId,
  obtenerDesignacionesDe,
  listarConDesignaciones,
  actualizar,
  tieneDesignaciones,
  eliminar,
};
