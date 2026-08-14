const campeonatoService = require('../services/campeonatoService');
const manejarError = require('../utils/manejarError');

// POST /api/campeonatos
async function crearCampeonato(req, res) {
  try {
    const resultado = await campeonatoService.crearCampeonato(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al crear el campeonato');
  }
}

// GET /api/campeonatos
async function listarCampeonatos(req, res) {
  try {
    const resultado = await campeonatoService.listarCampeonatos();
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al listar campeonatos');
  }
}

// PUT /api/campeonatos/:id
async function actualizarCampeonato(req, res) {
  try {
    const resultado = await campeonatoService.actualizarCampeonato(req.params.id, req.body);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al actualizar el campeonato');
  }
}

// DELETE /api/campeonatos/:id
async function eliminarCampeonato(req, res) {
  try {
    const resultado = await campeonatoService.eliminarCampeonato(req.params.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al eliminar el campeonato');
  }
}

module.exports = { crearCampeonato, listarCampeonatos, actualizarCampeonato, eliminarCampeonato };
