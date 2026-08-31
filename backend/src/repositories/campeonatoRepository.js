const pool = require('../config/db');

async function crear({ nombre, liga, fechaInicio, fechaFin }) {
  const resultado = await pool.query(
    `INSERT INTO campeonatos (nombre, liga, fecha_inicio, fecha_fin)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [nombre, liga, fechaInicio, fechaFin]
  );
  return resultado.rows[0];
}

async function listar() {
  const resultado = await pool.query('SELECT * FROM campeonatos ORDER BY fecha_inicio DESC');
  return resultado.rows;
}

async function obtenerPorId(id) {
  const resultado = await pool.query('SELECT * FROM campeonatos WHERE id = $1', [id]);
  return resultado.rows[0] || null;
}

// La fecha de inicio no es editable una vez creado el campeonato (ver
// campeonatoService.actualizarCampeonato), así que no se toca aquí.
async function actualizar(id, { nombre, liga, fechaFin }) {
  const resultado = await pool.query(
    `UPDATE campeonatos SET nombre = $1, liga = $2, fecha_fin = $3
     WHERE id = $4 RETURNING *`,
    [nombre, liga, fechaFin, id]
  );
  return resultado.rows[0] || null;
}

async function tieneEncuentros(id) {
  const resultado = await pool.query('SELECT id FROM encuentros WHERE campeonato_id = $1 LIMIT 1', [id]);
  return resultado.rows.length > 0;
}

async function eliminar(id) {
  const resultado = await pool.query('DELETE FROM campeonatos WHERE id = $1 RETURNING id', [id]);
  return resultado.rows[0] || null;
}

module.exports = { crear, listar, obtenerPorId, actualizar, tieneEncuentros, eliminar };
