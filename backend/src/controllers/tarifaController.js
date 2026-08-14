const tarifaService = require('../services/tarifaService');
const manejarError = require('../utils/manejarError');

// POST /api/tarifas
async function crearTarifa(req, res) {
  try {
    const resultado = await tarifaService.crearTarifa(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al crear la tarifa');
  }
}

// GET /api/tarifas?campeonato_id=1
async function listarTarifas(req, res) {
  try {
    const resultado = await tarifaService.listarTarifas(req.query.campeonato_id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al listar tarifas');
  }
}

// PUT /api/tarifas/:id
async function actualizarTarifa(req, res) {
  try {
    const resultado = await tarifaService.actualizarTarifa(req.params.id, req.body);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al actualizar la tarifa');
  }
}

// DELETE /api/tarifas/:id
async function eliminarTarifa(req, res) {
  try {
    const resultado = await tarifaService.eliminarTarifa(req.params.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al eliminar la tarifa');
  }
}

module.exports = { crearTarifa, listarTarifas, actualizarTarifa, eliminarTarifa };
