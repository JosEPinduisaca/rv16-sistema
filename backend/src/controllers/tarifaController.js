const pool = require('../config/db');
const { esMontoPositivo, esMontoNoNegativo, categoriaValida } = require('../utils/validaciones');

// POST /api/tarifas
// La tarifa depende solo de campeonato + categoría + rol (central o asistente).
// La intensidad del partido NO afecta el pago, solo se usa para recomendar
// candidatos al momento de designar.
//
// Reglas de negocio para categorías libres:
// - Una categoría nueva SIEMPRE se crea primero con rol "central".
// - La tarifa de "asistente" es opcional y solo puede agregarse si ya
//   existe la tarifa "central" de esa misma categoría.
// - El nombre de categoría se compara sin distinguir mayúsculas/espacios
//   para evitar duplicados accidentales ("Senior" vs "senior").
async function crearTarifa(req, res) {
  const { campeonato_id, categoria: categoriaRaw, rol_arbitro, monto, viatico } = req.body;

  if (!campeonato_id || !categoriaRaw || !rol_arbitro || monto === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (!categoriaValida(categoriaRaw)) {
    return res.status(400).json({ error: 'La categoría debe tener entre 2 y 40 caracteres (letras y números)' });
  }
  if (!['central', 'asistente'].includes(rol_arbitro)) {
    return res.status(400).json({ error: 'Rol de árbitro inválido' });
  }
  if (!esMontoPositivo(monto)) {
    return res.status(400).json({ error: 'El monto debe ser un número mayor a cero' });
  }
  if (viatico !== undefined && !esMontoNoNegativo(viatico)) {
    return res.status(400).json({ error: 'El viático no puede ser negativo' });
  }

  const categoria = categoriaRaw.trim();

  try {
    // Busca si ya existe una categoría con el mismo nombre en este campeonato
    // (sin importar mayúsculas/espacios) para reutilizar el nombre exacto guardado.
    const existentes = await pool.query(
      `SELECT DISTINCT categoria FROM tarifas WHERE campeonato_id = $1 AND vigente = TRUE`,
      [campeonato_id]
    );
    const categoriaExistente = existentes.rows.find(
      (r) => r.categoria.toLowerCase() === categoria.toLowerCase()
    );

    if (rol_arbitro === 'central') {
      if (categoriaExistente) {
        return res.status(409).json({
          error: `La categoría "${categoriaExistente.categoria}" ya existe. Edita su monto desde la tabla.`,
        });
      }
    } else {
      // rol_arbitro === 'asistente': la tarifa central de esa categoría debe existir ya.
      if (!categoriaExistente) {
        return res.status(400).json({ error: 'Primero debes crear la tarifa de Central para esta categoría' });
      }
      const central = await pool.query(
        `SELECT id FROM tarifas WHERE campeonato_id = $1 AND categoria = $2 AND rol_arbitro = 'central' AND vigente = TRUE`,
        [campeonato_id, categoriaExistente.categoria]
      );
      if (central.rows.length === 0) {
        return res.status(400).json({ error: 'Primero debes crear la tarifa de Central para esta categoría' });
      }
    }

    const categoriaFinal = categoriaExistente ? categoriaExistente.categoria : categoria;

    const resultado = await pool.query(
      `INSERT INTO tarifas (campeonato_id, categoria, rol_arbitro, monto, viatico)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (campeonato_id, categoria, rol_arbitro)
       DO UPDATE SET monto = $4, viatico = $5, vigente = TRUE
       RETURNING *`,
      [campeonato_id, categoriaFinal, rol_arbitro, monto, viatico || 0]
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
// Solo el monto (y el viático) son editables. La categoría y el rol quedan
// fijos desde que se crea la tarifa: cambiarlos después podría dejar
// inconsistentes encuentros y designaciones ya hechos con esa combinación.
async function actualizarTarifa(req, res) {
  const { id } = req.params;
  const { monto, viatico } = req.body;

  if (monto === undefined) {
    return res.status(400).json({ error: 'Falta el monto' });
  }
  if (!esMontoPositivo(monto)) {
    return res.status(400).json({ error: 'El monto debe ser un número mayor a cero' });
  }
  if (viatico !== undefined && !esMontoNoNegativo(viatico)) {
    return res.status(400).json({ error: 'El viático no puede ser negativo' });
  }

  try {
    const resultado = await pool.query(
      `UPDATE tarifas SET monto = $1, viatico = $2 WHERE id = $3 RETURNING *`,
      [monto, viatico || 0, id]
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
