const express = require('express');
const router = express.Router();
const {
  registro,
  login,
  obtenerPerfilPropio,
  actualizarMiTelefono,
  cambiarPassword,
} = require('../controllers/authController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

// Login es público
router.post('/login', login);

// Registro solo lo puede hacer un administrador ya autenticado
router.post('/registro', verificarToken, permitirRoles('administrador'), registro);

// Cualquier usuario autenticado puede ver/editar su propia cuenta
router.get('/me', verificarToken, obtenerPerfilPropio);
router.put('/mi-telefono', verificarToken, actualizarMiTelefono);
router.put('/cambiar-password', verificarToken, cambiarPassword);

module.exports = router;
