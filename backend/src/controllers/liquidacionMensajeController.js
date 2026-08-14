const liquidacionMensajeService = require('../services/liquidacionMensajeService');
const manejarError = require('../utils/manejarError');

// GET /api/liquidaciones/:id/mensajes
async function listarMensajes(req, res) {
  try {
    const resultado = await liquidacionMensajeService.listarMensajes(req.params.id, req.usuario);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al listar los mensajes');
  }
}

// POST /api/liquidaciones/:id/mensajes
// multipart/form-data: campo "mensaje" (texto, opcional) y "imagen" (archivo, opcional).
async function crearMensaje(req, res) {
  try {
    const resultado = await liquidacionMensajeService.crearMensaje(
      req.params.id,
      req.usuario,
      req.body.mensaje,
      req.file
    );
    res.status(201).json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al enviar el mensaje');
  }
}

module.exports = { listarMensajes, crearMensaje };
