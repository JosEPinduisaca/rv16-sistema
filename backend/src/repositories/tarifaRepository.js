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

async function upsert(campeonatoId, categoria, rolArbitro, monto, viatico) {
  const resultado = await pool.query(
    `INSERT INTO tarifas (campeonato_id, categoria, rol_arbitro, monto, viatico)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (campeonato_id, categoria, rol_arbitro)
     DO UPDATE SET monto = $4, viatico = $5, vigente = TRUE
     RETURNING *`,
    [campeonatoId, categoria, rolArbitro, monto, viatico]
  );
  return resultado.rows[0];
}

async function listar(campeonatoId) {
  const resultado = campeonatoId
    ? await pool.query('SELECT * FROM tarifas WHERE campeonato_id = $1 AND vigente = TRUE', [campeonatoId])
    : await pool.query('SELECT * FROM tarifas WHERE vigente = TRUE');
  return resultado.rows;
}

// `viatico` en null significa "no lo mandaron": se conserva el valor
// existente en vez de resetearlo a 0.
async function actualizar(id, monto, viatico) {
  const resultado = await pool.query(
    `UPDATE tarifas SET monto = $1, viatico = COALESCE($2, viatico) WHERE id = $3 RETURNING *`,
    [monto, viatico, id]
  );
  return resultado.rows[0] || null;
}

async function eliminar(id) {
  const resultado = await pool.query('DELETE FROM tarifas WHERE id = $1 RETURNING id', [id]);
  return resultado.rows[0] || null;
}

module.exports = { listarCategoriasVigentes, buscarCentralVigente, upsert, listar, actualizar, eliminar };
