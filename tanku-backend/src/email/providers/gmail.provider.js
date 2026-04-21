const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    if (!user || !pass) {
      throw new Error(
        'EMAIL_USER y EMAIL_PASS deben estar definidos en el entorno para usar el proveedor gmail'
      );
    }
    // SMTP explícito + family: 4 evita ENETUNREACH a IPv6 (p. ej. Railway sin salida IPv6).
    // 587 + STARTTLS es el flujo recomendado por Google para clientes.
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      family: 4,
      auth: { user, pass },
      connectionTimeout: 30000,
      socketTimeout: 30000,
      greetingTimeout: 15000,
    });
  }
  return transporter;
}

/**
 * @param {{ to: string, subject: string, html?: string, text?: string }} params
 */
async function send({ to, subject, html, text }) {
  try {
    const mail = {
      from: process.env.EMAIL_USER,
      to,
      subject,
    };
    if (html) mail.html = html;
    if (text) mail.text = text;

    const info = await getTransporter().sendMail(mail);
    console.log('[email][gmail] Correo enviado:', { to, subject, messageId: info.messageId });
    return info;
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[email][gmail] Error enviando correo:', err.message, code ? { code } : '');
    throw err;
  }
}

module.exports = { send };
