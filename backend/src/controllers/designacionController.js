const designacionService = require('../services/designacionService');
const manejarError = require('../utils/manejarError');

// POST /api/designaciones
// Body: { encuentro_id, arbitro_id, rol_designacion }
async function crearDesignacion(req, res) {
  try {
    const resultado = await designacionService.crearDesignacion(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al crear la designación');
  }
}

// PUT /api/designaciones/:id/publicar
async function publicarDesignacion(req, res) {
  try {
    const resultado = await designacionService.publicarDesignacion(req.params.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al publicar la designación');
  }
}

// GET /api/designaciones/arbitro/:arbitroId
async function listarPorArbitro(req, res) {
  try {
    const resultado = await designacionService.listarPorArbitro(req.params.arbitroId);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al listar designaciones del árbitro');
  }
}

// DELETE /api/designaciones/:id
async function eliminarDesignacion(req, res) {
  try {
    const resultado = await designacionService.eliminarDesignacion(req.params.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al eliminar la designación');
  }
}

module.exports = {
  crearDesignacion,
  publicarDesignacion,
  listarPorArbitro,
  eliminarDesignacion,
};
