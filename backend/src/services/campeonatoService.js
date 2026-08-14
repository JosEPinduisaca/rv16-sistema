const repo = require('../repositories/campeonatoRepository');
const AppError = require('../utils/AppError');
const { textoValido, soloLetras } = require('../utils/validaciones');

function validarFechas(fecha_inicio, fecha_fin) {
  if (!fecha_inicio) return 'La fecha de inicio es obligatoria';
  if (!fecha_fin) return 'La fecha de fin es obligatoria';
  if (new Date(fecha_fin) < new Date(fecha_inicio)) {
    return 'La fecha fin no puede ser anterior a la fecha de inicio';
  }
  return null;
}

// Solo se aplica al CREAR un campeonato nuevo (no al editar uno ya existente,
// que puede legítimamente haber comenzado en el pasado).
function validarFechaInicioNoPasada(fecha_inicio) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicio = new Date(fecha_inicio);
  if (inicio < hoy) {
    return 'La fecha de inicio no puede ser anterior al día de hoy';
  }
  return null;
}

function validarNombreYLiga(nombre, liga) {
  if (!textoValido(nombre) || !soloLetras(nombre)) {
    return 'El nombre solo puede contener letras (sin números ni símbolos)';
  }
  if (!textoValido(liga) || !soloLetras(liga)) {
    return 'La liga solo puede contener letras (sin números ni símbolos)';
  }
  return null;
}

async function crearCampeonato({ nombre, liga, fecha_inicio, fecha_fin }) {
  const errorNombreLiga = validarNombreYLiga(nombre, liga);
  if (errorNombreLiga) {
    throw new AppError(400, errorNombreLiga);
  }
  const errorFechas = validarFechas(fecha_inicio, fecha_fin);
  if (errorFechas) {
    throw new AppError(400, errorFechas);
  }
  const errorFechaPasada = validarFechaInicioNoPasada(fecha_inicio);
  if (errorFechaPasada) {
    throw new AppError(400, errorFechaPasada);
  }

  return repo.crear({ nombre: nombre.trim(), liga: liga.trim(), fechaInicio: fecha_inicio, fechaFin: fecha_fin });
}

async function listarCampeonatos() {
  return repo.listar();
}

// No se valida "fecha no pasada" aquí: un campeonato ya existente puede
// legítimamente haber comenzado en el pasado.
async function actualizarCampeonato(id, { nombre, liga, fecha_inicio, fecha_fin }) {
  const errorNombreLiga = validarNombreYLiga(nombre, liga);
  if (errorNombreLiga) {
    throw new AppError(400, errorNombreLiga);
  }
  const errorFechas = validarFechas(fecha_inicio, fecha_fin);
  if (errorFechas) {
    throw new AppError(400, errorFechas);
  }

  const actualizado = await repo.actualizar(id, {
    nombre: nombre.trim(), liga: liga.trim(), fechaInicio: fecha_inicio, fechaFin: fecha_fin,
  });
  if (!actualizado) {
    throw new AppError(404, 'Campeonato no encontrado');
  }
  return actualizado;
}

async function eliminarCampeonato(id) {
  const tieneEncuentros = await repo.tieneEncuentros(id);
  if (tieneEncuentros) {
    throw new AppError(409, 'Este campeonato ya tiene encuentros registrados y no se puede eliminar sin perder ese historial.');
  }

  const eliminado = await repo.eliminar(id);
  if (!eliminado) {
    throw new AppError(404, 'Campeonato no encontrado');
  }
  return { mensaje: 'Campeonato eliminado correctamente' };
}

module.exports = { crearCampeonato, listarCampeonatos, actualizarCampeonato, eliminarCampeonato };
