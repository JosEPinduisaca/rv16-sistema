const pool = require('../config/db');
const { esMontoPositivo, esMontoNoNegativo } = require('../utils/validaciones');

// POST /api/tarifas
// La tarifa depende solo de campeonato + categoría + rol (central o asistente).
// La intensidad del partido NO afecta el pago, solo se usa para recomendar
// candidatos al momento de designar.
async function crearTarifa(req, res) {
  const { campeonato_id, categoria, rol_arbitro, monto, viatico } = req.body;

  if (!campeonato_id || !categoria || !rol_arbitro || monto === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (!esMontoPositivo(monto)) {
    return res.status(400).json({ error: 'El monto debe ser un número mayor a cero' });
  }
  if (viatico !== undefined && !esMontoNoNegativo(viatico)) {
    return res.status(400).json({ error: 'El viático no puede ser negativo' });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO tarifas (campeonato_id, categoria, rol_arbitro, monto, viatico)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (campeonato_id, categoria, rol_arbitro)
       DO UPDATE SET monto = $4, viatico = $5, vigente = TRUE
       RETURNING *`,
      [campeonato_id, categoria, rol_arbitro, monto, viatico || 0]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la tarifa' });
  }
}

// GET /api/tarifas?campeonato_id=1
async function listarTarifas(req, res) {
  const { campeonato_id } = req.query;
  try {
    const resultado = campeonato_id
      ? await pool.query('SELECT * FROM tarifas WHERE campeonato_id = $1 AND vigente = TRUE', [campeonato_id])
      : await pool.query('SELECT * FROM tarifas WHERE vigente = TRUE');
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar tarifas' });
  }
}

// PUT /api/tarifas/:id
async function actualizarTarifa(req, res) {
  const { id } = req.params;
  const { categoria, rol_arbitro, monto, viatico } = req.body;

  if (!categoria || !rol_arbitro || monto === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (!esMontoPositivo(monto)) {
    return res.status(400).json({ error: 'El monto debe ser un número mayor a cero' });
  }
  if (viatico !== undefined && !esMontoNoNegativo(viatico)) {
    return res.status(400).json({ error: 'El viático no puede ser negativo' });
  }

  try {
    const resultado = await pool.query(
      `UPDATE tarifas SET categoria = $1, rol_arbitro = $2, monto = $3, viatico = $4
       WHERE id = $5 RETURNING *`,
      [categoria, rol_arbitro, monto, viatico || 0, id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Tarifa no encontrada' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la tarifa' });
  }
}

// DELETE /api/tarifas/:id
async function eliminarTarifa(req, res) {
  const { id } = req.params;
  try {
    const resultado = await pool.query('DELETE FROM tarifas WHERE id = $1 RETURNING id', [id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Tarifa no encontrada' });
    }
    res.json({ mensaje: 'Tarifa eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la tarifa' });
  }
}

module.exports = { crearTarifa, listarTarifas, actualizarTarifa, eliminarTarifa };
