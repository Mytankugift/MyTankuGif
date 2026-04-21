const { sendTestEmail } = require('../email/email.service');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/v1/email/test
 */
async function testEmail(req, res) {
  try {
    const { to } = req.body || {};
    if (!to || typeof to !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'El campo "to" es obligatorio',
      });
    }
    const trimmed = to.trim();
    if (!EMAIL_RE.test(trimmed)) {
      return res.status(400).json({
        success: false,
        error: 'El campo "to" debe ser un correo electrónico válido',
      });
    }

    await sendTestEmail(trimmed);
    return res.status(200).json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al enviar el correo';
    console.error('[email.controller] testEmail:', message);
    return res.status(500).json({ success: false, error: message });
  }
}

module.exports = { testEmail };
