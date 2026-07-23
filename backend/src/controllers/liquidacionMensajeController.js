const pool = require('../config/db');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Verifica que quien hace la petición sea el administrador o el árbitro
// dueño de esta liquidación. Devuelve null si no tiene acceso.
async function verificarAcceso(liquidacionId, usuario) {
  if (usuario.rol === 'administrador') return true;
  const resultado = await pool.query(
    `SELECT l.id FROM liquidaciones l
     JOIN arbitros a ON a.id = l.arbitro_id
     WHERE l.id = $1 AND a.usuario_id = $2`,
    [liquidacionId, usuario.id]
  );
  return resultado.rows.length > 0;
}

// Convierte CUALQUIER imagen recibida (HEIC de iPhone, WEBP, PNG, etc.) a JPG.
// Así siempre queda en un formato que se puede ver en cualquier navegador,
// sin importar de qué celular haya salido la foto original.
async function convertirAJpg(rutaOriginal) {
  const carpeta = path.dirname(rutaOriginal);
  const nombreJpg = `${path.basename(rutaOriginal, path.extname(rutaOriginal))}.jpg`;
  const rutaJpg = path.join(carpeta, nombreJpg);

  await sharp(rutaOriginal).rotate().jpeg({ quality: 85 }).toFile(rutaJpg);

  // Si el original no era ya un .jpg, lo borramos (ya no hace falta)
  if (rutaOriginal !== rutaJpg) {
    fs.unlink(rutaOriginal, () => {});
  }

  return nombreJpg;
}

// GET /api/liquidaciones/:id/mensajes
async function listarMensajes(req, res) {
  const { id } = req.params;
  try {
    const tieneAcceso = await verificarAcceso(id, req.usuario);
    if (!tieneAcceso) {
      return res.status(403).json({ error: 'No tienes acceso a esta liquidación' });
    }

    const resultado = await pool.query(
      `SELECT m.*, u.nombres, u.apellidos, u.rol AS autor_rol
       FROM liquidacion_mensajes m
       JOIN usuarios u ON u.id = m.autor_id
       WHERE m.liquidacion_id = $1
       ORDER BY m.fecha_creacion ASC`,
      [id]
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar los mensajes' });
  }
}

// POST /api/liquidaciones/:id/mensajes
// multipart/form-data: campo "mensaje" (texto, opcional) y "imagen" (archivo, opcional).
// Debe venir al menos uno de los dos.
async function crearMensaje(req, res) {
  const { id } = req.params;
  const { mensaje } = req.body;

  let imagen_url = null;
  try {
    if (req.file) {
      const nombreJpg = await convertirAJpg(req.file.path);
      imagen_url = `/uploads/liquidaciones/${nombreJpg}`;
    }
  } catch (error) {
    console.error('Error al convertir la imagen:', error);
    return res.status(400).json({ error: 'No se pudo procesar la imagen. Prueba con otra foto.' });
  }

  if ((!mensaje || !mensaje.trim()) && !imagen_url) {
    return res.status(400).json({ error: 'Escribe un mensaje o adjunta una imagen' });
  }

  try {
    const tieneAcceso = await verificarAcceso(id, req.usuario);
    if (!tieneAcceso) {
      return res.status(403).json({ error: 'No tienes acceso a esta liquidación' });
    }

    const resultado = await pool.query(
      `INSERT INTO liquidacion_mensajes (liquidacion_id, autor_id, mensaje, imagen_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, req.usuario.id, mensaje?.trim() || null, imagen_url]
    );

    const conAutor = await pool.query(
      `SELECT m.*, u.nombres, u.apellidos, u.rol AS autor_rol
       FROM liquidacion_mensajes m JOIN usuarios u ON u.id = m.autor_id
       WHERE m.id = $1`,
      [resultado.rows[0].id]
    );

    res.status(201).json(conAutor.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar el mensaje' });
  }
}

module.exports = { listarMensajes, crearMensaje };
