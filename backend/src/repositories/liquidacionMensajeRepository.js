const pool = require('../config/db');

async function listarPorLiquidacion(liquidacionId) {
  const resultado = await pool.query(
    `SELECT m.*, u.nombres, u.apellidos, u.rol AS autor_rol
     FROM liquidacion_mensajes m
     JOIN usuarios u ON u.id = m.autor_id
     WHERE m.liquidacion_id = $1
     ORDER BY m.fecha_creacion ASC`,
    [liquidacionId]
  );
  return resultado.rows;
}

async function crear(liquidacionId, autorId, mensaje, imagenUrl) {
  const resultado = await pool.query(
    `INSERT INTO liquidacion_mensajes (liquidacion_id, autor_id, mensaje, imagen_url)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [liquidacionId, autorId, mensaje, imagenUrl]
  );
  return resultado.rows[0];
}

async function obtenerConAutor(id) {
  const resultado = await pool.query(
    `SELECT m.*, u.nombres, u.apellidos, u.rol AS autor_rol
     FROM liquidacion_mensajes m JOIN usuarios u ON u.id = m.autor_id
     WHERE m.id = $1`,
    [id]
  );
  return resultado.rows[0] || null;
}

module.exports = { listarPorLiquidacion, crear, obtenerConAutor };
