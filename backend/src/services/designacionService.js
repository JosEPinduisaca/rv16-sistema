const pool = require('../config/db');
const repo = require('../repositories/designacionRepository');
const tarifaRepo = require('../repositories/tarifaRepository');
const AppError = require('../utils/AppError');
const { ejecutarEnTransaccion } = require('../utils/transaccion');

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
  const tarifa = await tarifaRepo.buscarVigente(pool, encuentro.campeonato_id, encuentro.categoria, rolDesignacion);
  if (!tarifa) {
    throw new AppError(409, 'No existe una tarifa configurada para esta combinación de campeonato, categoría y rol');
  }

  // 7. Insertar la designacion y marcar el encuentro como "designado" en una
  //    sola transacción: si el segundo paso falla, no debe quedar una
  //    designación insertada con el encuentro aún en "programado".
  const nuevaDesignacion = await ejecutarEnTransaccion(async (client) => {
    const creada = await repo.insertar(client, encuentroId, arbitroId, rolDesignacion);
    await repo.marcarEncuentroDesignado(client, encuentroId);
    return creada;
  });

  return {
    designacion: nuevaDesignacion,
    pago_estimado: { monto: tarifa.monto },
  };
}

async function publicarDesignacion(id) {
  return ejecutarEnTransaccion(async (client) => {
    const actualizada = await repo.publicar(client, id);
    if (!actualizada) {
      throw new AppError(404, 'Designación no encontrada');
    }
    await repo.publicarEncuentroDe(client, id);
    return actualizada;
  });
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

  // Eliminar y, si el encuentro se queda sin designaciones, reabrirlo: las
  // tres consultas deben quedar como una sola unidad (si la reapertura
  // fallara, la designación no debe quedar borrada de todas formas).
  await ejecutarEnTransaccion(async (client) => {
    await repo.eliminar(client, id);
    const restantes = await repo.contarRestantesEnEncuentro(client, designacion.encuentro_id);
    if (restantes === 0) {
      await repo.volverEncuentroProgramado(client, designacion.encuentro_id);
    }
  });

  return { mensaje: 'Designación eliminada correctamente' };
}

module.exports = {
  crearDesignacion,
  publicarDesignacion,
  listarPorArbitro,
  eliminarDesignacion,
};
