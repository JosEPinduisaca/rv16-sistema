const pool = require('../config/db');

// Todas las funciones que participan de la transacción de generación reciben
// `db` (un client de pool.connect() dentro de BEGIN/COMMIT, o el pool a
// secas para lecturas sueltas) en vez de usar `pool` directamente.

async function buscarDesignacionesPendientes(db, arbitroId, fechaInicio, fechaFin) {
  const resultado = await db.query(`
    SELECT d.id AS designacion_id, e.campeonato_id, e.categoria, d.rol_designacion
    FROM designaciones d
    JOIN encuentros e ON e.id = d.encuentro_id
    WHERE d.arbitro_id = $1
      AND d.estado = 'publicada'
      AND e.fecha BETWEEN $2 AND $3
      AND d.id NOT IN (SELECT designacion_id FROM detalle_liquidacion)
  `, [arbitroId, fechaInicio, fechaFin]);
  return resultado.rows;
}

async function buscarTarifaVigente(db, campeonatoId, categoria, rolArbitro) {
  const resultado = await db.query(`
    SELECT monto, viatico FROM tarifas
    WHERE campeonato_id = $1 AND categoria = $2 AND rol_arbitro = $3 AND vigente = TRUE
  `, [campeonatoId, categoria, rolArbitro]);
  return resultado.rows[0] || null;
}

async function buscarNombreCampeonato(campeonatoId) {
  const resultado = await pool.query('SELECT nombre FROM campeonatos WHERE id = $1', [campeonatoId]);
  return resultado.rows[0]?.nombre || null;
}

async function buscarAdelantosPendientes(db, arbitroId) {
  const resultado = await db.query(`
    SELECT id, monto FROM adelantos WHERE arbitro_id = $1 AND estado = 'aprobado' AND liquidacion_id IS NULL
  `, [arbitroId]);
  return resultado.rows;
}

async function crearLiquidacion(db, datos) {
  const { arbitroId, periodo, fechaInicio, fechaFin, montoBruto, totalAdelantos, montoNeto } = datos;
  const resultado = await db.query(`
    INSERT INTO liquidaciones (arbitro_id, periodo, fecha_inicio, fecha_fin, monto_bruto, total_adelantos, monto_neto)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
  `, [arbitroId, periodo, fechaInicio, fechaFin, montoBruto, totalAdelantos, montoNeto]);
  return resultado.rows[0];
}

async function crearDetalleLiquidacion(db, liquidacionId, designacionId, monto) {
  await db.query(`
    INSERT INTO detalle_liquidacion (liquidacion_id, designacion_id, monto)
    VALUES ($1, $2, $3)
  `, [liquidacionId, designacionId, monto]);
}

async function marcarAdelantoDescontado(db, adelantoId, liquidacionId) {
  await db.query(`
    UPDATE adelantos SET estado = 'descontado', liquidacion_id = $1 WHERE id = $2
  `, [liquidacionId, adelantoId]);
}

async function listarArbitrosActivos() {
  const resultado = await pool.query(`
    SELECT a.id, u.nombres, u.apellidos
    FROM arbitros a
    JOIN usuarios u ON u.id = a.usuario_id
    WHERE u.activo = TRUE
  `);
  return resultado.rows;
}

async function listarPorArbitro(arbitroId) {
  const resultado = await pool.query(
    `SELECT * FROM liquidaciones WHERE arbitro_id = $1 ORDER BY fecha_generacion DESC`,
    [arbitroId]
  );
  return resultado.rows;
}

async function listarTodas() {
  const resultado = await pool.query(`
    SELECT l.*, u.nombres, u.apellidos
    FROM liquidaciones l
    JOIN arbitros a ON a.id = l.arbitro_id
    JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY u.apellidos ASC, u.nombres ASC, l.periodo ASC, l.fecha_generacion DESC
  `);
  return resultado.rows;
}

async function obtenerPorId(id) {
  const resultado = await pool.query(`
    SELECT l.*, u.nombres, u.apellidos, u.telefono AS arbitro_telefono
    FROM liquidaciones l
    JOIN arbitros a ON a.id = l.arbitro_id
    JOIN usuarios u ON u.id = a.usuario_id
    WHERE l.id = $1
  `, [id]);
  return resultado.rows[0] || null;
}

async function obtenerTelefonoAdmin() {
  const resultado = await pool.query(
    `SELECT telefono FROM usuarios WHERE rol = 'administrador' AND telefono IS NOT NULL LIMIT 1`
  );
  return resultado.rows[0]?.telefono || null;
}

async function obtenerDetalle(liquidacionId) {
  const resultado = await pool.query(`
    SELECT dl.monto, e.fecha, e.hora, e.cancha, e.categoria, d.rol_designacion
    FROM detalle_liquidacion dl
    JOIN designaciones d ON d.id = dl.designacion_id
    JOIN encuentros e ON e.id = d.encuentro_id
    WHERE dl.liquidacion_id = $1
    ORDER BY e.fecha
  `, [liquidacionId]);
  return resultado.rows;
}

async function obtenerAdelantosDescontados(liquidacionId) {
  const resultado = await pool.query(
    'SELECT id, monto, fecha_solicitud FROM adelantos WHERE liquidacion_id = $1',
    [liquidacionId]
  );
  return resultado.rows;
}

async function obtenerRespuestaArbitro(id) {
  const resultado = await pool.query(
    'SELECT respuesta_arbitro FROM liquidaciones WHERE id = $1',
    [id]
  );
  return resultado.rows[0] || null;
}

async function marcarComoPagada(id) {
  const resultado = await pool.query(
    `UPDATE liquidaciones SET estado = 'pagada', fecha_pago = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return resultado.rows[0] || null;
}

async function eliminarMensajes(liquidacionId) {
  await pool.query('DELETE FROM liquidacion_mensajes WHERE liquidacion_id = $1', [liquidacionId]);
}

// Verifica que el usuario dueño de `usuarioId` sea el árbitro de la liquidación `id`.
async function buscarPropiedad(id, usuarioId) {
  const resultado = await pool.query(
    `SELECT l.id FROM liquidaciones l
     JOIN arbitros a ON a.id = l.arbitro_id
     WHERE l.id = $1 AND a.usuario_id = $2`,
    [id, usuarioId]
  );
  return resultado.rows.length > 0;
}

async function actualizarRespuestaArbitro(id, respuesta, nota) {
  const resultado = await pool.query(
    `UPDATE liquidaciones
     SET respuesta_arbitro = $1, nota_arbitro = $2, fecha_respuesta_arbitro = NOW(),
         respuesta_admin = NULL, fecha_respuesta_admin = NULL
     WHERE id = $3 RETURNING *`,
    [respuesta, nota, id]
  );
  return resultado.rows[0] || null;
}

async function actualizarRespuestaAdmin(id, respuestaAdmin) {
  const resultado = await pool.query(
    `UPDATE liquidaciones SET respuesta_admin = $1, fecha_respuesta_admin = NOW() WHERE id = $2 RETURNING *`,
    [respuestaAdmin, id]
  );
  return resultado.rows[0] || null;
}

module.exports = {
  buscarDesignacionesPendientes,
  buscarTarifaVigente,
  buscarNombreCampeonato,
  buscarAdelantosPendientes,
  crearLiquidacion,
  crearDetalleLiquidacion,
  marcarAdelantoDescontado,
  listarArbitrosActivos,
  listarPorArbitro,
  listarTodas,
  obtenerPorId,
  obtenerTelefonoAdmin,
  obtenerDetalle,
  obtenerAdelantosDescontados,
  obtenerRespuestaArbitro,
  marcarComoPagada,
  eliminarMensajes,
  buscarPropiedad,
  actualizarRespuestaArbitro,
  actualizarRespuestaAdmin,
};
