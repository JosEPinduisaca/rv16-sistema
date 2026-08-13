// Script de uso único: crea (o actualiza la contraseña de) el usuario administrador.
// Uso:
//   node crear-admin.js
//
// Evita el problema de copiar/pegar el hash de bcrypt manualmente entre
// PowerShell y pgAdmin (donde se puede colar un carácter invisible de más).

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const EMAIL = 'admin@rv16.com';
const PASSWORD_EN_TEXTO_PLANO = '123456.';
const NOMBRES = 'Admin';
const APELLIDOS = 'RV16';
const CEDULA = '1234567890';

async function main() {
  const hash = await bcrypt.hash(PASSWORD_EN_TEXTO_PLANO, 10);

  const existente = await pool.query('SELECT id FROM usuarios WHERE email = $1', [EMAIL]);

  if (existente.rows.length > 0) {
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE email = $2', [hash, EMAIL]);
    console.log(`Usuario ${EMAIL} actualizado con la nueva contraseña.`);
  } else {
    await pool.query(
      `INSERT INTO usuarios (cedula, nombres, apellidos, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5, 'administrador')`,
      [CEDULA, NOMBRES, APELLIDOS, EMAIL, hash]
    );
    console.log(`Usuario ${EMAIL} creado correctamente.`);
  }

  console.log(`Ahora puedes iniciar sesión con: ${EMAIL} / ${PASSWORD_EN_TEXTO_PLANO}`);
  await pool.end();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
