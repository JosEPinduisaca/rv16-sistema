const pool = require('../config/db');

async function listarCategoriasVigentes(campeonatoId) {
  const resultado = await pool.query(
    `SELECT DISTINCT categoria FROM tarifas WHERE campeonato_id = $1 AND vigente = TRUE`,
    [campeonatoId]
  );
  return resultado.rows;
}

async function buscarCentralVigente(campeonatoId, categoria) {
  const resultado = await pool.query(
    `SELECT id FROM tarifas WHERE campeonato_id = $1 AND categoria = $2 AND rol_arbitro = 'central' AND vigente = TRUE`,
    [campeonatoId, categoria]
  );
  return resultado.rows[0] || null;
}

async function upsert(campeonatoId, categoria, rolArbitro, monto) {
  const resultado = await pool.query(
    `INSERT INTO tarifas (campeonato_id, categoria, rol_arbitro, monto)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (campeonato_id, categoria, rol_arbitro)
     DO UPDATE SET monto = $4, vigente = TRUE
     RETURNING *`,
    [campeonatoId, categoria, rolArbitro, monto]
  );
  return resultado.rows[0];
}

async function listar(campeonatoId) {
  const resultado = campeonatoId
    ? await pool.query('SELECT * FROM tarifas WHERE campeonato_id = $1 AND vigente = TRUE', [campeonatoId])
    : await pool.query('SELECT * FROM tarifas WHERE vigente = TRUE');
  return resultado.rows;
}

async function actualizar(id, monto) {
  const resultado = await pool.query(
    `UPDATE tarifas SET monto = $1 WHERE id = $2 RETURNING *`,
    [monto, id]
  );
  return resultado.rows[0] || null;
}

async function eliminar(id) {
  const resultado = await pool.query('DELETE FROM tarifas WHERE id = $1 RETURNING id', [id]);
  return resultado.rows[0] || null;
}

// Compartida por designacionService (al validar/estimar el pago de una
// designación) y liquidacionService (al calcular el monto de cada detalle).
// Recibe `db` (pool o un client de transacción) para poder usarse en ambos casos.
async function buscarVigente(db, campeonatoId, categoria, rolArbitro) {
  const resultado = await db.query(
    `SELECT monto FROM tarifas
     WHERE campeonato_id = $1 AND categoria = $2 AND rol_arbitro = $3 AND vigente = TRUE`,
    [campeonatoId, categoria, rolArbitro]
  );
  return resultado.rows[0] || null;
}

module.exports = { listarCategoriasVigentes, buscarCentralVigente, upsert, listar, actualizar, eliminar, buscarVigente };
