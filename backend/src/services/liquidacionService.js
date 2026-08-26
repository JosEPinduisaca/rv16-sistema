const pool = require('../config/db');
const repo = require('../repositories/liquidacionRepository');
const AppError = require('../utils/AppError');

function validarRango(periodo, fechaInicio, fechaFin) {
  if (!['quincenal', 'mensual'].includes(periodo)) {
    return 'periodo debe ser quincenal o mensual';
  }
  const dias = Math.round((new Date(fechaFin) - new Date(fechaInicio)) / (1000 * 60 * 60 * 24)) + 1;
  if (periodo === 'quincenal' && dias > 16) {
    return 'El rango de una liquidación quincenal no puede superar 16 días';
  }
  if (periodo === 'mensual' && dias > 31) {
    return 'El rango de una liquidación mensual no puede superar 31 días';
  }
  return null;
}

// Genera la liquidación de UN árbitro para un rango dado. Reutilizable tanto
// para generar una sola (un árbitro) como para generar en lote (todos).
// Cada llamada usa su propia transacción, así una falla no afecta a las demás.
async function generarParaUnArbitro(arbitroId, periodo, fechaInicio, fechaFin) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const designaciones = await repo.buscarDesignacionesPendientes(client, arbitroId, fechaInicio, fechaFin);

    if (designaciones.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, motivo: 'sin_partidos' };
    }

    let montoBruto = 0;
    const detalles = [];

    for (const d of designaciones) {
      const tarifa = await repo.buscarTarifaVigente(client, d.campeonato_id, d.categoria, d.rol_designacion);

      if (!tarifa) {
        await client.query('ROLLBACK');
        const nombreCampeonato = await repo.buscarNombreCampeonato(d.campeonato_id);
        return {
          ok: false,
          motivo: `Falta tarifa de "${d.rol_designacion}" / "${d.categoria}" en "${nombreCampeonato || d.campeonato_id}"`,
        };
      }

      const total = Number(tarifa.monto);
      montoBruto += total;
      detalles.push({ designacionId: d.designacion_id, monto: total });
    }

    const adelantos = await repo.buscarAdelantosPendientes(client, arbitroId);
    const totalAdelantos = adelantos.reduce((acc, a) => acc + Number(a.monto), 0);
    const montoNeto = montoBruto - totalAdelantos;

    const liquidacion = await repo.crearLiquidacion(client, {
      arbitroId, periodo, fechaInicio, fechaFin, montoBruto, totalAdelantos, montoNeto,
    });

    for (const detalle of detalles) {
      await repo.crearDetalleLiquidacion(client, liquidacion.id, detalle.designacionId, detalle.monto);
    }

    for (const adelanto of adelantos) {
      await repo.marcarAdelantoDescontado(client, adelanto.id, liquidacion.id);
    }

    await client.query('COMMIT');

    return {
      ok: true,
      liquidacion,
      partidos_incluidos: detalles.length,
      adelantos_descontados: adelantos.length,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return { ok: false, motivo: 'Error inesperado al generar' };
  } finally {
    client.release();
  }
}

// Genera la liquidación de un solo árbitro.
async function generarLiquidacion({ arbitro_id: arbitroId, periodo, fecha_inicio: fechaInicio, fecha_fin: fechaFin }) {
  if (!arbitroId || !periodo || !fechaInicio || !fechaFin) {
    throw new AppError(400, 'arbitro_id, periodo, fecha_inicio y fecha_fin son obligatorios');
  }
  const errorRango = validarRango(periodo, fechaInicio, fechaFin);
  if (errorRango) {
    throw new AppError(400, errorRango);
  }

  const resultado = await generarParaUnArbitro(arbitroId, periodo, fechaInicio, fechaFin);
  if (!resultado.ok) {
    const mensaje = resultado.motivo === 'sin_partidos'
      ? 'No hay designaciones pendientes de liquidar en ese rango de fechas'
      : resultado.motivo;
    throw new AppError(409, mensaje);
  }
  return resultado;
}

// Genera la liquidación de TODOS los árbitros activos para el mismo rango, en
// un solo paso. Los que no tengan partidos pendientes en ese rango
// simplemente se omiten (no es un error).
async function generarParaTodos({ periodo, fecha_inicio: fechaInicio, fecha_fin: fechaFin }) {
  if (!periodo || !fechaInicio || !fechaFin) {
    throw new AppError(400, 'periodo, fecha_inicio y fecha_fin son obligatorios');
  }
  const errorRango = validarRango(periodo, fechaInicio, fechaFin);
  if (errorRango) {
    throw new AppError(400, errorRango);
  }

  const arbitros = await repo.listarArbitrosActivos();

  const generadas = [];
  const omitidas = [];
  const conError = [];

  for (const a of arbitros) {
    const resultado = await generarParaUnArbitro(a.id, periodo, fechaInicio, fechaFin);
    const nombre = `${a.nombres} ${a.apellidos}`;
    if (resultado.ok) {
      generadas.push({ nombre, partidos: resultado.partidos_incluidos, neto: resultado.liquidacion.monto_neto });
    } else if (resultado.motivo === 'sin_partidos') {
      omitidas.push(nombre);
    } else {
      conError.push({ nombre, motivo: resultado.motivo });
    }
  }

  return { generadas, omitidas, conError };
}

async function listarPorArbitro(arbitroId) {
  return repo.listarPorArbitro(arbitroId);
}

async function listarTodas() {
  return repo.listarTodas();
}

async function obtenerLiquidacion(id) {
  const liquidacion = await repo.obtenerPorId(id);
  if (!liquidacion) {
    throw new AppError(404, 'Liquidación no encontrada');
  }

  const adminTelefono = await repo.obtenerTelefonoAdmin();
  const detalle = await repo.obtenerDetalle(id);
  const adelantosDescontados = await repo.obtenerAdelantosDescontados(id);

  return {
    ...liquidacion,
    admin_telefono: adminTelefono,
    detalle,
    adelantos_descontados: adelantosDescontados,
  };
}

async function marcarComoPagada(id) {
  const liquidacion = await repo.obtenerRespuestaArbitro(id);
  if (!liquidacion) {
    throw new AppError(404, 'Liquidación no encontrada');
  }
  if (liquidacion.respuesta_arbitro !== 'aceptada') {
    throw new AppError(409, 'El árbitro debe confirmar que está de acuerdo antes de marcar la liquidación como pagada');
  }

  const actualizada = await repo.marcarComoPagada(id);
  // Una vez pagada, la conversación ya cumplió su propósito.
  await repo.eliminarMensajes(id);
  return actualizada;
}

// El árbitro dueño de la liquidación confirma que está todo correcto, o marca
// desacuerdo explicando el porqué en una nota.
async function responderLiquidacion(id, usuarioId, respuesta, nota) {
  if (!['aceptada', 'rechazada'].includes(respuesta)) {
    throw new AppError(400, 'respuesta debe ser "aceptada" o "rechazada"');
  }

  const esPropia = await repo.buscarPropiedad(id, usuarioId);
  if (!esPropia) {
    throw new AppError(403, 'Esta liquidación no te pertenece');
  }

  const notaFinal = respuesta === 'rechazada' ? (nota || '').trim() || null : null;
  const actualizada = await repo.actualizarRespuestaArbitro(id, respuesta, notaFinal);

  // Si el árbitro confirma que todo está correcto, ya no hace falta conservar
  // la conversación anterior (si la había).
  if (respuesta === 'aceptada') {
    await repo.eliminarMensajes(id);
  }

  return actualizada;
}

// El administrador contesta la nota de desacuerdo del árbitro.
async function responderComoAdmin(id, respuestaAdmin) {
  if (!respuestaAdmin || !respuestaAdmin.trim()) {
    throw new AppError(400, 'Escribe una respuesta antes de enviarla');
  }

  const actualizada = await repo.actualizarRespuestaAdmin(id, respuestaAdmin.trim());
  if (!actualizada) {
    throw new AppError(404, 'Liquidación no encontrada');
  }
  return actualizada;
}

module.exports = {
  generarLiquidacion,
  generarParaTodos,
  listarPorArbitro,
  listarTodas,
  obtenerLiquidacion,
  marcarComoPagada,
  responderLiquidacion,
  responderComoAdmin,
};
