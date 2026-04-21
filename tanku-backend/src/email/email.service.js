const providers = {
  gmail: require('./providers/gmail.provider'),
  // sendgrid: require('./providers/sendgrid.provider'),
  // ses: require('./providers/ses.provider'),
};

const { getTestTemplate } = require('./templates/test.template');

function getActiveProvider() {
  const key = process.env.EMAIL_PROVIDER || 'gmail';
  const provider = providers[key];
  if (!provider || typeof provider.send !== 'function') {
    throw new Error(`Email provider no soportado o inválido: ${key}`);
  }
  return provider;
}

/**
 * @param {{ to: string, subject: string, html?: string, text?: string }} params
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to || !subject) {
    throw new Error('sendEmail: "to" y "subject" son obligatorios');
  }
  if (!html && !text) {
    throw new Error('sendEmail: debe incluirse "html" o "text"');
  }
  const provider = getActiveProvider();
  try {
    const result = await provider.send({ to, subject, html, text });
    console.log('[email.service] Envío OK:', { to, subject });
    return result;
  } catch (err) {
    console.error('[email.service] Envío fallido:', err.message);
    throw err;
  }
}

/**
 * @param {string} to
 */
async function sendTestEmail(to) {
  const { html, text } = getTestTemplate();
  return sendEmail({
    to,
    subject: 'Prueba Tanku — correo de test',
    html,
    text,
  });
}

module.exports = {
  sendEmail,
  sendTestEmail,
  getActiveProvider,
};
