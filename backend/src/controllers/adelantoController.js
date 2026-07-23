const pool = require('../config/db');
const { esMontoPositivo } = require('../utils/validaciones');

// POST /api/adelantos
// El árbitro solicita un adelanto (queda "pendiente", requiere aprobación).
// Si lo registra el administrador directamente, queda "aprobado" de una vez
// (no tiene sentido que se autoaprobara aparte).
async function solicitarAdelanto(req, res) {
  const { arbitro_id, monto } = req.body;

  if (!arbitro_id || !esMontoPositivo(monto)) {
    return res.status(400).json({ error: 'arbitro_id y un monto mayor a cero son obligatorios' });
  }

  try {
    const arbitro = await pool.query('SELECT id FROM arbitros WHERE id = $1', [arbitro_id]);
    if (arbitro.rows.length === 0) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }

    const estadoInicial = req.usuario.rol === 'administrador' ? 'aprobado' : 'pendiente';

    const resultado = await pool.query(
      `INSERT INTO adelantos (arbitro_id, monto, estado) VALUES ($1, $2, $3) RETURNING *`,
      [arbitro_id, monto, estadoInicial]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al solicitar el adelanto' });
  }
}

// PUT /api/adelantos/:id/estado
// El administrador aprueba o rechaza (body: { estado: 'aprobado' | 'rechazado' })
async function cambiarEstadoAdelanto(req, res) {
  const { id } = req.params;
  const { estado } = req.body;

  if (!['aprobado', 'rechazado'].includes(estado)) {
    return res.status(400).json({ error: "estado debe ser 'aprobado' o 'rechazado'" });
  }

  try {
    const resultado = await pool.query(
      `UPDATE adelantos SET estado = $1 WHERE id = $2 AND estado = 'pendiente' RETURNING *`,
      [estado, id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Adelanto no encontrado o ya fue procesado' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el adelanto' });
  }
}

// GET /api/adelantos/arbitro/:arbitroId
async function listarPorArbitro(req, res) {
  const { arbitroId } = req.params;
  try {
    const resultado = await pool.query(
      `SELECT * FROM adelantos WHERE arbitro_id = $1 ORDER BY fecha_solicitud DESC`,
      [arbitroId]
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar adelantos' });
  }
}

// GET /api/adelantos
// Todos los adelantos de todos los árbitros, para la vista general del admin.
// Pendientes primero (los más antiguos arriba = mayor prioridad), luego el resto.
async function listarTodos(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT a.*, u.nombres, u.apellidos
      FROM adelantos a
      JOIN arbitros ar ON ar.id = a.arbitro_id
      JOIN usuarios u ON u.id = ar.usuario_id
      ORDER BY
        (a.estado = 'pendiente') DESC,
        a.fecha_solicitud ASC
    `);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar los adelantos' });
  }
}

module.exports = { solicitarAdelanto, cambiarEstadoAdelanto, listarPorArbitro, listarTodos };
