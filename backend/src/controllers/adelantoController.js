const adelantoService = require('../services/adelantoService');
const manejarError = require('../utils/manejarError');

// POST /api/adelantos
async function solicitarAdelanto(req, res) {
  try {
    const resultado = await adelantoService.solicitarAdelanto(req.body, req.usuario.rol);
    res.status(201).json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al solicitar el adelanto');
  }
}

// PUT /api/adelantos/:id/estado
async function cambiarEstadoAdelanto(req, res) {
  try {
    const resultado = await adelantoService.cambiarEstadoAdelanto(req.params.id, req.body.estado);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al actualizar el adelanto');
  }
}

// GET /api/adelantos/arbitro/:arbitroId
async function listarPorArbitro(req, res) {
  try {
    const resultado = await adelantoService.listarPorArbitro(req.params.arbitroId);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al listar adelantos');
  }
}

// GET /api/adelantos
async function listarTodos(req, res) {
  try {
    const resultado = await adelantoService.listarTodos();
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al listar los adelantos');
  }
}

module.exports = { solicitarAdelanto, cambiarEstadoAdelanto, listarPorArbitro, listarTodos };
