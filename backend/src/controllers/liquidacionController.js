const liquidacionService = require('../services/liquidacionService');
const manejarError = require('../utils/manejarError');

// POST /api/liquidaciones/generar
async function generarLiquidacion(req, res) {
  try {
    const resultado = await liquidacionService.generarLiquidacion(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al generar la liquidación');
  }
}

// POST /api/liquidaciones/generar-todos
async function generarParaTodos(req, res) {
  try {
    const resultado = await liquidacionService.generarParaTodos(req.body);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al generar las liquidaciones');
  }
}

// GET /api/liquidaciones/arbitro/:arbitroId
async function listarPorArbitro(req, res) {
  try {
    const resultado = await liquidacionService.listarPorArbitro(req.params.arbitroId);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al listar liquidaciones');
  }
}

// GET /api/liquidaciones
async function listarTodas(req, res) {
  try {
    const resultado = await liquidacionService.listarTodas();
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al listar las liquidaciones');
  }
}

// GET /api/liquidaciones/:id
async function obtenerLiquidacion(req, res) {
  try {
    const resultado = await liquidacionService.obtenerLiquidacion(req.params.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al obtener la liquidación');
  }
}

// PUT /api/liquidaciones/:id/pagar
async function marcarComoPagada(req, res) {
  try {
    const resultado = await liquidacionService.marcarComoPagada(req.params.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al marcar la liquidación como pagada');
  }
}

// PUT /api/liquidaciones/:id/responder
async function responderLiquidacion(req, res) {
  try {
    const { respuesta, nota } = req.body;
    const resultado = await liquidacionService.responderLiquidacion(req.params.id, req.usuario.id, respuesta, nota);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al registrar tu respuesta');
  }
}

// PUT /api/liquidaciones/:id/responder-admin
async function responderComoAdmin(req, res) {
  try {
    const resultado = await liquidacionService.responderComoAdmin(req.params.id, req.body.respuesta_admin);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al enviar tu respuesta');
  }
}

module.exports = {
  generarLiquidacion,
  generarParaTodos,
  listarPorArbitro,
  listarTodas,
  obtenerLiquidacion,
  marcarComoPagada,
  responderLiquidacion,
  responderComoAdmin,
};
