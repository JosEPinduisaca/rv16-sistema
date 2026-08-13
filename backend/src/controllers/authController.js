const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
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

// POST /api/auth/registro
// Solo debería usarse desde el panel de Administrador para crear usuarios
async function registro(req, res) {
  const { cedula, nombres, apellidos, email, password, telefono, rol } = req.body;

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
    return res.status(400).json({ error: errores.join('. ') });
  }

  try {
    const existeCedula = await pool.query('SELECT id FROM usuarios WHERE cedula = $1', [cedula]);
    const existeEmail = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);

    const erroresDuplicado = [];
    if (existeCedula.rows.length > 0) {
      erroresDuplicado.push('Ya existe un usuario registrado con esa cédula');
    }
    if (existeEmail.rows.length > 0) {
      erroresDuplicado.push('Ya existe un usuario registrado con ese email');
    }
    if (erroresDuplicado.length > 0) {
      return res.status(409).json({ error: erroresDuplicado.join('. ') });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const resultado = await pool.query(
      `INSERT INTO usuarios (cedula, nombres, apellidos, email, password_hash, telefono, rol)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, cedula, nombres, apellidos, email, rol`,
      [cedula, nombres.trim(), apellidos.trim(), email.trim().toLowerCase(), passwordHash, telefono || null, rol]
    );

    const nuevoUsuario = resultado.rows[0];

    // Si el usuario es árbitro, se crea automáticamente su perfil en la tabla arbitros
    if (rol === 'arbitro') {
      await pool.query(
        'INSERT INTO arbitros (usuario_id) VALUES ($1)',
        [nuevoUsuario.id]
      );
    }

    res.status(201).json({ mensaje: 'Usuario creado correctamente', usuario: nuevoUsuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
}

// POST /api/auth/login
// Bloquea la cuenta tras 4 intentos de contraseña incorrecta seguidos.
// Si el email no corresponde a ninguna cuenta, no hay nada que bloquear
// (no se debe poder bloquear la cuenta de otra persona solo adivinando su
// correo), así que en ese caso se responde igual que siempre: "Credenciales
// inválidas", sin dar pistas de si el correo existe o no.
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const resultado = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = resultado.rows[0];

    if (usuario.bloqueado) {
      return res.status(423).json({
        error: 'Tu cuenta está bloqueada por varios intentos fallidos. Usa "¿Olvidaste tu contraseña?" para recuperarla.',
      });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
      const nuevosIntentos = usuario.intentos_fallidos + 1;
      const seBloquea = nuevosIntentos >= MAX_INTENTOS;

      await pool.query(
        'UPDATE usuarios SET intentos_fallidos = $1, bloqueado = $2 WHERE id = $3',
        [seBloquea ? 0 : nuevosIntentos, seBloquea, usuario.id]
      );

      if (seBloquea) {
        return res.status(423).json({
          error: 'Tu cuenta se bloqueó por 4 intentos fallidos. Usa "¿Olvidaste tu contraseña?" para recuperarla.',
        });
      }

      const restantes = MAX_INTENTOS - nuevosIntentos;
      return res.status(401).json({
        error: `Credenciales inválidas. Te queda${restantes === 1 ? '' : 'n'} ${restantes} intento${restantes === 1 ? '' : 's'} antes de que se bloquee tu cuenta.`,
      });
    }

    // Login correcto: limpia cualquier intento fallido anterior
    if (usuario.intentos_fallidos > 0) {
      await pool.query('UPDATE usuarios SET intentos_fallidos = 0 WHERE id = $1', [usuario.id]);
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

// POST /api/auth/olvide-password
// Genera un enlace de recuperación de un solo uso (válido 1 hora) y lo
// envía al correo del usuario. Siempre responde el mismo mensaje genérico,
// exista o no ese correo, para no revelar qué correos están registrados.
async function olvidePassword(req, res) {
  const { email } = req.body;
  const mensajeGenerico = { mensaje: 'Si ese correo está registrado, te enviamos un enlace para restablecer tu contraseña.' };

  if (!validarEmail(email)) {
    return res.status(400).json({ error: 'Ingresa un correo válido' });
  }

  try {
    const resultado = await pool.query(
      'SELECT id, nombres, email FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email.trim().toLowerCase()]
    );

    if (resultado.rows.length === 0) {
      return res.json(mensajeGenerico);
    }

    const usuario = resultado.rows[0];
    const tokenPlano = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.query(
      'UPDATE usuarios SET reset_token = $1, reset_token_expira = $2 WHERE id = $3',
      [tokenHash, expira, usuario.id]
    );

    const urlFrontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const enlace = `${urlFrontend}/restablecer-password?token=${tokenPlano}`;
    await enviarCorreoRecuperacion(usuario.email, usuario.nombres, enlace);

    res.json(mensajeGenerico);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
}

// POST /api/auth/restablecer-password
// Valida el token recibido por correo y define la nueva contraseña.
// También desbloquea la cuenta y limpia los intentos fallidos: es la forma
// de recuperar el acceso si se llegó a bloquear.
async function restablecerPassword(req, res) {
  const { token, password_nueva } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Falta el token de recuperación' });
  }
  if (!password_nueva || password_nueva.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resultado = await pool.query(
      'SELECT id FROM usuarios WHERE reset_token = $1 AND reset_token_expira > NOW()',
      [tokenHash]
    );

    if (resultado.rows.length === 0) {
      return res.status(400).json({ error: 'El enlace no es válido o ya expiró. Solicita uno nuevo.' });
    }

    const nuevoHash = await bcrypt.hash(password_nueva, 10);
    await pool.query(
      `UPDATE usuarios
       SET password_hash = $1, reset_token = NULL, reset_token_expira = NULL,
           intentos_fallidos = 0, bloqueado = FALSE
       WHERE id = $2`,
      [nuevoHash, resultado.rows[0].id]
    );

    res.json({ mensaje: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
}

// GET /api/auth/me
// Datos básicos del usuario logueado (cualquier rol).
async function obtenerPerfilPropio(req, res) {
  try {
    const resultado = await pool.query(
      'SELECT id, nombres, apellidos, email, telefono, rol FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener tu perfil' });
  }
}

// PUT /api/auth/mi-telefono
// Cualquier usuario (admin incluido) puede actualizar su propio teléfono,
// por ejemplo para que el botón de WhatsApp en Liquidaciones funcione.
async function actualizarMiTelefono(req, res) {
  const { telefono } = req.body;

  if (!validarTelefono(telefono)) {
    return res.status(400).json({ error: 'El teléfono debe tener entre 7 y 10 dígitos numéricos' });
  }

  try {
    const resultado = await pool.query(
      'UPDATE usuarios SET telefono = $1 WHERE id = $2 RETURNING id, telefono',
      [telefono || null, req.usuario.id]
    );
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar tu teléfono' });
  }
}

// PUT /api/auth/cambiar-password
async function cambiarPassword(req, res) {
  const { password_actual, password_nueva } = req.body;

  if (!password_actual || !password_nueva) {
    return res.status(400).json({ error: 'Debes indicar la contraseña actual y la nueva' });
  }
  if (password_nueva.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const resultado = await pool.query('SELECT password_hash FROM usuarios WHERE id = $1', [req.usuario.id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const coincide = await bcrypt.compare(password_actual, resultado.rows[0].password_hash);
    if (!coincide) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }

    const nuevoHash = await bcrypt.hash(password_nueva, 10);
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [nuevoHash, req.usuario.id]);

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
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
