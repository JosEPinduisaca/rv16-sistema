const pool = require('../config/db');

async function buscarArbitroPorId(arbitroId) {
  const resultado = await pool.query('SELECT id FROM arbitros WHERE id = $1', [arbitroId]);
  return resultado.rows[0] || null;
}

async function crear(arbitroId, monto, estado) {
  const resultado = await pool.query(
    `INSERT INTO adelantos (arbitro_id, monto, estado) VALUES ($1, $2, $3) RETURNING *`,
    [arbitroId, monto, estado]
  );
  return resultado.rows[0];
}

async function actualizarEstadoPendiente(id, estado) {
  const resultado = await pool.query(
    `UPDATE adelantos SET estado = $1 WHERE id = $2 AND estado = 'pendiente' RETURNING *`,
    [estado, id]
  );
  return resultado.rows[0] || null;
}

async function listarPorArbitro(arbitroId) {
  const resultado = await pool.query(
    `SELECT * FROM adelantos WHERE arbitro_id = $1 ORDER BY fecha_solicitud DESC`,
    [arbitroId]
  );
  return resultado.rows;
}

async function listarTodos() {
  const resultado = await pool.query(`
    SELECT a.*, u.nombres, u.apellidos
    FROM adelantos a
    JOIN arbitros ar ON ar.id = a.arbitro_id
    JOIN usuarios u ON u.id = ar.usuario_id
    ORDER BY
      (a.estado = 'pendiente') DESC,
      a.fecha_solicitud ASC
  `);
  return resultado.rows;
}

module.exports = { buscarArbitroPorId, crear, actualizarEstadoPendiente, listarPorArbitro, listarTodos };
