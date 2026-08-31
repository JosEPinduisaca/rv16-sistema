const pool = require('../config/db');
const repo = require('../repositories/arbitroRepository');
const designacionRepo = require('../repositories/designacionRepository');
const AppError = require('../utils/AppError');
const { ejecutarEnTransaccion } = require('../utils/transaccion');
const {
  validarCedulaEcuatoriana,
  validarEmail,
  validarTelefono,
  soloLetras,
  textoValido,
} = require('../utils/validaciones');

const NIVELES_VALIDOS = ['formacion', 'con_experiencia', 'nuevo'];

// Devuelve el perfil de árbitro asociado al usuario logueado (según el JWT).
// Evita que el frontend tenga que buscar "cuál soy yo" recorriendo la lista completa.
async function obtenerPerfilPropio(usuarioId) {
  const perfil = await repo.obtenerPerfilPorUsuarioId(usuarioId);
  if (!perfil) {
    throw new AppError(404, 'Este usuario no tiene un perfil de árbitro asociado');
  }
  return perfil;
}

async function listarDisponibilidad(arbitroId) {
  await repo.limpiarDisponibilidadPasada();
  return repo.listarDisponibilidadPorArbitro(arbitroId);
}

async function listarArbitros() {
  return repo.listarArbitros();
}

// Permite al Directivo o Administrador ascender/reclasificar a un árbitro
// según su desempeño, tal como define el Capítulo I del proyecto.
async function actualizarNivel(id, nivel) {
  if (!NIVELES_VALIDOS.includes(nivel)) {
    throw new AppError(400, 'Nivel inválido');
  }

  const actualizado = await repo.actualizarNivel(id, nivel);
  if (!actualizado) {
    throw new AppError(404, 'Árbitro no encontrado');
  }
  return actualizado;
}

// Calcula, para un encuentro específico, qué árbitros son "candidatos recomendados"
// según su nivel de experiencia frente a la intensidad del partido, su disponibilidad
// declarada para esa fecha y que no tengan una penalización activa. Es una recomendación
// visual (resaltado), NO un bloqueo: el administrador conserva la libertad de designar
// a cualquier árbitro. La exclusión por cruce de horario y el cálculo de "recomendado"
// viven en la consulta del repositorio (repo.listarCandidatos): son un filtrado de datos,
// no una regla que dependa de más contexto que el propio encuentro.
async function listarCandidatos(encuentroId) {
  if (!encuentroId) {
    throw new AppError(400, 'encuentro_id es obligatorio');
  }

  const encuentro = await repo.obtenerEncuentroParaCandidatos(encuentroId);
  if (!encuentro) {
    throw new AppError(404, 'Encuentro no encontrado');
  }

  const { fecha, hora, intensidad, cancha } = encuentro;
  return repo.listarCandidatos({ fecha, hora, intensidad, cancha, encuentroId });
}

// "Elimina" (desactiva) o reactiva a un árbitro. No se borra de la base de datos:
// se conserva su historial de designaciones, adelantos y liquidaciones para no
// romper reportes pasados. Un árbitro desactivado no puede iniciar sesión (el
// login filtra por activo = TRUE) ni ser designado a nuevos encuentros.
async function cambiarEstadoArbitro(id, activo) {
  if (typeof activo !== 'boolean') {
    throw new AppError(400, 'activo debe ser true o false');
  }

  const usuarioId = await repo.obtenerUsuarioIdPorArbitro(id);
  if (!usuarioId) {
    throw new AppError(404, 'Árbitro no encontrado');
  }

  await repo.actualizarActivoUsuario(usuarioId, activo);
  return { mensaje: activo ? 'Árbitro reactivado' : 'Árbitro desactivado', arbitro_id: Number(id), activo };
}

async function obtenerArbitro(id) {
  const arbitro = await repo.obtenerArbitroPorId(id);
  if (!arbitro) {
    throw new AppError(404, 'Árbitro no encontrado');
  }
  return arbitro;
}

// El propio árbitro marca su disponibilidad para una fecha.
async function registrarDisponibilidad(id, fecha, disponible, comentario) {
  if (!fecha) {
    throw new AppError(400, 'La fecha es obligatoria');
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (new Date(fecha) < hoy) {
    throw new AppError(400, 'No puedes registrar disponibilidad para una fecha pasada');
  }

  // Aprovecha esta escritura para limpiar registros de fechas ya pasadas.
  await repo.limpiarDisponibilidadPasada();
  return repo.upsertDisponibilidad(id, fecha, disponible, comentario);
}

// Permite al administrador editar los datos personales de un árbitro
// (cédula, nombres, apellidos, email, teléfono). No toca la contraseña.
async function actualizarArbitro(id, datos) {
  const { cedula, nombres, apellidos, email, telefono } = datos;

  const errores = [];
  if (!validarCedulaEcuatoriana(cedula)) {
    errores.push('La cédula ingresada no es válida (debe tener 10 dígitos y ser una cédula ecuatoriana real)');
  }
  if (!textoValido(nombres) || !soloLetras(nombres)) {
    errores.push('El nombre solo puede contener letras y al menos 2 caracteres');
  }
  if (!textoValido(apellidos) || !soloLetras(apellidos)) {
    errores.push('El apellido solo puede contener letras y al menos 2 caracteres');
  }
  if (!validarEmail(email)) {
    errores.push('El email no tiene un formato válido');
  }
  if (!validarTelefono(telefono)) {
    errores.push('El teléfono debe tener entre 7 y 10 dígitos numéricos');
  }
  if (errores.length > 0) {
    throw new AppError(400, errores.join('. '));
  }

  const usuarioId = await repo.obtenerUsuarioIdPorArbitro(id);
  if (!usuarioId) {
    throw new AppError(404, 'Árbitro no encontrado');
  }

  const emailNormalizado = email.trim().toLowerCase();

  const [existeCedula, existeEmail] = await Promise.all([
    repo.buscarDuplicadoCedula(cedula, usuarioId),
    repo.buscarDuplicadoEmail(emailNormalizado, usuarioId),
  ]);

  const erroresDuplicado = [];
  if (existeCedula) {
    erroresDuplicado.push('Ya existe otro usuario registrado con esa cédula');
  }
  if (existeEmail) {
    erroresDuplicado.push('Ya existe otro usuario registrado con ese email');
  }
  if (erroresDuplicado.length > 0) {
    throw new AppError(409, erroresDuplicado.join('. '));
  }

  return repo.actualizarDatosUsuario(usuarioId, {
    cedula,
    nombres: nombres.trim(),
    apellidos: apellidos.trim(),
    email: emailNormalizado,
    telefono: telefono || null,
  });
}

// Borrado REAL (no desactivación). Solo el administrador puede hacerlo.
// Por defecto (forzar=false) es un borrado SEGURO: si el árbitro tiene
// historial (designaciones, adelantos, liquidaciones o disponibilidad) se
// rechaza con tieneHistorial=true, para que el frontend pregunte qué hacer.
// Con forzar=true, borra TODO en cascada. No hay vuelta atrás.
async function eliminarArbitro(id, forzar) {
  const usuarioId = await repo.obtenerUsuarioIdPorArbitro(id);
  if (!usuarioId) {
    throw new AppError(404, 'Árbitro no encontrado');
  }

  const [designaciones, adelantos, liquidaciones, disponibilidad] = await Promise.all([
    repo.buscarDesignacionesDeArbitro(id),
    repo.buscarAdelantoDeArbitro(id),
    repo.buscarLiquidacionDeArbitro(id),
    repo.buscarDisponibilidadDeArbitro(id),
  ]);

  const tieneHistorial =
    designaciones.length > 0 ||
    adelantos.length > 0 ||
    liquidaciones.length > 0 ||
    disponibilidad.length > 0;

  if (tieneHistorial && !forzar) {
    throw new AppError(
      409,
      'Este árbitro ya tiene historial (designaciones, adelantos, liquidaciones o disponibilidad).',
      { tieneHistorial: true }
    );
  }

  if (!tieneHistorial) {
    // Sin historial: borrado simple, el usuario arrastra en cascada a arbitros.
    await repo.eliminarUsuario(pool, usuarioId);
    return { mensaje: 'Árbitro eliminado correctamente' };
  }

  // Borrado FORZADO: elimina también todo el historial vinculado, en una transacción.
  const encuentroIds = designaciones.map((d) => d.encuentro_id);

  await ejecutarEnTransaccion(async (client) => {
    await repo.eliminarDetalleLiquidacionDeArbitro(client, id);
    await repo.eliminarMensajesDeLiquidacionesDeArbitro(client, id);
    await repo.eliminarAdelantosDeArbitro(client, id);
    await repo.eliminarLiquidacionesDeArbitro(client, id);
    await repo.eliminarDesignacionesDeArbitro(client, id);
    await repo.eliminarDisponibilidadDeArbitro(client, id);

    // Los encuentros que se quedaron sin ninguna designación regresan a "programado"
    for (const encuentroId of encuentroIds) {
      const restantes = await designacionRepo.contarRestantesEnEncuentro(client, encuentroId);
      if (restantes === 0) {
        await designacionRepo.volverEncuentroProgramado(client, encuentroId);
      }
    }

    // Borra el usuario (arrastra la fila de arbitros en cascada)
    await repo.eliminarUsuario(client, usuarioId);
  });

  return { mensaje: 'Árbitro y todo su historial fueron eliminados por completo' };
}

module.exports = {
  obtenerPerfilPropio,
  listarDisponibilidad,
  listarArbitros,
  actualizarNivel,
  listarCandidatos,
  cambiarEstadoArbitro,
  obtenerArbitro,
  registrarDisponibilidad,
  actualizarArbitro,
  eliminarArbitro,
};
