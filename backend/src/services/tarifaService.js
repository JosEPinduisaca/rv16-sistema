const repo = require('../repositories/tarifaRepository');
const AppError = require('../utils/AppError');
const { esMontoPositivo, esMontoNoNegativo, categoriaValida } = require('../utils/validaciones');

// La tarifa depende solo de campeonato + categoría + rol (central o asistente).
// La intensidad del partido NO afecta el pago, solo se usa para recomendar
// candidatos al momento de designar.
//
// Reglas de negocio para categorías libres:
// - Una categoría nueva SIEMPRE se crea primero con rol "central".
// - La tarifa de "asistente" es opcional y solo puede agregarse si ya
//   existe la tarifa "central" de esa misma categoría.
// - El nombre de categoría se compara sin distinguir mayúsculas/espacios
//   para evitar duplicados accidentales ("Senior" vs "senior").
async function crearTarifa({ campeonato_id: campeonatoId, categoria: categoriaRaw, rol_arbitro: rolArbitro, monto, viatico }) {
  if (!campeonatoId || !categoriaRaw || !rolArbitro || monto === undefined) {
    throw new AppError(400, 'Faltan campos obligatorios');
  }
  if (!categoriaValida(categoriaRaw)) {
    throw new AppError(400, 'La categoría debe tener entre 2 y 40 caracteres (letras y números)');
  }
  if (!['central', 'asistente'].includes(rolArbitro)) {
    throw new AppError(400, 'Rol de árbitro inválido');
  }
  if (!esMontoPositivo(monto)) {
    throw new AppError(400, 'El monto debe ser un número mayor a cero');
  }
  if (viatico !== undefined && !esMontoNoNegativo(viatico)) {
    throw new AppError(400, 'El viático no puede ser negativo');
  }

  const categoria = categoriaRaw.trim();

  // Busca si ya existe una categoría con el mismo nombre en este campeonato
  // (sin importar mayúsculas/espacios) para reutilizar el nombre exacto guardado.
  const existentes = await repo.listarCategoriasVigentes(campeonatoId);
  const categoriaExistente = existentes.find(
    (r) => r.categoria.toLowerCase() === categoria.toLowerCase()
  );

  if (rolArbitro === 'central') {
    if (categoriaExistente) {
      throw new AppError(409, `La categoría "${categoriaExistente.categoria}" ya existe. Edita su monto desde la tabla.`);
    }
  } else {
    // rolArbitro === 'asistente': la tarifa central de esa categoría debe existir ya.
    if (!categoriaExistente) {
      throw new AppError(400, 'Primero debes crear la tarifa de Central para esta categoría');
    }
    const central = await repo.buscarCentralVigente(campeonatoId, categoriaExistente.categoria);
    if (!central) {
      throw new AppError(400, 'Primero debes crear la tarifa de Central para esta categoría');
    }
  }

  const categoriaFinal = categoriaExistente ? categoriaExistente.categoria : categoria;

  return repo.upsert(campeonatoId, categoriaFinal, rolArbitro, monto, viatico || 0);
}

async function listarTarifas(campeonatoId) {
  return repo.listar(campeonatoId);
}

// Solo el monto (y el viático) son editables. La categoría y el rol quedan
// fijos desde que se crea la tarifa: cambiarlos después podría dejar
// inconsistentes encuentros y designaciones ya hechos con esa combinación.
async function actualizarTarifa(id, { monto, viatico }) {
  if (monto === undefined) {
    throw new AppError(400, 'Falta el monto');
  }
  if (!esMontoPositivo(monto)) {
    throw new AppError(400, 'El monto debe ser un número mayor a cero');
  }
  if (viatico !== undefined && !esMontoNoNegativo(viatico)) {
    throw new AppError(400, 'El viático no puede ser negativo');
  }

  const actualizada = await repo.actualizar(id, monto, viatico === undefined ? null : viatico);
  if (!actualizada) {
    throw new AppError(404, 'Tarifa no encontrada');
  }
  return actualizada;
}

async function eliminarTarifa(id) {
  const eliminada = await repo.eliminar(id);
  if (!eliminada) {
    throw new AppError(404, 'Tarifa no encontrada');
  }
  return { mensaje: 'Tarifa eliminada correctamente' };
}

module.exports = { crearTarifa, listarTarifas, actualizarTarifa, eliminarTarifa };
