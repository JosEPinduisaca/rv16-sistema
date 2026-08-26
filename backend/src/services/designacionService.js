const repo = require('../repositories/designacionRepository');
const AppError = require('../utils/AppError');

const DURACION_PARTIDO_HORAS = 2; // ventana usada para detectar cruce de horario

// Body: { encuentro_id, arbitro_id, rol_designacion }
async function crearDesignacion({
  encuentro_id: encuentroId,
  arbitro_id: arbitroId,
  rol_designacion: rolDesignacion,
}) {
  if (!encuentroId || !arbitroId || !rolDesignacion) {
    throw new AppError(400, 'encuentro_id, arbitro_id y rol_designacion son obligatorios');
  }

  // 1. Verificar que el encuentro exista
  const encuentro = await repo.obtenerEncuentroPorId(encuentroId);
  if (!encuentro) {
    throw new AppError(404, 'Encuentro no encontrado');
  }

  // 2. Verificar disponibilidad declarada por el arbitro para esa fecha
  const disponibilidad = await repo.obtenerDisponibilidad(arbitroId, encuentro.fecha);
  if (disponibilidad && disponibilidad.disponible === false) {
    throw new AppError(409, 'El árbitro se marcó como no disponible ese día');
  }

  // 3. Verificar penalizacion activa y que el usuario no esté desactivado
  const arbitro = await repo.obtenerArbitroConUsuario(arbitroId);
  if (!arbitro) {
    throw new AppError(404, 'Árbitro no encontrado');
  }
  if (!arbitro.activo) {
    throw new AppError(409, 'El árbitro está desactivado y no puede ser designado');
  }
  if (arbitro.penalizacion_activa) {
    throw new AppError(409, 'El árbitro tiene una penalización activa y no puede ser designado');
  }

  // 4. Verificar cruce de horario: mismo arbitro, misma fecha, hora dentro de
  //    +/- 2 horas, pero SOLO si es en una cancha DISTINTA.
  const cruce = await repo.buscarCruceHorario(
    arbitroId,
    encuentro.fecha,
    encuentro.hora,
    DURACION_PARTIDO_HORAS,
    encuentro.cancha
  );
  if (cruce) {
    throw new AppError(409, 'El árbitro ya tiene una designación que se cruza de horario ese día', { conflicto: cruce });
  }

  // 5. Verificar que no exista ya esa combinación exacta (encuentro + arbitro)
  const yaDesignado = await repo.buscarDesignacionExacta(encuentroId, arbitroId);
  if (yaDesignado) {
    throw new AppError(409, 'Este árbitro ya está designado en este encuentro');
  }

  // 5b. Verificar el cupo de ese rol: normalmente 1 solo central y hasta 2
  //     asistentes; si el encuentro está en modo "dos_centrales", se
  //     permiten 2 centrales en vez de asistentes.
  const esDosCentrales = encuentro.modo_designacion === 'dos_centrales';
  const limiteRol = rolDesignacion === 'central' ? (esDosCentrales ? 2 : 1) : 2;
  const ocupados = await repo.contarOcupadosRol(encuentroId, rolDesignacion);
  if (ocupados >= limiteRol) {
    throw new AppError(
      409,
      rolDesignacion === 'central'
        ? (esDosCentrales
            ? 'Ya hay 2 árbitros centrales designados para este encuentro (el máximo permitido).'
            : 'Ya existe un árbitro designado como central para este encuentro. Quítalo primero si deseas reemplazarlo.')
        : 'Ya hay 2 asistentes designados para este encuentro (el máximo permitido).'
    );
  }

  // 6. Verificar que exista tarifa configurada para ese campeonato/categoria/rol
  //    (la intensidad NO afecta el pago, solo se usa para recomendar candidatos)
  const tarifa = await repo.buscarTarifaVigente(encuentro.campeonato_id, encuentro.categoria, rolDesignacion);
  if (!tarifa) {
    throw new AppError(409, 'No existe una tarifa configurada para esta combinación de campeonato, categoría y rol');
  }

  // 7. Insertar la designacion
  const nuevaDesignacion = await repo.insertar(encuentroId, arbitroId, rolDesignacion);

  // Actualiza el estado del encuentro a "designado"
  await repo.marcarEncuentroDesignado(encuentroId);

  return {
    designacion: nuevaDesignacion,
    pago_estimado: { monto: tarifa.monto },
  };
}

async function publicarDesignacion(id) {
  const actualizada = await repo.publicar(id);
  if (!actualizada) {
    throw new AppError(404, 'Designación no encontrada');
  }
  await repo.publicarEncuentroDe(id);
  return actualizada;
}

async function listarPorArbitro(arbitroId) {
  return repo.listarPorArbitro(arbitroId);
}

// Permite corregir una designación ya realizada (incluso publicada). No se puede
// eliminar si ya forma parte de una liquidación pagada/generada, para no alterar
// un historial financiero ya calculado. Si el encuentro se queda sin ninguna
// designación, su estado regresa a "programado".
async function eliminarDesignacion(id) {
  const yaLiquidada = await repo.estaEnLiquidacion(id);
  if (yaLiquidada) {
    throw new AppError(409, 'Esta designación ya forma parte de una liquidación y no se puede eliminar');
  }

  const designacion = await repo.obtenerPorId(id);
  if (!designacion) {
    throw new AppError(404, 'Designación no encontrada');
  }

  await repo.eliminar(id);

  const restantes = await repo.contarRestantesEnEncuentro(designacion.encuentro_id);
  if (restantes === 0) {
    await repo.volverEncuentroProgramado(designacion.encuentro_id);
  }

  return { mensaje: 'Designación eliminada correctamente' };
}

// body: { fecha } (opcional, si no viene aplica a todas). Publica en bloque
// todas las designaciones que estén en "designado" — ya no se podrán editar
// hasta que se despubliquen. Los árbitros siguen viendo sus designaciones
// igual en "Mis designaciones", publicadas o no.
async function publicarTodas(fecha) {
  const filas = await repo.publicarEnBloque(fecha);
  const encuentroIds = [...new Set(filas.map((r) => r.encuentro_id))];
  if (encuentroIds.length > 0) {
    await repo.marcarEncuentrosPublicados(encuentroIds);
  }
  return { actualizadas: filas.length };
}

// Revierte una publicación en bloque: vuelven a estado "designado" y se
// pueden editar de nuevo. No se borran ni dejan de ser visibles para el árbitro.
async function despublicarTodas(fecha) {
  const filas = await repo.despublicarEnBloque(fecha);
  const encuentroIds = [...new Set(filas.map((r) => r.encuentro_id))];
  if (encuentroIds.length > 0) {
    await repo.marcarEncuentrosDesignados(encuentroIds);
  }
  return { actualizadas: filas.length };
}

module.exports = {
  crearDesignacion,
  publicarDesignacion,
  listarPorArbitro,
  eliminarDesignacion,
  publicarTodas,
  despublicarTodas,
};
