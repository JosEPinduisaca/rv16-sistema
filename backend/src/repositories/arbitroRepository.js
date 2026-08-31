const pool = require('../config/db');

// Las funciones que participan del borrado forzado en transacción reciben
// `db` (un client de pool.connect() dentro de BEGIN/COMMIT, o el pool a
// secas si se usan fuera de una transacción) como primer parámetro.

async function obtenerPerfilPorUsuarioId(usuarioId) {
  const resultado = await pool.query(`
    SELECT a.id, u.nombres, u.apellidos, u.email, u.telefono, a.nivel,
           a.penalizacion_activa, a.observaciones, a.fecha_ingreso
    FROM arbitros a
    JOIN usuarios u ON u.id = a.usuario_id
    WHERE a.usuario_id = $1
  `, [usuarioId]);
  return resultado.rows[0] || null;
}

async function limpiarDisponibilidadPasada() {
  // Los registros de disponibilidad ya no sirven una vez pasada la fecha:
  // se limpian solos para no acumular historial innecesario.
  await pool.query('DELETE FROM disponibilidad WHERE fecha < CURRENT_DATE');
}

async function listarDisponibilidadPorArbitro(arbitroId) {
  const resultado = await pool.query(
    `SELECT id, fecha, disponible, comentario FROM disponibilidad
     WHERE arbitro_id = $1 ORDER BY fecha DESC LIMIT 60`,
    [arbitroId]
  );
  return resultado.rows;
}

async function listarArbitros() {
  const resultado = await pool.query(`
    SELECT a.id, u.cedula, u.nombres, u.apellidos, u.email, u.telefono, a.nivel, a.penalizacion_activa, u.activo
    FROM arbitros a
    JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY u.apellidos ASC
  `);
  return resultado.rows;
}

async function actualizarNivel(id, nivel) {
  const resultado = await pool.query(
    'UPDATE arbitros SET nivel = $1 WHERE id = $2 RETURNING id, nivel',
    [nivel, id]
  );
  return resultado.rows[0] || null;
}

async function obtenerEncuentroParaCandidatos(encuentroId) {
  const resultado = await pool.query(
    'SELECT fecha, hora, intensidad, categoria, cancha FROM encuentros WHERE id = $1',
    [encuentroId]
  );
  return resultado.rows[0] || null;
}

// Calcula, para un encuentro específico, qué árbitros son "candidatos" disponibles:
// - Se EXCLUYEN por completo los árbitros que ya tienen otra designación con cruce
//   de horario ese mismo día EN OTRA CANCHA (misma cancha = sin cruce real).
// - Se marca "recomendado" (resaltado visual, no bloqueo) según su nivel frente a
//   la intensidad del partido: con experiencia/formación siempre; nuevo solo baja.
async function listarCandidatos({ fecha, hora, intensidad, cancha, encuentroId }) {
  const resultado = await pool.query(`
    SELECT
      a.id, u.nombres, u.apellidos, a.nivel, a.penalizacion_activa,
      COALESCE(d.disponible, TRUE) AS disponible,
      d.comentario AS comentario_disponibilidad,
      (
        NOT a.penalizacion_activa
        AND COALESCE(d.disponible, TRUE)
        AND (
          a.nivel = 'con_experiencia'
          OR a.nivel = 'formacion'
          OR (a.nivel = 'nuevo' AND $2::intensidad_partido = 'baja')
        )
      ) AS recomendado
    FROM arbitros a
    JOIN usuarios u ON u.id = a.usuario_id
    LEFT JOIN disponibilidad d ON d.arbitro_id = a.id AND d.fecha = $1::date
    WHERE u.activo = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM designaciones d3
        WHERE d3.arbitro_id = a.id AND d3.encuentro_id = $5
      )
      AND NOT EXISTS (
        SELECT 1 FROM designaciones d2
        JOIN encuentros e2 ON e2.id = d2.encuentro_id
        WHERE d2.arbitro_id = a.id
          AND e2.fecha = $1::date
          AND e2.estado != 'cancelado'
          AND e2.cancha != $4
          AND ABS(EXTRACT(EPOCH FROM (e2.hora - $3::time)) / 3600) < 2
      )
    ORDER BY
      recomendado DESC,
      CASE a.nivel
        WHEN 'con_experiencia' THEN 1
        WHEN 'formacion' THEN 2
        WHEN 'nuevo' THEN 3
      END,
      u.apellidos ASC
  `, [fecha, intensidad, hora, cancha, encuentroId]);
  return resultado.rows;
}

async function obtenerUsuarioIdPorArbitro(id) {
  const resultado = await pool.query('SELECT usuario_id FROM arbitros WHERE id = $1', [id]);
  return resultado.rows[0]?.usuario_id || null;
}

async function actualizarActivoUsuario(usuarioId, activo) {
  await pool.query('UPDATE usuarios SET activo = $1 WHERE id = $2', [activo, usuarioId]);
}

async function obtenerArbitroPorId(id) {
  const resultado = await pool.query(`
    SELECT a.id, u.nombres, u.apellidos, u.email, u.telefono, a.nivel,
           a.penalizacion_activa, a.observaciones, a.fecha_ingreso
    FROM arbitros a
    JOIN usuarios u ON u.id = a.usuario_id
    WHERE a.id = $1
  `, [id]);
  return resultado.rows[0] || null;
}

async function upsertDisponibilidad(arbitroId, fecha, disponible, comentario) {
  const resultado = await pool.query(`
    INSERT INTO disponibilidad (arbitro_id, fecha, disponible, comentario)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (arbitro_id, fecha)
    DO UPDATE SET disponible = $3, comentario = $4
    RETURNING *
  `, [arbitroId, fecha, disponible, comentario]);
  return resultado.rows[0];
}

async function buscarDuplicadoCedula(cedula, usuarioId) {
  const resultado = await pool.query('SELECT id FROM usuarios WHERE cedula = $1 AND id != $2', [cedula, usuarioId]);
  return resultado.rows.length > 0;
}

async function buscarDuplicadoEmail(email, usuarioId) {
  const resultado = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, usuarioId]);
  return resultado.rows.length > 0;
}

async function actualizarDatosUsuario(usuarioId, datos) {
  const { cedula, nombres, apellidos, email, telefono } = datos;
  const resultado = await pool.query(
    `UPDATE usuarios
     SET cedula = $1, nombres = $2, apellidos = $3, email = $4, telefono = $5
     WHERE id = $6
     RETURNING id, cedula, nombres, apellidos, email, telefono`,
    [cedula, nombres, apellidos, email, telefono, usuarioId]
  );
  return resultado.rows[0];
}

async function buscarDesignacionesDeArbitro(arbitroId) {
  const resultado = await pool.query('SELECT id, encuentro_id FROM designaciones WHERE arbitro_id = $1', [arbitroId]);
  return resultado.rows;
}

async function buscarAdelantoDeArbitro(arbitroId) {
  const resultado = await pool.query('SELECT id FROM adelantos WHERE arbitro_id = $1 LIMIT 1', [arbitroId]);
  return resultado.rows;
}

async function buscarLiquidacionDeArbitro(arbitroId) {
  const resultado = await pool.query('SELECT id FROM liquidaciones WHERE arbitro_id = $1 LIMIT 1', [arbitroId]);
  return resultado.rows;
}

async function buscarDisponibilidadDeArbitro(arbitroId) {
  const resultado = await pool.query('SELECT id FROM disponibilidad WHERE arbitro_id = $1 LIMIT 1', [arbitroId]);
  return resultado.rows;
}

async function eliminarUsuario(db, usuarioId) {
  await db.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);
}

async function eliminarDetalleLiquidacionDeArbitro(client, arbitroId) {
  await client.query(
    `DELETE FROM detalle_liquidacion WHERE liquidacion_id IN (SELECT id FROM liquidaciones WHERE arbitro_id = $1)`,
    [arbitroId]
  );
}

async function eliminarMensajesDeLiquidacionesDeArbitro(client, arbitroId) {
  await client.query(
    `DELETE FROM liquidacion_mensajes WHERE liquidacion_id IN (SELECT id FROM liquidaciones WHERE arbitro_id = $1)`,
    [arbitroId]
  );
}

async function eliminarAdelantosDeArbitro(client, arbitroId) {
  await client.query('DELETE FROM adelantos WHERE arbitro_id = $1', [arbitroId]);
}

async function eliminarLiquidacionesDeArbitro(client, arbitroId) {
  await client.query('DELETE FROM liquidaciones WHERE arbitro_id = $1', [arbitroId]);
}

async function eliminarDesignacionesDeArbitro(client, arbitroId) {
  await client.query('DELETE FROM designaciones WHERE arbitro_id = $1', [arbitroId]);
}

async function eliminarDisponibilidadDeArbitro(client, arbitroId) {
  await client.query('DELETE FROM disponibilidad WHERE arbitro_id = $1', [arbitroId]);
}

module.exports = {
  obtenerPerfilPorUsuarioId,
  limpiarDisponibilidadPasada,
  listarDisponibilidadPorArbitro,
  listarArbitros,
  actualizarNivel,
  obtenerEncuentroParaCandidatos,
  listarCandidatos,
  obtenerUsuarioIdPorArbitro,
  actualizarActivoUsuario,
  obtenerArbitroPorId,
  upsertDisponibilidad,
  buscarDuplicadoCedula,
  buscarDuplicadoEmail,
  actualizarDatosUsuario,
  buscarDesignacionesDeArbitro,
  buscarAdelantoDeArbitro,
  buscarLiquidacionDeArbitro,
  buscarDisponibilidadDeArbitro,
  eliminarUsuario,
  eliminarDetalleLiquidacionDeArbitro,
  eliminarMensajesDeLiquidacionesDeArbitro,
  eliminarAdelantosDeArbitro,
  eliminarLiquidacionesDeArbitro,
  eliminarDesignacionesDeArbitro,
  eliminarDisponibilidadDeArbitro,
};
