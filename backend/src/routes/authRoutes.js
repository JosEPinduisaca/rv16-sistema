const express = require('express');
const router = express.Router();
const {
  registro,
  login,
  olvidePassword,
  restablecerPassword,
  obtenerPerfilPropio,
  actualizarMiTelefono,
  cambiarPassword,
} = require('../controllers/authController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

// Login y recuperación de contraseña son públicos
router.post('/login', login);
router.post('/olvide-password', olvidePassword);
router.post('/restablecer-password', restablecerPassword);

// Registro solo lo puede hacer un administrador ya autenticado
router.post('/registro', verificarToken, permitirRoles('administrador'), registro);

// Cualquier usuario autenticado puede ver/editar su propia cuenta
router.get('/me', verificarToken, obtenerPerfilPropio);
router.put('/mi-telefono', verificarToken, actualizarMiTelefono);
router.put('/cambiar-password', verificarToken, cambiarPassword);

module.exports = router;
