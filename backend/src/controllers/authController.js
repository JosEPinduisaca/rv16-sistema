const authService = require('../services/authService');
const manejarError = require('../utils/manejarError');

// POST /api/auth/registro
async function registro(req, res) {
  try {
    const resultado = await authService.registro(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al crear el usuario');
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const resultado = await authService.login(req.body);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al iniciar sesión');
  }
}

// POST /api/auth/olvide-password
async function olvidePassword(req, res) {
  try {
    const resultado = await authService.olvidePassword(req.body);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al procesar la solicitud');
  }
}

// POST /api/auth/restablecer-password
async function restablecerPassword(req, res) {
  try {
    const resultado = await authService.restablecerPassword(req.body);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al restablecer la contraseña');
  }
}

// GET /api/auth/me
async function obtenerPerfilPropio(req, res) {
  try {
    const resultado = await authService.obtenerPerfilPropio(req.usuario.id);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al obtener tu perfil');
  }
}

// PUT /api/auth/mi-telefono
async function actualizarMiTelefono(req, res) {
  try {
    const resultado = await authService.actualizarMiTelefono(req.usuario.id, req.body.telefono);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al actualizar tu teléfono');
  }
}

// PUT /api/auth/cambiar-password
async function cambiarPassword(req, res) {
  try {
    const resultado = await authService.cambiarPassword(req.usuario.id, req.body.password_actual, req.body.password_nueva);
    res.json(resultado);
  } catch (error) {
    manejarError(res, error, 'Error al cambiar la contraseña');
  }
}

module.exports = {
  registro,
  login,
  olvidePassword,
  restablecerPassword,
  obtenerPerfilPropio,
  actualizarMiTelefono,
  cambiarPassword,
};
