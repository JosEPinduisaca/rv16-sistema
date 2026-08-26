const pool = require('../config/db');

async function obtenerEncuentroPorId(id) {
  const resultado = await pool.query('SELECT * FROM encuentros WHERE id = $1', [id]);
  return resultado.rows[0] || null;
}

async function obtenerDisponibilidad(arbitroId, fecha) {
  const resultado = await pool.query(
    'SELECT disponible FROM disponibilidad WHERE arbitro_id = $1 AND fecha = $2',
    [arbitroId, fecha]
  );
  return resultado.rows[0] || null;
}

async function obtenerArbitroConUsuario(arbitroId) {
  const resultado = await pool.query(
    `SELECT a.penalizacion_activa, u.activo
     FROM arbitros a JOIN usuarios u ON u.id = a.usuario_id
     WHERE a.id = $1`,
    [arbitroId]
  );
  return resultado.rows[0] || null;
}

// Mismo árbitro, misma fecha, hora dentro de +/- duracionHoras, pero SOLO si
// es en una cancha DISTINTA (varios partidos seguidos en la misma cancha no
// son un cruce real).
async function buscarCruceHorario(arbitroId, fecha, hora, duracionHoras, cancha) {
  const resultado = await pool.query(`
    SELECT e.id, e.hora, e.cancha
    FROM designaciones d
    JOIN encuentros e ON e.id = d.encuentro_id
    WHERE d.arbitro_id = $1
      AND e.fecha = $2
      AND e.estado != 'cancelado'
      AND e.cancha != $5
      AND ABS(EXTRACT(EPOCH FROM (e.hora - $3::time)) / 3600) < $4
  `, [arbitroId, fecha, hora, duracionHoras, cancha]);
  return resultado.rows[0] || null;
}

async function buscarDesignacionExacta(encuentroId, arbitroId) {
  const resultado = await pool.query(
    'SELECT id FROM designaciones WHERE encuentro_id = $1 AND arbitro_id = $2',
    [encuentroId, arbitroId]
  );
  return resultado.rows.length > 0;
}

async function contarOcupadosRol(encuentroId, rolDesignacion) {
  const resultado = await pool.query(
    'SELECT id FROM designaciones WHERE encuentro_id = $1 AND rol_designacion = $2',
    [encuentroId, rolDesignacion]
  );
  return resultado.rows.length;
}

async function buscarTarifaVigente(campeonatoId, categoria, rolArbitro) {
  const resultado = await pool.query(
    `SELECT monto FROM tarifas
     WHERE campeonato_id = $1 AND categoria = $2 AND rol_arbitro = $3 AND vigente = TRUE`,
    [campeonatoId, categoria, rolArbitro]
  );
  return resultado.rows[0] || null;
}

async function insertar(encuentroId, arbitroId, rolDesignacion) {
  const resultado = await pool.query(
    `INSERT INTO designaciones (encuentro_id, arbitro_id, rol_designacion, estado)
     VALUES ($1, $2, $3, 'confirmada') RETURNING *`,
    [encuentroId, arbitroId, rolDesignacion]
  );
  return resultado.rows[0];
}

async function marcarEncuentroDesignado(encuentroId) {
  await pool.query(
    `UPDATE encuentros SET estado = 'designado' WHERE id = $1 AND estado = 'programado'`,
    [encuentroId]
  );
}

async function publicar(id) {
  const resultado = await pool.query(
    `UPDATE designaciones SET estado = 'publicada', fecha_publicacion = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return resultado.rows[0] || null;
}

async function publicarEncuentroDe(designacionId) {
  await pool.query(
    `UPDATE encuentros SET estado = 'publicado'
     WHERE id = (SELECT encuentro_id FROM designaciones WHERE id = $1)`,
    [designacionId]
  );
}

async function listarPorArbitro(arbitroId) {
  const resultado = await pool.query(`
    SELECT d.id, d.rol_designacion, d.estado, e.id AS encuentro_id, e.fecha, e.hora, e.cancha,
           e.categoria, e.intensidad, c.nombre AS campeonato_nombre
    FROM designaciones d
    JOIN encuentros e ON e.id = d.encuentro_id
    JOIN campeonatos c ON c.id = e.campeonato_id
    WHERE d.arbitro_id = $1
    ORDER BY e.fecha ASC, e.hora ASC
  `, [arbitroId]);
  return resultado.rows;
}

async function estaEnLiquidacion(designacionId) {
  const resultado = await pool.query(
    'SELECT id FROM detalle_liquidacion WHERE designacion_id = $1',
    [designacionId]
  );
  return resultado.rows.length > 0;
}

async function obtenerPorId(id) {
  const resultado = await pool.query('SELECT encuentro_id FROM designaciones WHERE id = $1', [id]);
  return resultado.rows[0] || null;
}

async function eliminar(id) {
  await pool.query('DELETE FROM designaciones WHERE id = $1', [id]);
}

async function contarRestantesEnEncuentro(encuentroId) {
  const resultado = await pool.query('SELECT id FROM designaciones WHERE encuentro_id = $1', [encuentroId]);
  return resultado.rows.length;
}

async function volverEncuentroProgramado(encuentroId) {
  await pool.query(`UPDATE encuentros SET estado = 'programado' WHERE id = $1`, [encuentroId]);
}

async function publicarEnBloque(fecha) {
  const params = fecha ? [fecha] : [];
  const filtroFecha = fecha ? 'AND e.fecha = $1' : '';
  const resultado = await pool.query(`
    UPDATE designaciones d SET estado = 'publicada', fecha_publicacion = NOW()
    FROM encuentros e
    WHERE d.encuentro_id = e.id AND d.estado = 'designado' ${filtroFecha}
    RETURNING d.id, d.encuentro_id
  `, params);
  return resultado.rows;
}

async function marcarEncuentrosPublicados(encuentroIds) {
  await pool.query(`UPDATE encuentros SET estado = 'publicado' WHERE id = ANY($1)`, [encuentroIds]);
}

async function despublicarEnBloque(fecha) {
  const params = fecha ? [fecha] : [];
  const filtroFecha = fecha ? 'AND e.fecha = $1' : '';
  const resultado = await pool.query(`
    UPDATE designaciones d SET estado = 'designado', fecha_publicacion = NULL
    FROM encuentros e
    WHERE d.encuentro_id = e.id AND d.estado = 'publicada' ${filtroFecha}
    RETURNING d.id, d.encuentro_id
  `, params);
  return resultado.rows;
}

async function marcarEncuentrosDesignados(encuentroIds) {
  await pool.query(`UPDATE encuentros SET estado = 'designado' WHERE id = ANY($1)`, [encuentroIds]);
}

module.exports = {
  obtenerEncuentroPorId,
  obtenerDisponibilidad,
  obtenerArbitroConUsuario,
  buscarCruceHorario,
  buscarDesignacionExacta,
  contarOcupadosRol,
  buscarTarifaVigente,
  insertar,
  marcarEncuentroDesignado,
  publicar,
  publicarEncuentroDe,
  listarPorArbitro,
  estaEnLiquidacion,
  obtenerPorId,
  eliminar,
  contarRestantesEnEncuentro,
  volverEncuentroProgramado,
  publicarEnBloque,
  marcarEncuentrosPublicados,
  despublicarEnBloque,
  marcarEncuentrosDesignados,
};
