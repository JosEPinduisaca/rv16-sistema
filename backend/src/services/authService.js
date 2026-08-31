const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const repo = require('../repositories/usuarioRepository');
const AppError = require('../utils/AppError');
const {
  validarCedulaEcuatoriana,
  validarEmail,
  validarTelefono,
  soloLetras,
  textoValido,
} = require('../utils/validaciones');
const { enviarCorreoRecuperacion } = require('../utils/correo');
require('dotenv').config();

const ROLES_VALIDOS = ['administrador', 'directivo', 'arbitro'];
const MAX_INTENTOS = 4;

// Solo debería usarse desde el panel de Administrador para crear usuarios
async function registro({ cedula, nombres, apellidos, email, password, telefono, rol }) {
  const errores = [];

  if (!validarCedulaEcuatoriana(cedula)) {
    errores.push('La cédula ingresada no es válida (debe tener 10 dígitos y ser una cédula ecuatoriana real)');
  }
  if (!textoValido(nombres) || !soloLetras(nombres)) {
    errores.push('El nombre solo puede contener letras (sin números ni símbolos) y al menos 2 caracteres');
  }
  if (!textoValido(apellidos) || !soloLetras(apellidos)) {
    errores.push('El apellido solo puede contener letras (sin números ni símbolos) y al menos 2 caracteres');
  }
  if (!validarEmail(email)) {
    errores.push('El email no tiene un formato válido');
  }
  if (!password || password.length < 6) {
    errores.push('La contraseña debe tener al menos 6 caracteres');
  }
  if (!validarTelefono(telefono)) {
    errores.push('El teléfono debe tener entre 7 y 10 dígitos numéricos');
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    errores.push('El rol debe ser administrador, directivo o arbitro');
  }

  if (errores.length > 0) {
    throw new AppError(400, errores.join('. '));
  }

  const emailNormalizado = email.trim().toLowerCase();

  const [existeCedula, existeEmail] = await Promise.all([
    repo.buscarPorCedula(cedula),
    repo.buscarPorEmail(emailNormalizado),
  ]);

  const erroresDuplicado = [];
  if (existeCedula) {
    erroresDuplicado.push('Ya existe un usuario registrado con esa cédula');
  }
  if (existeEmail) {
    erroresDuplicado.push('Ya existe un usuario registrado con ese email');
  }
  if (erroresDuplicado.length > 0) {
    throw new AppError(409, erroresDuplicado.join('. '));
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const nuevoUsuario = await repo.crearUsuario({
    cedula,
    nombres: nombres.trim(),
    apellidos: apellidos.trim(),
    email: emailNormalizado,
    passwordHash,
    telefono: telefono || null,
    rol,
  });

  // Si el usuario es árbitro, se crea automáticamente su perfil en la tabla arbitros
  if (rol === 'arbitro') {
    await repo.crearPerfilArbitro(nuevoUsuario.id);
  }

  return { mensaje: 'Usuario creado correctamente', usuario: nuevoUsuario };
}

// Bloquea la cuenta tras 4 intentos de contraseña incorrecta seguidos.
// Si el email no corresponde a ninguna cuenta, no hay nada que bloquear
// (no se debe poder bloquear la cuenta de otra persona solo adivinando su
// correo), así que en ese caso se responde igual que siempre: "Credenciales
// inválidas", sin dar pistas de si el correo existe o no.
async function login({ email, password }) {
  if (!email || !password) {
    throw new AppError(400, 'Email y contraseña son obligatorios');
  }

  const usuario = await repo.buscarPorEmailActivo(email);

  if (!usuario) {
    throw new AppError(401, 'Credenciales inválidas');
  }

  if (usuario.bloqueado) {
    throw new AppError(
      423,
      'Tu cuenta está bloqueada por varios intentos fallidos. Usa "¿Olvidaste tu contraseña?" para recuperarla.'
    );
  }

  const passwordValido = await bcrypt.compare(password, usuario.password_hash);

  if (!passwordValido) {
    const nuevosIntentos = usuario.intentos_fallidos + 1;
    const seBloquea = nuevosIntentos >= MAX_INTENTOS;

    await repo.actualizarIntentosFallidos(usuario.id, seBloquea ? 0 : nuevosIntentos, seBloquea);

    if (seBloquea) {
      throw new AppError(423, 'Tu cuenta se bloqueó por 4 intentos fallidos. Usa "¿Olvidaste tu contraseña?" para recuperarla.');
    }

    const restantes = MAX_INTENTOS - nuevosIntentos;
    throw new AppError(
      401,
      `Credenciales inválidas. Te queda${restantes === 1 ? '' : 'n'} ${restantes} intento${restantes === 1 ? '' : 's'} antes de que se bloquee tu cuenta.`
    );
  }

  // Login correcto: limpia cualquier intento fallido anterior
  if (usuario.intentos_fallidos > 0) {
    await repo.limpiarIntentosFallidos(usuario.id);
  }

  const token = jwt.sign(
    { id: usuario.id, rol: usuario.rol, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
}

// Genera un enlace de recuperación de un solo uso (válido 1 hora) y lo
// envía al correo del usuario. Siempre responde el mismo mensaje genérico,
// exista o no ese correo, para no revelar qué correos están registrados.
async function olvidePassword({ email }) {
  const mensajeGenerico = { mensaje: 'Si ese correo está registrado, te enviamos un enlace para restablecer tu contraseña.' };

  if (!validarEmail(email)) {
    throw new AppError(400, 'Ingresa un correo válido');
  }

  const usuario = await repo.buscarBasicoPorEmailActivo(email.trim().toLowerCase());

  if (!usuario) {
    return mensajeGenerico;
  }

  const tokenPlano = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex');
  const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await repo.guardarTokenRecuperacion(usuario.id, tokenHash, expira);

  const urlFrontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  const enlace = `${urlFrontend}/restablecer-password?token=${tokenPlano}`;
  await enviarCorreoRecuperacion(usuario.email, usuario.nombres, enlace);

  return mensajeGenerico;
}

// Valida el token recibido por correo y define la nueva contraseña.
// También desbloquea la cuenta y limpia los intentos fallidos: es la forma
// de recuperar el acceso si se llegó a bloquear.
async function restablecerPassword({ token, password_nueva: passwordNueva }) {
  if (!token) {
    throw new AppError(400, 'Falta el token de recuperación');
  }
  if (!passwordNueva || passwordNueva.length < 6) {
    throw new AppError(400, 'La nueva contraseña debe tener al menos 6 caracteres');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const usuario = await repo.buscarPorTokenValido(tokenHash);

  if (!usuario) {
    throw new AppError(400, 'El enlace no es válido o ya expiró. Solicita uno nuevo.');
  }

  const nuevoHash = await bcrypt.hash(passwordNueva, 10);
  await repo.restablecerPassword(usuario.id, nuevoHash);

  return { mensaje: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' };
}

// Datos básicos del usuario logueado (cualquier rol).
async function obtenerPerfilPropio(usuarioId) {
  const usuario = await repo.obtenerPerfil(usuarioId);
  if (!usuario) {
    throw new AppError(404, 'Usuario no encontrado');
  }
  return usuario;
}

// Cualquier usuario (admin incluido) puede actualizar su propio teléfono,
// por ejemplo para que el botón de WhatsApp en Liquidaciones funcione.
async function actualizarMiTelefono(usuarioId, telefono) {
  if (!validarTelefono(telefono)) {
    throw new AppError(400, 'El teléfono debe tener entre 7 y 10 dígitos numéricos');
  }
  return repo.actualizarTelefono(usuarioId, telefono || null);
}

async function cambiarPassword(usuarioId, passwordActual, passwordNueva) {
  if (!passwordActual || !passwordNueva) {
    throw new AppError(400, 'Debes indicar la contraseña actual y la nueva');
  }
  if (passwordNueva.length < 6) {
    throw new AppError(400, 'La nueva contraseña debe tener al menos 6 caracteres');
  }

  const fila = await repo.obtenerHashPassword(usuarioId);
  if (!fila) {
    throw new AppError(404, 'Usuario no encontrado');
  }

  const coincide = await bcrypt.compare(passwordActual, fila.password_hash);
  if (!coincide) {
    throw new AppError(401, 'La contraseña actual no es correcta');
  }

  const nuevoHash = await bcrypt.hash(passwordNueva, 10);
  await repo.actualizarPassword(usuarioId, nuevoHash);

  return { mensaje: 'Contraseña actualizada correctamente' };
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
