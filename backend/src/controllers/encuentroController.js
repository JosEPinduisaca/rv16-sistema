const pool = require('../config/db');
const { textoValido } = require('../utils/validaciones');

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

// POST /api/encuentros
async function crearEncuentro(req, res) {
  const { campeonato_id, categoria, intensidad, fecha, hora, cancha } = req.body;

  if (!campeonato_id || !categoria || !intensidad || !fecha || !hora || !textoValido(cancha, 1)) {
    return res.status(400).json({ error: 'Faltan campos obligatorios o la cancha está vacía' });
  }
  if (!horaValida(hora)) {
    return res.status(400).json({ error: 'La hora no puede ser 00:00, elige una hora real del partido' });
  }
  if (!fechaNoPasada(fecha)) {
    return res.status(400).json({ error: 'La fecha no puede ser anterior al día de hoy' });
  }

  try {
    const duplicado = await pool.query(
      'SELECT id FROM encuentros WHERE fecha = $1 AND hora = $2 AND cancha = $3',
      [fecha, hora, cancha]
    );
    if (duplicado.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un encuentro registrado en esa cancha, fecha y hora' });
    }

    const resultado = await pool.query(
      `INSERT INTO encuentros (campeonato_id, categoria, intensidad, fecha, hora, cancha)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [campeonato_id, categoria, intensidad, fecha, hora, cancha]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el encuentro' });
  }
}

// GET /api/encuentros?estado=programado
async function listarEncuentros(req, res) {
  const { estado } = req.query;
  try {
    const resultado = estado
      ? await pool.query('SELECT * FROM encuentros WHERE estado = $1 ORDER BY fecha_creacion DESC', [estado])
      : await pool.query('SELECT * FROM encuentros ORDER BY fecha_creacion DESC');
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar encuentros' });
  }
}

// GET /api/encuentros/:id
async function obtenerEncuentro(req, res) {
  const { id } = req.params;
  try {
    const encuentro = await pool.query('SELECT * FROM encuentros WHERE id = $1', [id]);
    if (encuentro.rows.length === 0) {
      return res.status(404).json({ error: 'Encuentro no encontrado' });
    }

    const designaciones = await pool.query(`
      SELECT d.id, d.rol_designacion, d.estado, u.nombres, u.apellidos
      FROM designaciones d
      JOIN arbitros a ON a.id = d.arbitro_id
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE d.encuentro_id = $1
    `, [id]);

    res.json({ ...encuentro.rows[0], designaciones: designaciones.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el encuentro' });
  }
}

// GET /api/encuentros/general?fecha=YYYY-MM-DD
// Vista tipo "cartelera": todos los encuentros de una fecha, agrupados por
// campeonato/cancha, con el nombre del árbitro ya designado en cada uno.
// Visible para administrador, directivo y árbitro (es información pública
// del día de partidos, no datos sensibles de un árbitro en particular).
async function listarConDesignaciones(req, res) {
  const { fecha } = req.query;

  try {
    const params = [];
    let filtroFecha = '';
    if (fecha) {
      params.push(fecha);
      filtroFecha = `WHERE e.fecha = $1`;
    }

    const resultado = await pool.query(`
      SELECT
        e.id, e.fecha, e.hora, e.cancha, e.categoria, e.intensidad, e.estado,
        c.id AS campeonato_id, c.nombre AS campeonato_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'designacion_id', d.id,
              'arbitro_id', d.arbitro_id,
              'rol', d.rol_designacion,
              'nombre', u.nombres || ' ' || u.apellidos,
              'estado', d.estado
            )
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) AS designados
      FROM encuentros e
      JOIN campeonatos c ON c.id = e.campeonato_id
      LEFT JOIN designaciones d ON d.encuentro_id = e.id
      LEFT JOIN arbitros a ON a.id = d.arbitro_id
      LEFT JOIN usuarios u ON u.id = a.usuario_id
      ${filtroFecha}
      GROUP BY e.id, c.id, c.nombre
      ORDER BY c.nombre, e.fecha, e.hora
    `, params);

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el cronograma general' });
  }
}

// PUT /api/encuentros/:id
// Permite reprogramar un encuentro (fecha, hora, cancha, categoría, intensidad).
// Los administradores/directivos pueden necesitar mover un partido por lluvia,
// disponibilidad de cancha, etc. No borra las designaciones existentes: si el
// horario cambia, es responsabilidad del usuario revisar que no se generen
// nuevos cruces (el sistema seguirá validando esto en cualquier NUEVA designación).
async function actualizarEncuentro(req, res) {
  const { id } = req.params;
  const { categoria, intensidad, fecha, hora, cancha } = req.body;

  if (hora !== undefined && !horaValida(hora)) {
    return res.status(400).json({ error: 'La hora no puede ser 00:00, elige una hora real del partido' });
  }

  try {
    const actual = await pool.query('SELECT * FROM encuentros WHERE id = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Encuentro no encontrado' });
    }
    const e = actual.rows[0];

    const fechaFinal = fecha ?? e.fecha;
    const horaFinal = hora ?? e.hora;
    const canchaFinal = cancha ?? e.cancha;

    const duplicado = await pool.query(
      'SELECT id FROM encuentros WHERE fecha = $1 AND hora = $2 AND cancha = $3 AND id != $4',
      [fechaFinal, horaFinal, canchaFinal, id]
    );
    if (duplicado.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe otro encuentro registrado en esa cancha, fecha y hora' });
    }

    const resultado = await pool.query(
      `UPDATE encuentros
       SET categoria = $1, intensidad = $2, fecha = $3, hora = $4, cancha = $5
       WHERE id = $6 RETURNING *`,
      [
        categoria ?? e.categoria,
        intensidad ?? e.intensidad,
        fechaFinal,
        horaFinal,
        canchaFinal,
        id,
      ]
    );
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el encuentro' });
  }
}

// DELETE /api/encuentros/:id
// Se rechaza si ya tiene designaciones (primero hay que quitarlas desde
// Designación General), para no perder ese historial por accidente.
async function eliminarEncuentro(req, res) {
  const { id } = req.params;
  try {
    const designaciones = await pool.query(
      'SELECT id FROM designaciones WHERE encuentro_id = $1 LIMIT 1',
      [id]
    );
    if (designaciones.rows.length > 0) {
      return res.status(409).json({
        error: 'Este encuentro ya tiene árbitros designados. Quítalos primero desde "Designación general" antes de eliminarlo.',
      });
    }

    const resultado = await pool.query('DELETE FROM encuentros WHERE id = $1 RETURNING id', [id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Encuentro no encontrado' });
    }
    res.json({ mensaje: 'Encuentro eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el encuentro' });
  }
}

module.exports = {
  crearEncuentro,
  listarEncuentros,
  obtenerEncuentro,
  listarConDesignaciones,
  actualizarEncuentro,
  eliminarEncuentro,
};
