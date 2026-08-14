const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const mensajeRepo = require('../repositories/liquidacionMensajeRepository');
const liquidacionRepo = require('../repositories/liquidacionRepository');
const AppError = require('../utils/AppError');

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

// Verifica que quien hace la petición sea el administrador o el árbitro
// dueño de esta liquidación.
async function verificarAcceso(liquidacionId, usuario) {
  if (usuario.rol === 'administrador') return true;
  return liquidacionRepo.buscarPropiedad(liquidacionId, usuario.id);
}

async function listarMensajes(liquidacionId, usuario) {
  const tieneAcceso = await verificarAcceso(liquidacionId, usuario);
  if (!tieneAcceso) {
    throw new AppError(403, 'No tienes acceso a esta liquidación');
  }
  return mensajeRepo.listarPorLiquidacion(liquidacionId);
}

// mensajeTexto y archivo vienen de multipart/form-data: campo "mensaje"
// (texto, opcional) y "imagen" (archivo, opcional). Debe venir al menos uno.
async function crearMensaje(liquidacionId, usuario, mensajeTexto, archivo) {
  let imagenUrl = null;
  if (archivo) {
    try {
      const nombreJpg = await convertirAJpg(archivo.path);
      imagenUrl = `/uploads/liquidaciones/${nombreJpg}`;
    } catch (error) {
      console.error('Error al convertir la imagen:', error);
      throw new AppError(400, 'No se pudo procesar la imagen. Prueba con otra foto.');
    }
  }

  if ((!mensajeTexto || !mensajeTexto.trim()) && !imagenUrl) {
    throw new AppError(400, 'Escribe un mensaje o adjunta una imagen');
  }

  const tieneAcceso = await verificarAcceso(liquidacionId, usuario);
  if (!tieneAcceso) {
    throw new AppError(403, 'No tienes acceso a esta liquidación');
  }

  const creado = await mensajeRepo.crear(liquidacionId, usuario.id, mensajeTexto?.trim() || null, imagenUrl);
  return mensajeRepo.obtenerConAutor(creado.id);
}

module.exports = { listarMensajes, crearMensaje };
