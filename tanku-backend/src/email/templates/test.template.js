const { wrap } = require('./base.template');

/**
 * @returns {{ html: string, text: string }}
 */
function getTestTemplate() {
  const text =
    'Si ves esto, el sistema de correos funciona correctamente.';
  const html = wrap(
    `<p style="margin:0 0 12px;">${text}</p><p style="margin:0;color:#6b7280;font-size:13px;">Mensaje de prueba — Tanku</p>`,
    { title: 'Prueba de correo' }
  );
  return { html, text };
}

module.exports = { getTestTemplate };
