const arbitroService = require('../services/arbitroService');
const manejarError = require('../utils/manejarError');

// GET /api/arbitros/me
async function obtenerPerfilPropio(req, res) {
  try {
    const resultado = await arbitroService.obtenerPerfilPropio(req.usuario.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al obtener el perfil propio');
  }
}

// GET /api/arbitros/:id/disponibilidad
async function listarDisponibilidad(req, res) {
  try {
    const resultado = await arbitroService.listarDisponibilidad(req.params.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al listar la disponibilidad');
  }
}

// GET /api/arbitros  (solo administrador/directivo)
async function listarArbitros(req, res) {
  try {
    const resultado = await arbitroService.listarArbitros();
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al listar árbitros');
  }
}

// PUT /api/arbitros/:id/nivel
async function actualizarNivel(req, res) {
  try {
    const resultado = await arbitroService.actualizarNivel(req.params.id, req.body.nivel);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al actualizar el nivel del árbitro');
  }
}

// GET /api/arbitros/candidatos?encuentro_id=X
async function listarCandidatos(req, res) {
  try {
    const resultado = await arbitroService.listarCandidatos(req.query.encuentro_id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al calcular los candidatos');
  }
}

// PUT /api/arbitros/:id/estado
async function cambiarEstadoArbitro(req, res) {
  try {
    const resultado = await arbitroService.cambiarEstadoArbitro(req.params.id, req.body.activo);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al actualizar el estado del árbitro');
  }
}

// GET /api/arbitros/:id
async function obtenerArbitro(req, res) {
  try {
    const resultado = await arbitroService.obtenerArbitro(req.params.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al obtener el árbitro');
  }
}

// PUT /api/arbitros/:id/disponibilidad
async function registrarDisponibilidad(req, res) {
  try {
    const { fecha, disponible, comentario } = req.body;
    const resultado = await arbitroService.registrarDisponibilidad(req.params.id, fecha, disponible, comentario);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al registrar disponibilidad');
  }
}

// PUT /api/arbitros/:id
async function actualizarArbitro(req, res) {
  try {
    const resultado = await arbitroService.actualizarArbitro(req.params.id, req.body);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al actualizar el árbitro');
  }
}

// DELETE /api/arbitros/:id
async function eliminarArbitro(req, res) {
  try {
    const forzar = req.query.forzar === 'true';
    const resultado = await arbitroService.eliminarArbitro(req.params.id, forzar);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al eliminar el árbitro');
  }
}

module.exports = {
  listarArbitros,
  obtenerArbitro,
  registrarDisponibilidad,
  obtenerPerfilPropio,
  listarDisponibilidad,
  cambiarEstadoArbitro,
  actualizarNivel,
  listarCandidatos,
  actualizarArbitro,
  eliminarArbitro,
};
