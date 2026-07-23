const pool = require('../config/db');
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

// POST /api/campeonatos
async function crearCampeonato(req, res) {
  const { nombre, liga, fecha_inicio, fecha_fin } = req.body;

  if (!textoValido(nombre) || !soloLetras(nombre)) {
    return res.status(400).json({ error: 'El nombre solo puede contener letras (sin números ni símbolos)' });
  }
  if (!textoValido(liga) || !soloLetras(liga)) {
    return res.status(400).json({ error: 'La liga solo puede contener letras (sin números ni símbolos)' });
  }
  const errorFechas = validarFechas(fecha_inicio, fecha_fin);
  if (errorFechas) {
    return res.status(400).json({ error: errorFechas });
  }
  const errorFechaPasada = validarFechaInicioNoPasada(fecha_inicio);
  if (errorFechaPasada) {
    return res.status(400).json({ error: errorFechaPasada });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO campeonatos (nombre, liga, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre.trim(), liga.trim(), fecha_inicio, fecha_fin]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el campeonato' });
  }
}

// GET /api/campeonatos
async function listarCampeonatos(req, res) {
  try {
    const resultado = await pool.query(
      'SELECT * FROM campeonatos ORDER BY fecha_inicio DESC'
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar campeonatos' });
  }
}

// PUT /api/campeonatos/:id
// No se valida "fecha no pasada" aquí: un campeonato ya existente puede
// legítimamente haber comenzado en el pasado.
async function actualizarCampeonato(req, res) {
  const { id } = req.params;
  const { nombre, liga, fecha_inicio, fecha_fin } = req.body;

  if (!textoValido(nombre) || !soloLetras(nombre)) {
    return res.status(400).json({ error: 'El nombre solo puede contener letras (sin números ni símbolos)' });
  }
  if (!textoValido(liga) || !soloLetras(liga)) {
    return res.status(400).json({ error: 'La liga solo puede contener letras (sin números ni símbolos)' });
  }
  const errorFechas = validarFechas(fecha_inicio, fecha_fin);
  if (errorFechas) {
    return res.status(400).json({ error: errorFechas });
  }

  try {
    const resultado = await pool.query(
      `UPDATE campeonatos SET nombre = $1, liga = $2, fecha_inicio = $3, fecha_fin = $4
       WHERE id = $5 RETURNING *`,
      [nombre.trim(), liga.trim(), fecha_inicio, fecha_fin, id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Campeonato no encontrado' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el campeonato' });
  }
}

// DELETE /api/campeonatos/:id
async function eliminarCampeonato(req, res) {
  const { id } = req.params;
  try {
    const encuentros = await pool.query('SELECT id FROM encuentros WHERE campeonato_id = $1 LIMIT 1', [id]);
    if (encuentros.rows.length > 0) {
      return res.status(409).json({
        error: 'Este campeonato ya tiene encuentros registrados y no se puede eliminar sin perder ese historial.',
      });
    }

    const resultado = await pool.query('DELETE FROM campeonatos WHERE id = $1 RETURNING id', [id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Campeonato no encontrado' });
    }
    res.json({ mensaje: 'Campeonato eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el campeonato' });
  }
}

module.exports = { crearCampeonato, listarCampeonatos, actualizarCampeonato, eliminarCampeonato };
