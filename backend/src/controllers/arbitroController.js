const pool = require('../config/db');
const {
  validarCedulaEcuatoriana,
  validarEmail,
  validarTelefono,
  soloLetras,
  textoValido,
} = require('../utils/validaciones');

// GET /api/arbitros/me
// Devuelve el perfil de árbitro asociado al usuario logueado (según el JWT).
// Evita que el frontend tenga que buscar "cuál soy yo" recorriendo la lista completa.
async function obtenerPerfilPropio(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT a.id, u.nombres, u.apellidos, u.email, u.telefono, a.nivel,
             a.penalizacion_activa, a.observaciones, a.fecha_ingreso
      FROM arbitros a
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.usuario_id = $1
    `, [req.usuario.id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Este usuario no tiene un perfil de árbitro asociado' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el perfil propio' });
  }
}

// GET /api/arbitros/:id/disponibilidad
async function listarDisponibilidad(req, res) {
  const { id } = req.params;
  try {
    // Los registros de disponibilidad ya no sirven una vez pasada la fecha:
    // se limpian solos para no acumular historial innecesario.
    await pool.query('DELETE FROM disponibilidad WHERE fecha < CURRENT_DATE');

    const resultado = await pool.query(
      `SELECT id, fecha, disponible, comentario FROM disponibilidad
       WHERE arbitro_id = $1 ORDER BY fecha DESC LIMIT 60`,
      [id]
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar la disponibilidad' });
  }
}

// GET /api/arbitros  (solo administrador/directivo)
async function listarArbitros(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT a.id, u.cedula, u.nombres, u.apellidos, u.email, u.telefono, a.nivel, a.penalizacion_activa, u.activo
      FROM arbitros a
      JOIN usuarios u ON u.id = a.usuario_id
      ORDER BY u.apellidos ASC
    `);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar árbitros' });
  }
}

// PUT /api/arbitros/:id/nivel
// Permite al Directivo o Administrador ascender/reclasificar a un árbitro
// según su desempeño, tal como define el Capítulo I del proyecto.
async function actualizarNivel(req, res) {
  const { id } = req.params;
  const { nivel } = req.body;
  const nivelesValidos = ['formacion', 'con_experiencia', 'nuevo'];

  if (!nivelesValidos.includes(nivel)) {
    return res.status(400).json({ error: 'Nivel inválido' });
  }

  try {
    const resultado = await pool.query(
      'UPDATE arbitros SET nivel = $1 WHERE id = $2 RETURNING id, nivel',
      [nivel, id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el nivel del árbitro' });
  }
}

// GET /api/arbitros/candidatos?encuentro_id=X
// Calcula, para un encuentro específico, qué árbitros son "candidatos recomendados"
// según su nivel de experiencia frente a la intensidad del partido, su disponibilidad
// declarada para esa fecha y que no tengan una penalización activa. Es una recomendación
// visual (resaltado), NO un bloqueo: el administrador conserva la libertad de designar
// a cualquier árbitro, tal como se acordó.
// Calcula, para un encuentro específico, qué árbitros son "candidatos" disponibles:
// - Se EXCLUYEN por completo (no aparecen en la lista) los árbitros que ya tienen
//   otra designación con cruce de horario ese mismo día EN OTRA CANCHA. Si es la
//   misma cancha, no hay cruce real (partidos seguidos en su propia cancha).
// - Se marca como "recomendado" (resaltado visual, no bloqueo) según su nivel frente
//   a la intensidad del partido:
//     * Con experiencia: recomendado para cualquier intensidad (alta, media o baja).
//     * En formación: recomendado para cualquier intensidad.
//     * Nuevo: recomendado SOLO para intensidad baja (recién empieza).
async function listarCandidatos(req, res) {
  const { encuentro_id } = req.query;
  if (!encuentro_id) {
    return res.status(400).json({ error: 'encuentro_id es obligatorio' });
  }

  try {
    const encuentro = await pool.query(
      'SELECT fecha, hora, intensidad, categoria, cancha FROM encuentros WHERE id = $1',
      [encuentro_id]
    );
    if (encuentro.rows.length === 0) {
      return res.status(404).json({ error: 'Encuentro no encontrado' });
    }
    const { fecha, hora, intensidad, cancha } = encuentro.rows[0];

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
    `, [fecha, intensidad, hora, cancha, encuentro_id]);

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al calcular los candidatos' });
  }
}
// "Elimina" (desactiva) o reactiva a un árbitro. No se borra de la base de datos:
// se conserva su historial de designaciones, adelantos y liquidaciones para
// no romper reportes pasados. Un árbitro desactivado no puede iniciar sesión
// (el login filtra por activo = TRUE) ni ser designado a nuevos encuentros.
async function cambiarEstadoArbitro(req, res) {
  const { id } = req.params;
  const { activo } = req.body;

  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'activo debe ser true o false' });
  }

  try {
    const arbitro = await pool.query('SELECT usuario_id FROM arbitros WHERE id = $1', [id]);
    if (arbitro.rows.length === 0) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }

    await pool.query('UPDATE usuarios SET activo = $1 WHERE id = $2', [activo, arbitro.rows[0].usuario_id]);
    res.json({ mensaje: activo ? 'Árbitro reactivado' : 'Árbitro desactivado', arbitro_id: Number(id), activo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el estado del árbitro' });
  }
}

// GET /api/arbitros/:id
async function obtenerArbitro(req, res) {
  const { id } = req.params;
  try {
    const resultado = await pool.query(`
      SELECT a.id, u.nombres, u.apellidos, u.email, u.telefono, a.nivel,
             a.penalizacion_activa, a.observaciones, a.fecha_ingreso
      FROM arbitros a
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.id = $1
    `, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el árbitro' });
  }
}

// PUT /api/arbitros/:id/disponibilidad
// El propio árbitro marca su disponibilidad para una fecha
async function registrarDisponibilidad(req, res) {
  const { id } = req.params; // id de arbitro
  const { fecha, disponible, comentario } = req.body;

  if (!fecha) {
    return res.status(400).json({ error: 'La fecha es obligatoria' });
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (new Date(fecha) < hoy) {
    return res.status(400).json({ error: 'No puedes registrar disponibilidad para una fecha pasada' });
  }

  try {
    // Aprovecha esta escritura para limpiar registros de fechas ya pasadas.
    await pool.query('DELETE FROM disponibilidad WHERE fecha < CURRENT_DATE');

    const resultado = await pool.query(`
      INSERT INTO disponibilidad (arbitro_id, fecha, disponible, comentario)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (arbitro_id, fecha)
      DO UPDATE SET disponible = $3, comentario = $4
      RETURNING *
    `, [id, fecha, disponible, comentario]);

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar disponibilidad' });
  }
}

// PUT /api/arbitros/:id
// Permite al administrador editar los datos personales de un árbitro
// (cédula, nombres, apellidos, email, teléfono). No toca la contraseña.
async function actualizarArbitro(req, res) {
  const { id } = req.params;
  const { cedula, nombres, apellidos, email, telefono } = req.body;

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
    return res.status(400).json({ error: errores.join('. ') });
  }

  try {
    const arbitro = await pool.query('SELECT usuario_id FROM arbitros WHERE id = $1', [id]);
    if (arbitro.rows.length === 0) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }
    const { usuario_id } = arbitro.rows[0];

    const existeCedula = await pool.query(
      'SELECT id FROM usuarios WHERE cedula = $1 AND id != $2', [cedula, usuario_id]
    );
    const existeEmail = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, usuario_id]
    );

    const erroresDuplicado = [];
    if (existeCedula.rows.length > 0) {
      erroresDuplicado.push('Ya existe otro usuario registrado con esa cédula');
    }
    if (existeEmail.rows.length > 0) {
      erroresDuplicado.push('Ya existe otro usuario registrado con ese email');
    }
    if (erroresDuplicado.length > 0) {
      return res.status(409).json({ error: erroresDuplicado.join('. ') });
    }

    const resultado = await pool.query(
      `UPDATE usuarios
       SET cedula = $1, nombres = $2, apellidos = $3, email = $4, telefono = $5
       WHERE id = $6
       RETURNING id, cedula, nombres, apellidos, email, telefono`,
      [cedula, nombres.trim(), apellidos.trim(), email.trim().toLowerCase(), telefono || null, usuario_id]
    );

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el árbitro' });
  }
}

// DELETE /api/arbitros/:id
// Borrado REAL (no desactivación). Solo el administrador puede hacerlo, y solo si
// el árbitro no tiene absolutamente ningún historial vinculado (designaciones,
// adelantos, liquidaciones, disponibilidad). Si tiene aunque sea un registro, se
// rechaza y se sugiere desactivar en su lugar, para no destruir trazabilidad.
// DELETE /api/arbitros/:id
// Por defecto (sin ?forzar=true), es un borrado SEGURO: si el árbitro tiene
// historial, se rechaza y se avisa al frontend con tieneHistorial=true, para que
// muestre la pregunta de qué hacer.
// Con ?forzar=true, borra TODO en cascada: designaciones, adelantos, liquidaciones,
// su detalle y disponibilidad, además del usuario. No hay vuelta atrás.
async function eliminarArbitro(req, res) {
  const { id } = req.params;
  const forzar = req.query.forzar === 'true';

  try {
    const arbitro = await pool.query('SELECT usuario_id FROM arbitros WHERE id = $1', [id]);
    if (arbitro.rows.length === 0) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }
    const { usuario_id } = arbitro.rows[0];

    const [designaciones, adelantos, liquidaciones, disponibilidad] = await Promise.all([
      pool.query('SELECT id, encuentro_id FROM designaciones WHERE arbitro_id = $1', [id]),
      pool.query('SELECT id FROM adelantos WHERE arbitro_id = $1 LIMIT 1', [id]),
      pool.query('SELECT id FROM liquidaciones WHERE arbitro_id = $1 LIMIT 1', [id]),
      pool.query('SELECT id FROM disponibilidad WHERE arbitro_id = $1 LIMIT 1', [id]),
    ]);

    const tieneHistorial =
      designaciones.rows.length > 0 ||
      adelantos.rows.length > 0 ||
      liquidaciones.rows.length > 0 ||
      disponibilidad.rows.length > 0;

    if (tieneHistorial && !forzar) {
      return res.status(409).json({
        error: 'Este árbitro ya tiene historial (designaciones, adelantos, liquidaciones o disponibilidad).',
        tieneHistorial: true,
      });
    }

    if (!tieneHistorial) {
      // Sin historial: borrado simple, el usuario arrastra en cascada a arbitros.
      await pool.query('DELETE FROM usuarios WHERE id = $1', [usuario_id]);
      return res.json({ mensaje: 'Árbitro eliminado correctamente' });
    }

    // Borrado FORZADO: elimina también todo el historial vinculado, en una transacción.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const encuentroIds = designaciones.rows.map((d) => d.encuentro_id);

      await client.query(
        `DELETE FROM detalle_liquidacion WHERE liquidacion_id IN (SELECT id FROM liquidaciones WHERE arbitro_id = $1)`,
        [id]
      );
      await client.query('DELETE FROM adelantos WHERE arbitro_id = $1', [id]);
      await client.query('DELETE FROM liquidaciones WHERE arbitro_id = $1', [id]);
      await client.query('DELETE FROM designaciones WHERE arbitro_id = $1', [id]);
      await client.query('DELETE FROM disponibilidad WHERE arbitro_id = $1', [id]);

      // Los encuentros que se quedaron sin ninguna designación regresan a "programado"
      for (const encuentroId of encuentroIds) {
        const restantes = await client.query(
          'SELECT id FROM designaciones WHERE encuentro_id = $1',
          [encuentroId]
        );
        if (restantes.rows.length === 0) {
          await client.query(`UPDATE encuentros SET estado = 'programado' WHERE id = $1`, [encuentroId]);
        }
      }

      // Borra el usuario (arrastra la fila de arbitros en cascada)
      await client.query('DELETE FROM usuarios WHERE id = $1', [usuario_id]);

      await client.query('COMMIT');
      res.json({ mensaje: 'Árbitro y todo su historial fueron eliminados por completo' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el árbitro' });
  }
}

module.exports = {
  listarArbitros,
  obtenerArbitro,
  registrarDisponibilidad,
  obtenerPerfilPropio,
  listarDisponibilidad,
  cambiarEstadoArbitro,
  actualizarNivel,
  listarCandidatos,
  actualizarArbitro,
  eliminarArbitro,
};
