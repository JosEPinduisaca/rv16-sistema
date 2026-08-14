const encuentroService = require('../services/encuentroService');
const manejarError = require('../utils/manejarError');

// POST /api/encuentros
async function crearEncuentro(req, res) {
  try {
    const resultado = await encuentroService.crearEncuentro(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al crear el encuentro');
  }
}

// GET /api/encuentros?estado=programado
async function listarEncuentros(req, res) {
  try {
    const resultado = await encuentroService.listarEncuentros(req.query.estado);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al listar encuentros');
  }
}

// GET /api/encuentros/:id
async function obtenerEncuentro(req, res) {
  try {
    const resultado = await encuentroService.obtenerEncuentro(req.params.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al obtener el encuentro');
  }
}

// GET /api/encuentros/general?fecha=YYYY-MM-DD
async function listarConDesignaciones(req, res) {
  try {
    const resultado = await encuentroService.listarConDesignaciones(req.query.fecha);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al obtener el cronograma general');
  }
}

// PUT /api/encuentros/:id
async function actualizarEncuentro(req, res) {
  try {
    const resultado = await encuentroService.actualizarEncuentro(req.params.id, req.body);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al actualizar el encuentro');
  }
}

// DELETE /api/encuentros/:id
async function eliminarEncuentro(req, res) {
  try {
    const resultado = await encuentroService.eliminarEncuentro(req.params.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al eliminar el encuentro');
  }
}

module.exports = {
  crearEncuentro,
  listarEncuentros,
  obtenerEncuentro,
  listarConDesignaciones,
  actualizarEncuentro,
  eliminarEncuentro,
};
