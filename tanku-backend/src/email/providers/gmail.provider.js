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
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
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
    console.error('[email][gmail] Error enviando correo:', err.message);
    throw err;
  }
}

module.exports = { send };
