const repo = require('../repositories/adelantoRepository');
const AppError = require('../utils/AppError');
const { esMontoPositivo } = require('../utils/validaciones');

// El árbitro solicita un adelanto (queda "pendiente", requiere aprobación).
// Si lo registra el administrador directamente, queda "aprobado" de una vez
// (no tiene sentido que se autoaprobara aparte).
async function solicitarAdelanto({ arbitro_id: arbitroId, monto }, rolUsuario) {
  if (!arbitroId || !esMontoPositivo(monto)) {
    throw new AppError(400, 'arbitro_id y un monto mayor a cero son obligatorios');
  }

  const arbitro = await repo.buscarArbitroPorId(arbitroId);
  if (!arbitro) {
    throw new AppError(404, 'Árbitro no encontrado');
  }

  const estadoInicial = rolUsuario === 'administrador' ? 'aprobado' : 'pendiente';
  return repo.crear(arbitroId, monto, estadoInicial);
}

// El administrador aprueba o rechaza.
async function cambiarEstadoAdelanto(id, estado) {
  if (!['aprobado', 'rechazado'].includes(estado)) {
    throw new AppError(400, "estado debe ser 'aprobado' o 'rechazado'");
  }

  const actualizado = await repo.actualizarEstadoPendiente(id, estado);
  if (!actualizado) {
    throw new AppError(404, 'Adelanto no encontrado o ya fue procesado');
  }
  return actualizado;
}

async function listarPorArbitro(arbitroId) {
  return repo.listarPorArbitro(arbitroId);
}

// Todos los adelantos de todos los árbitros, para la vista general del admin.
// Pendientes primero (los más antiguos arriba = mayor prioridad), luego el resto.
async function listarTodos() {
  return repo.listarTodos();
}

module.exports = { solicitarAdelanto, cambiarEstadoAdelanto, listarPorArbitro, listarTodos };
