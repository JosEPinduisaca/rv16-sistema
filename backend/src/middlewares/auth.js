const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Verifica que el request traiga un token JWT válido en el header:
 * Authorization: Bearer <token>
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, rol, email }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Restringe una ruta a ciertos roles.
 * Uso: router.get('/ruta', verificarToken, permitirRoles('administrador'), controlador)
 */
function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
}

module.exports = { verificarToken, permitirRoles };
