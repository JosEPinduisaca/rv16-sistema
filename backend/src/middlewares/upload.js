const multer = require('multer');
const path = require('path');
const fs = require('fs');

const carpetaDestino = path.join(__dirname, '..', '..', 'uploads', 'liquidaciones');
fs.mkdirSync(carpetaDestino, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, carpetaDestino),
  filename: (req, file, cb) => {
    const sufijo = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${sufijo}${path.extname(file.originalname)}`);
  },
});

const EXTENSIONES_IMAGEN = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tiff'];

function filtroImagen(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  const pareceImagen = file.mimetype.startsWith('image/') || EXTENSIONES_IMAGEN.includes(extension);
  if (!pareceImagen) {
    return cb(new Error('Solo se permiten archivos de imagen'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: filtroImagen,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});

module.exports = upload;
