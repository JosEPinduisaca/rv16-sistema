const pool = require('../config/db');

const DURACION_PARTIDO_HORAS = 2; // ventana usada para detectar cruce de horario

// POST /api/designaciones
// Body: { encuentro_id, arbitro_id, rol_designacion }
async function crearDesignacion(req, res) {
  const { encuentro_id, arbitro_id, rol_designacion } = req.body;

  if (!encuentro_id || !arbitro_id || !rol_designacion) {
    return res.status(400).json({ error: 'encuentro_id, arbitro_id y rol_designacion son obligatorios' });
  }

  try {
    // 1. Verificar que el encuentro exista
    const encuentroResult = await pool.query('SELECT * FROM encuentros WHERE id = $1', [encuentro_id]);
    if (encuentroResult.rows.length === 0) {
      return res.status(404).json({ error: 'Encuentro no encontrado' });
    }
    const encuentro = encuentroResult.rows[0];

    // 2. Verificar disponibilidad declarada por el arbitro para esa fecha
    const disponibilidad = await pool.query(
      'SELECT disponible FROM disponibilidad WHERE arbitro_id = $1 AND fecha = $2',
      [arbitro_id, encuentro.fecha]
    );
    if (disponibilidad.rows.length > 0 && disponibilidad.rows[0].disponible === false) {
      return res.status(409).json({ error: 'El árbitro se marcó como no disponible ese día' });
    }

    // 3. Verificar penalizacion activa y que el usuario no esté desactivado
    const arbitroResult = await pool.query(
      `SELECT a.penalizacion_activa, u.activo
       FROM arbitros a JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.id = $1`,
      [arbitro_id]
    );
    if (arbitroResult.rows.length === 0) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }
    if (!arbitroResult.rows[0].activo) {
      return res.status(409).json({ error: 'El árbitro está desactivado y no puede ser designado' });
    }
    if (arbitroResult.rows[0].penalizacion_activa) {
      return res.status(409).json({ error: 'El árbitro tiene una penalización activa y no puede ser designado' });
    }

    // 4. Verificar cruce de horario: mismo arbitro, misma fecha, hora dentro de +/- 2 horas,
    //    pero SOLO si es en una cancha DISTINTA. Si es la misma cancha, no hay cruce real
    //    (es normal que un árbitro haga varios partidos seguidos en su misma cancha).
    const cruce = await pool.query(`
      SELECT e.id, e.hora, e.cancha
      FROM designaciones d
      JOIN encuentros e ON e.id = d.encuentro_id
      WHERE d.arbitro_id = $1
        AND e.fecha = $2
        AND e.estado != 'cancelado'
        AND e.cancha != $5
        AND ABS(EXTRACT(EPOCH FROM (e.hora - $3::time)) / 3600) < $4
    `, [arbitro_id, encuentro.fecha, encuentro.hora, DURACION_PARTIDO_HORAS, encuentro.cancha]);

    if (cruce.rows.length > 0) {
      return res.status(409).json({
        error: 'El árbitro ya tiene una designación que se cruza de horario ese día',
        conflicto: cruce.rows[0],
      });
    }

    // 5. Verificar que no exista ya esa combinación exacta (encuentro + arbitro)
    const yaDesignado = await pool.query(
      'SELECT id FROM designaciones WHERE encuentro_id = $1 AND arbitro_id = $2',
      [encuentro_id, arbitro_id]
    );
    if (yaDesignado.rows.length > 0) {
      return res.status(409).json({ error: 'Este árbitro ya está designado en este encuentro' });
    }

    // 5b. Verificar el cupo de ese rol: 1 solo central, hasta 2 asistentes
    //     (para las finales que requieren tripleta).
    const limiteRol = rol_designacion === 'central' ? 1 : 2;
    const ocupados = await pool.query(
      'SELECT id FROM designaciones WHERE encuentro_id = $1 AND rol_designacion = $2',
      [encuentro_id, rol_designacion]
    );
    if (ocupados.rows.length >= limiteRol) {
      return res.status(409).json({
        error: rol_designacion === 'central'
          ? 'Ya existe un árbitro designado como central para este encuentro. Quítalo primero si deseas reemplazarlo.'
          : 'Ya hay 2 asistentes designados para este encuentro (el máximo permitido).',
      });
    }

    // 6. Verificar que exista tarifa configurada para ese campeonato/categoria/rol
    //    (la intensidad NO afecta el pago, solo se usa para recomendar candidatos)
    const tarifa = await pool.query(
      `SELECT monto, viatico FROM tarifas
       WHERE campeonato_id = $1 AND categoria = $2 AND rol_arbitro = $3 AND vigente = TRUE`,
      [encuentro.campeonato_id, encuentro.categoria, rol_designacion]
    );
    if (tarifa.rows.length === 0) {
      return res.status(409).json({
        error: 'No existe una tarifa configurada para esta combinación de campeonato, categoría y rol',
      });
    }

    // 7. Insertar la designacion
    const nuevaDesignacion = await pool.query(
      `INSERT INTO designaciones (encuentro_id, arbitro_id, rol_designacion, estado)
       VALUES ($1, $2, $3, 'confirmada') RETURNING *`,
      [encuentro_id, arbitro_id, rol_designacion]
    );

    // Actualiza el estado del encuentro a "designado"
    await pool.query(
      `UPDATE encuentros SET estado = 'designado' WHERE id = $1 AND estado = 'programado'`,
      [encuentro_id]
    );

    res.status(201).json({
      designacion: nuevaDesignacion.rows[0],
      pago_estimado: {
        monto: tarifa.rows[0].monto,
        viatico: tarifa.rows[0].viatico,
        total: Number(tarifa.rows[0].monto) + Number(tarifa.rows[0].viatico),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la designación' });
  }
}

// PUT /api/designaciones/:id/publicar
async function publicarDesignacion(req, res) {
  const { id } = req.params;
  try {
    const resultado = await pool.query(
      `UPDATE designaciones SET estado = 'publicada', fecha_publicacion = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Designación no encontrada' });
    }

    await pool.query(
      `UPDATE encuentros SET estado = 'publicado'
       WHERE id = (SELECT encuentro_id FROM designaciones WHERE id = $1)`,
      [id]
    );

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al publicar la designación' });
  }
}

// GET /api/designaciones/arbitro/:arbitroId
async function listarPorArbitro(req, res) {
  const { arbitroId } = req.params;
  try {
    const resultado = await pool.query(`
      SELECT d.id, d.rol_designacion, d.estado, e.fecha, e.hora, e.cancha, e.categoria
      FROM designaciones d
      JOIN encuentros e ON e.id = d.encuentro_id
      WHERE d.arbitro_id = $1
      ORDER BY e.fecha DESC, e.hora DESC
    `, [arbitroId]);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar designaciones del árbitro' });
  }
}

// DELETE /api/designaciones/:id
// Permite corregir una designación ya realizada (incluso publicada). No se puede
// eliminar si ya forma parte de una liquidación pagada/generada, para no alterar
// un historial financiero ya calculado. Si el encuentro se queda sin ninguna
// designación, su estado regresa a "programado".
async function eliminarDesignacion(req, res) {
  const { id } = req.params;

  try {
    const yaLiquidada = await pool.query(
      'SELECT id FROM detalle_liquidacion WHERE designacion_id = $1',
      [id]
    );
    if (yaLiquidada.rows.length > 0) {
      return res.status(409).json({
        error: 'Esta designación ya forma parte de una liquidación y no se puede eliminar',
      });
    }

    const designacion = await pool.query('SELECT encuentro_id FROM designaciones WHERE id = $1', [id]);
    if (designacion.rows.length === 0) {
      return res.status(404).json({ error: 'Designación no encontrada' });
    }
    const { encuentro_id } = designacion.rows[0];

    await pool.query('DELETE FROM designaciones WHERE id = $1', [id]);

    const restantes = await pool.query(
      'SELECT id FROM designaciones WHERE encuentro_id = $1',
      [encuentro_id]
    );
    if (restantes.rows.length === 0) {
      await pool.query(`UPDATE encuentros SET estado = 'programado' WHERE id = $1`, [encuentro_id]);
    }

    res.json({ mensaje: 'Designación eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la designación' });
  }
}

module.exports = { crearDesignacion, publicarDesignacion, listarPorArbitro, eliminarDesignacion };
