const pool = require('../config/db');

async function buscarPorCedula(cedula) {
  const resultado = await pool.query('SELECT id FROM usuarios WHERE cedula = $1', [cedula]);
  return resultado.rows[0] || null;
}

async function buscarPorEmail(email) {
  const resultado = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  return resultado.rows[0] || null;
}

async function crearUsuario({ cedula, nombres, apellidos, email, passwordHash, telefono, rol }) {
  const resultado = await pool.query(
    `INSERT INTO usuarios (cedula, nombres, apellidos, email, password_hash, telefono, rol)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, cedula, nombres, apellidos, email, rol`,
    [cedula, nombres, apellidos, email, passwordHash, telefono, rol]
  );
  return resultado.rows[0];
}

async function crearPerfilArbitro(usuarioId) {
  await pool.query('INSERT INTO arbitros (usuario_id) VALUES ($1)', [usuarioId]);
}

// Usado tanto por login (necesita password_hash, bloqueado, intentos_fallidos)
// como por olvidePassword (solo necesita id/nombres/email): misma condición
// WHERE, se selecciona la fila completa y cada servicio toma lo que necesita.
async function buscarPorEmailActivo(email) {
  const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND activo = TRUE', [email]);
  return resultado.rows[0] || null;
}

async function actualizarIntentosFallidos(id, intentosFallidos, bloqueado) {
  await pool.query(
    'UPDATE usuarios SET intentos_fallidos = $1, bloqueado = $2 WHERE id = $3',
    [intentosFallidos, bloqueado, id]
  );
}

async function limpiarIntentosFallidos(id) {
  await pool.query('UPDATE usuarios SET intentos_fallidos = 0 WHERE id = $1', [id]);
}

async function guardarTokenRecuperacion(usuarioId, tokenHash, expira) {
  await pool.query(
    'UPDATE usuarios SET reset_token = $1, reset_token_expira = $2 WHERE id = $3',
    [tokenHash, expira, usuarioId]
  );
}

async function buscarPorTokenValido(tokenHash) {
  const resultado = await pool.query(
    'SELECT id FROM usuarios WHERE reset_token = $1 AND reset_token_expira > NOW()',
    [tokenHash]
  );
  return resultado.rows[0] || null;
}

async function restablecerPassword(usuarioId, nuevoHash) {
  await pool.query(
    `UPDATE usuarios
     SET password_hash = $1, reset_token = NULL, reset_token_expira = NULL,
         intentos_fallidos = 0, bloqueado = FALSE
     WHERE id = $2`,
    [nuevoHash, usuarioId]
  );
}

async function obtenerPerfil(usuarioId) {
  const resultado = await pool.query(
    'SELECT id, nombres, apellidos, email, telefono, rol FROM usuarios WHERE id = $1',
    [usuarioId]
  );
  return resultado.rows[0] || null;
}

async function actualizarTelefono(usuarioId, telefono) {
  const resultado = await pool.query(
    'UPDATE usuarios SET telefono = $1 WHERE id = $2 RETURNING id, telefono',
    [telefono, usuarioId]
  );
  return resultado.rows[0];
}

async function obtenerHashPassword(usuarioId) {
  const resultado = await pool.query('SELECT password_hash FROM usuarios WHERE id = $1', [usuarioId]);
  return resultado.rows[0] || null;
}

async function actualizarPassword(usuarioId, nuevoHash) {
  await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [nuevoHash, usuarioId]);
}

module.exports = {
  buscarPorCedula,
  buscarPorEmail,
  crearUsuario,
  crearPerfilArbitro,
  buscarPorEmailActivo,
  actualizarIntentosFallidos,
  limpiarIntentosFallidos,
  guardarTokenRecuperacion,
  buscarPorTokenValido,
  restablecerPassword,
  obtenerPerfil,
  actualizarTelefono,
  obtenerHashPassword,
  actualizarPassword,
};
