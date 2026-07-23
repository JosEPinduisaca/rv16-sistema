const pool = require('../config/db');

function validarRango(periodo, fecha_inicio, fecha_fin) {
  if (!['quincenal', 'mensual'].includes(periodo)) {
    return 'periodo debe ser quincenal o mensual';
  }
  const dias = Math.round((new Date(fecha_fin) - new Date(fecha_inicio)) / (1000 * 60 * 60 * 24)) + 1;
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
async function generarParaUnArbitro(arbitro_id, periodo, fecha_inicio, fecha_fin) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const designaciones = await client.query(`
      SELECT d.id AS designacion_id, e.campeonato_id, e.categoria, d.rol_designacion
      FROM designaciones d
      JOIN encuentros e ON e.id = d.encuentro_id
      WHERE d.arbitro_id = $1
        AND d.estado = 'publicada'
        AND e.fecha BETWEEN $2 AND $3
        AND d.id NOT IN (SELECT designacion_id FROM detalle_liquidacion)
    `, [arbitro_id, fecha_inicio, fecha_fin]);

    if (designaciones.rows.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, motivo: 'sin_partidos' };
    }

    let montoBruto = 0;
    const detalles = [];

    for (const d of designaciones.rows) {
      const tarifa = await client.query(`
        SELECT monto, viatico FROM tarifas
        WHERE campeonato_id = $1 AND categoria = $2 AND rol_arbitro = $3 AND vigente = TRUE
      `, [d.campeonato_id, d.categoria, d.rol_designacion]);

      if (tarifa.rows.length === 0) {
        await client.query('ROLLBACK');
        const campeonato = await pool.query('SELECT nombre FROM campeonatos WHERE id = $1', [d.campeonato_id]);
        return {
          ok: false,
          motivo: `Falta tarifa de "${d.rol_designacion}" / "${d.categoria}" en "${campeonato.rows[0]?.nombre || d.campeonato_id}"`,
        };
      }

      const total = Number(tarifa.rows[0].monto) + Number(tarifa.rows[0].viatico);
      montoBruto += total;
      detalles.push({ designacion_id: d.designacion_id, monto: total });
    }

    const adelantos = await client.query(`
      SELECT id, monto FROM adelantos WHERE arbitro_id = $1 AND estado = 'aprobado' AND liquidacion_id IS NULL
    `, [arbitro_id]);

    const totalAdelantos = adelantos.rows.reduce((acc, a) => acc + Number(a.monto), 0);
    const montoNeto = montoBruto - totalAdelantos;

    const liquidacion = await client.query(`
      INSERT INTO liquidaciones (arbitro_id, periodo, fecha_inicio, fecha_fin, monto_bruto, total_adelantos, monto_neto)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [arbitro_id, periodo, fecha_inicio, fecha_fin, montoBruto, totalAdelantos, montoNeto]);

    const liquidacionId = liquidacion.rows[0].id;

    for (const detalle of detalles) {
      await client.query(`
        INSERT INTO detalle_liquidacion (liquidacion_id, designacion_id, monto)
        VALUES ($1, $2, $3)
      `, [liquidacionId, detalle.designacion_id, detalle.monto]);
    }

    for (const adelanto of adelantos.rows) {
      await client.query(`
        UPDATE adelantos SET estado = 'descontado', liquidacion_id = $1 WHERE id = $2
      `, [liquidacionId, adelanto.id]);
    }

    await client.query('COMMIT');

    return {
      ok: true,
      liquidacion: liquidacion.rows[0],
      partidos_incluidos: detalles.length,
      adelantos_descontados: adelantos.rows.length,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return { ok: false, motivo: 'Error inesperado al generar' };
  } finally {
    client.release();
  }
}

// POST /api/liquidaciones/generar
// Genera la liquidación de un solo árbitro.
async function generarLiquidacion(req, res) {
  const { arbitro_id, periodo, fecha_inicio, fecha_fin } = req.body;

  if (!arbitro_id || !periodo || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'arbitro_id, periodo, fecha_inicio y fecha_fin son obligatorios' });
  }
  const errorRango = validarRango(periodo, fecha_inicio, fecha_fin);
  if (errorRango) {
    return res.status(400).json({ error: errorRango });
  }

  const resultado = await generarParaUnArbitro(arbitro_id, periodo, fecha_inicio, fecha_fin);
  if (!resultado.ok) {
    const mensaje = resultado.motivo === 'sin_partidos'
      ? 'No hay designaciones pendientes de liquidar en ese rango de fechas'
      : resultado.motivo;
    return res.status(409).json({ error: mensaje });
  }
  res.status(201).json(resultado);
}

// POST /api/liquidaciones/generar-todos
// Genera la liquidación de TODOS los árbitros activos para el mismo rango,
// en un solo paso. Los que no tengan partidos pendientes en ese rango
// simplemente se omiten (no es un error).
async function generarParaTodos(req, res) {
  const { periodo, fecha_inicio, fecha_fin } = req.body;

  if (!periodo || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'periodo, fecha_inicio y fecha_fin son obligatorios' });
  }
  const errorRango = validarRango(periodo, fecha_inicio, fecha_fin);
  if (errorRango) {
    return res.status(400).json({ error: errorRango });
  }

  try {
    const arbitros = await pool.query(`
      SELECT a.id, u.nombres, u.apellidos
      FROM arbitros a
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE u.activo = TRUE
    `);

    const generadas = [];
    const omitidas = [];
    const conError = [];

    for (const a of arbitros.rows) {
      const resultado = await generarParaUnArbitro(a.id, periodo, fecha_inicio, fecha_fin);
      const nombre = `${a.nombres} ${a.apellidos}`;
      if (resultado.ok) {
        generadas.push({ nombre, partidos: resultado.partidos_incluidos, neto: resultado.liquidacion.monto_neto });
      } else if (resultado.motivo === 'sin_partidos') {
        omitidas.push(nombre);
      } else {
        conError.push({ nombre, motivo: resultado.motivo });
      }
    }

    res.json({ generadas, omitidas, conError });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar las liquidaciones' });
  }
}

// GET /api/liquidaciones/arbitro/:arbitroId
async function listarPorArbitro(req, res) {
  const { arbitroId } = req.params;
  try {
    const resultado = await pool.query(
      `SELECT * FROM liquidaciones WHERE arbitro_id = $1 ORDER BY fecha_generacion DESC`,
      [arbitroId]
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar liquidaciones' });
  }
}

// GET /api/liquidaciones/:id
async function obtenerLiquidacion(req, res) {
  const { id } = req.params;
  try {
    const liquidacion = await pool.query(`
      SELECT l.*, u.nombres, u.apellidos, u.telefono AS arbitro_telefono
      FROM liquidaciones l
      JOIN arbitros a ON a.id = l.arbitro_id
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE l.id = $1
    `, [id]);
    if (liquidacion.rows.length === 0) {
      return res.status(404).json({ error: 'Liquidación no encontrada' });
    }

    const admin = await pool.query(
      `SELECT telefono FROM usuarios WHERE rol = 'administrador' AND telefono IS NOT NULL LIMIT 1`
    );

    const detalle = await pool.query(`
      SELECT dl.monto, e.fecha, e.hora, e.cancha, e.categoria, d.rol_designacion
      FROM detalle_liquidacion dl
      JOIN designaciones d ON d.id = dl.designacion_id
      JOIN encuentros e ON e.id = d.encuentro_id
      WHERE dl.liquidacion_id = $1
      ORDER BY e.fecha
    `, [id]);

    const adelantosDescontados = await pool.query(
      'SELECT id, monto, fecha_solicitud FROM adelantos WHERE liquidacion_id = $1',
      [id]
    );

    res.json({
      ...liquidacion.rows[0],
      admin_telefono: admin.rows[0]?.telefono || null,
      detalle: detalle.rows,
      adelantos_descontados: adelantosDescontados.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la liquidación' });
  }
}

// PUT /api/liquidaciones/:id/pagar
async function marcarComoPagada(req, res) {
  const { id } = req.params;
  try {
    const resultado = await pool.query(
      `UPDATE liquidaciones SET estado = 'pagada', fecha_pago = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Liquidación no encontrada' });
    }
    // Una vez pagada, la conversación ya cumplió su propósito.
    await pool.query('DELETE FROM liquidacion_mensajes WHERE liquidacion_id = $1', [id]);
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al marcar la liquidación como pagada' });
  }
}

// GET /api/liquidaciones
async function listarTodas(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT l.*, u.nombres, u.apellidos
      FROM liquidaciones l
      JOIN arbitros a ON a.id = l.arbitro_id
      JOIN usuarios u ON u.id = a.usuario_id
      ORDER BY u.apellidos ASC, u.nombres ASC, l.periodo ASC, l.fecha_generacion DESC
    `);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar las liquidaciones' });
  }
}

// PUT /api/liquidaciones/:id/responder
// El árbitro dueño de la liquidación confirma que está todo correcto, o marca
// desacuerdo explicando el porqué en una nota.
async function responderLiquidacion(req, res) {
  const { id } = req.params;
  const { respuesta, nota } = req.body;

  if (!['aceptada', 'rechazada'].includes(respuesta)) {
    return res.status(400).json({ error: 'respuesta debe ser "aceptada" o "rechazada"' });
  }

  try {
    const liquidacion = await pool.query(
      `SELECT l.id FROM liquidaciones l
       JOIN arbitros a ON a.id = l.arbitro_id
       WHERE l.id = $1 AND a.usuario_id = $2`,
      [id, req.usuario.id]
    );
    if (liquidacion.rows.length === 0) {
      return res.status(403).json({ error: 'Esta liquidación no te pertenece' });
    }

    const resultado = await pool.query(
      `UPDATE liquidaciones
       SET respuesta_arbitro = $1, nota_arbitro = $2, fecha_respuesta_arbitro = NOW(),
           respuesta_admin = NULL, fecha_respuesta_admin = NULL
       WHERE id = $3 RETURNING *`,
      [respuesta, respuesta === 'rechazada' ? (nota || '').trim() || null : null, id]
    );

    // Si el árbitro confirma que todo está correcto, ya no hace falta conservar
    // la conversación anterior (si la había).
    if (respuesta === 'aceptada') {
      await pool.query('DELETE FROM liquidacion_mensajes WHERE liquidacion_id = $1', [id]);
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar tu respuesta' });
  }
}

// PUT /api/liquidaciones/:id/responder-admin
// El administrador contesta la nota de desacuerdo del árbitro.
async function responderComoAdmin(req, res) {
  const { id } = req.params;
  const { respuesta_admin } = req.body;

  if (!respuesta_admin || !respuesta_admin.trim()) {
    return res.status(400).json({ error: 'Escribe una respuesta antes de enviarla' });
  }

  try {
    const resultado = await pool.query(
      `UPDATE liquidaciones SET respuesta_admin = $1, fecha_respuesta_admin = NOW() WHERE id = $2 RETURNING *`,
      [respuesta_admin.trim(), id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Liquidación no encontrada' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar tu respuesta' });
  }
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
