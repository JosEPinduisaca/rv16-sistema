const pool = require('../config/db');

// Ejecuta `fn(client)` dentro de una transacción: BEGIN, corre fn con ese
// client, COMMIT si termina bien. Si fn lanza cualquier error (de negocio o
// inesperado), hace ROLLBACK y vuelve a lanzarlo tal cual, para que quien
// llamó decida cómo tratarlo.
async function ejecutarEnTransaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { ejecutarEnTransaccion };
