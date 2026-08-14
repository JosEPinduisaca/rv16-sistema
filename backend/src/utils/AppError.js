// Error de negocio con código HTTP asociado. Los servicios lo lanzan cuando
// una operación no puede completarse por una razón esperada (validación,
// permisos, estado inválido, etc.), y los controladores lo traducen a
// respuesta HTTP con manejarError().
class AppError extends Error {
  constructor(status, mensaje, extra) {
    super(mensaje);
    this.status = status;
    this.extra = extra || null; // campos adicionales a incluir en el body de la respuesta, ej. { tieneHistorial: true }
  }
}

module.exports = AppError;
