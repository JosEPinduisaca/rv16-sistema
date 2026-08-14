const repo = require('../repositories/encuentroRepository');
const { textoValido } = require('../utils/validaciones');
const AppError = require('../utils/AppError');

function horaValida(hora) {
  return typeof hora === 'string' && hora.slice(0, 5) !== '00:00';
}

// Solo se aplica al CREAR un encuentro nuevo, no al editar uno ya existente
// (que puede legítimamente estar en una fecha pasada, ej. un partido ya jugado).
function fechaNoPasada(fecha) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return new Date(fecha) >= hoy;
}

async function crearEncuentro({
  campeonato_id: campeonatoId,
  categoria,
  intensidad,
  fecha,
  hora,
  cancha,
  modo_designacion: modoDesignacion,
}) {
  if (!campeonatoId || !categoria || !intensidad || !fecha || !hora || !textoValido(cancha, 1)) {
    throw new AppError(400, 'Faltan campos obligatorios o la cancha está vacía');
  }
  if (!horaValida(hora)) {
    throw new AppError(400, 'La hora no puede ser 00:00, elige una hora real del partido');
  }
  if (!fechaNoPasada(fecha)) {
    throw new AppError(400, 'La fecha no puede ser anterior al día de hoy');
  }
  const modo = modoDesignacion || 'normal';
  if (!['normal', 'con_asistentes', 'dos_centrales'].includes(modo)) {
    throw new AppError(400, 'modo_designacion debe ser "normal", "con_asistentes" o "dos_centrales"');
  }

  const duplicado = await repo.existeDuplicado(fecha, hora, cancha);
  if (duplicado) {
    throw new AppError(409, 'Ya existe un encuentro registrado en esa cancha, fecha y hora');
  }

  return repo.crear({ campeonatoId, categoria, intensidad, fecha, hora, cancha, modo });
}

async function listarEncuentros(estado) {
  return estado ? repo.listarPorEstado(estado) : repo.listarTodos();
}

async function obtenerEncuentro(id) {
  const encuentro = await repo.obtenerPorId(id);
  if (!encuentro) {
    throw new AppError(404, 'Encuentro no encontrado');
  }
  const designaciones = await repo.obtenerDesignacionesDe(id);
  return { ...encuentro, designaciones };
}

async function listarConDesignaciones(fecha) {
  return repo.listarConDesignaciones(fecha);
}

// Permite reprogramar un encuentro (fecha, hora, cancha, categoría, intensidad).
// Los administradores/directivos pueden necesitar mover un partido por lluvia,
// disponibilidad de cancha, etc. No borra las designaciones existentes: si el
// horario cambia, es responsabilidad del usuario revisar que no se generen
// nuevos cruces (el sistema seguirá validando esto en cualquier NUEVA designación).
async function actualizarEncuentro(id, { categoria, intensidad, fecha, hora, cancha }) {
  if (hora !== undefined && !horaValida(hora)) {
    throw new AppError(400, 'La hora no puede ser 00:00, elige una hora real del partido');
  }

  const actual = await repo.obtenerPorId(id);
  if (!actual) {
    throw new AppError(404, 'Encuentro no encontrado');
  }

  const fechaFinal = fecha ?? actual.fecha;
  const horaFinal = hora ?? actual.hora;
  const canchaFinal = cancha ?? actual.cancha;

  const duplicado = await repo.existeDuplicado(fechaFinal, horaFinal, canchaFinal, id);
  if (duplicado) {
    throw new AppError(409, 'Ya existe otro encuentro registrado en esa cancha, fecha y hora');
  }

  return repo.actualizar(id, {
    categoria: categoria ?? actual.categoria,
    intensidad: intensidad ?? actual.intensidad,
    fecha: fechaFinal,
    hora: horaFinal,
    cancha: canchaFinal,
  });
}

// Se rechaza si ya tiene designaciones (primero hay que quitarlas desde
// Designación General), para no perder ese historial por accidente.
async function eliminarEncuentro(id) {
  const yaDesignado = await repo.tieneDesignaciones(id);
  if (yaDesignado) {
    throw new AppError(
      409,
      'Este encuentro ya tiene árbitros designados. Quítalos primero desde "Designación general" antes de eliminarlo.'
    );
  }

  const eliminado = await repo.eliminar(id);
  if (!eliminado) {
    throw new AppError(404, 'Encuentro no encontrado');
  }
  return { mensaje: 'Encuentro eliminado correctamente' };
}

module.exports = {
  crearEncuentro,
  listarEncuentros,
  obtenerEncuentro,
  listarConDesignaciones,
  actualizarEncuentro,
  eliminarEncuentro,
};
