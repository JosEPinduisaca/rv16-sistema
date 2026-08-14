const AppError = require('./AppError');

// Traduce el resultado de un servicio a una respuesta HTTP: si es un AppError
// (error esperado de negocio) usa su status y mensaje; si no, es un fallo
// inesperado, se loguea y se responde 500 con un mensaje genérico.
function manejarError(res, error, mensajePorDefecto) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: error.message, ...error.extra });
  }
  console.error(error);
  return res.status(500).json({ error: mensajePorDefecto });
}

module.exports = manejarError;
