require('dotenv').config();

// Si no hay Resend configurado en el .env, no falla: solo deja el enlace en
// consola para poder seguir probando en desarrollo sin credenciales reales.
const resendConfigurado = !!process.env.RESEND_API_KEY;

// Envía el correo de recuperación de contraseña. No lanza si falla el envío
// (para no filtrar por error si el correo existe o no); solo lo registra.
async function enviarCorreoRecuperacion(destinatario, nombre, enlace) {
  const asunto = 'RV16 · Núcleo Arbitral — Recupera tu contraseña';
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#0f172a;">RV16 · Núcleo Arbitral</h2>
      <p>Hola ${nombre || ''},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, haz clic en el siguiente enlace (válido por 1 hora):</p>
      <p style="margin: 24px 0;">
        <a href="${enlace}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">
          Restablecer contraseña
        </a>
      </p>
      <p>Si no fuiste tú, puedes ignorar este correo: tu contraseña seguirá siendo la misma.</p>
    </div>
  `;

  if (!resendConfigurado) {
    console.log('--- RESEND_API_KEY no configurada (.env). Enlace de recuperación para pruebas: ---');
    console.log(`Para: ${destinatario}`);
    console.log(enlace);
    console.log('---------------------------------------------------------------------');
    return;
  }

  try {
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'RV16 Núcleo Arbitral <onboarding@resend.dev>',
        to: [destinatario],
        subject: asunto,
        html,
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error('Error al enviar el correo de recuperación (Resend):', respuesta.status, detalle);
    }
  } catch (error) {
    console.error('Error al enviar el correo de recuperación:', error);
  }
}

module.exports = { enviarCorreoRecuperacion };