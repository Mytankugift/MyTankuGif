const { wrap } = require('./base.template');

/**
 * @param {{
 *   caseRef: string,
 *   orderId: string,
 *   orderRef?: string | null,
 *   message: string,
 *   adminCaseUrl: string,
 * }} params
 * @returns {{ html: string, text: string, subject: string }}
 */
function getSupportCaseUserReplyTemplate(params) {
  const orderDisplay = params.orderRef?.trim() || params.orderId;
  const subject = `Cliente respondió — ${params.caseRef}`;
  const excerpt =
    params.message.length > 400
      ? `${params.message.slice(0, 397)}…`
      : params.message;
  const safeExcerpt = excerpt.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const text = [
    'El cliente respondió en una solicitud de soporte (PQR).',
    '',
    `Reclamo: ${params.caseRef}`,
    `Pedido: ${orderDisplay}`,
    '',
    'Mensaje del cliente:',
    excerpt,
    '',
    `Abrir en ERP: ${params.adminCaseUrl}`,
  ].join('\n');

  const html = wrap(
    `
    <p style="margin:0 0 16px;">El cliente <strong>respondió</strong> en una solicitud de soporte. Revisa el mensaje en el ERP.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:4px 8px 4px 0;color:#6b7280;">Reclamo</td><td style="padding:4px 0;"><strong>${params.caseRef}</strong></td></tr>
      <tr><td style="padding:4px 8px 4px 0;color:#6b7280;">Pedido</td><td style="padding:4px 0;font-family:monospace;font-size:13px;">${orderDisplay}</td></tr>
    </table>
    <p style="margin:16px 0 8px;color:#374151;font-size:14px;"><strong>Mensaje del cliente</strong></p>
    <p style="margin:0 0 20px;white-space:pre-wrap;font-size:14px;line-height:1.5;">${safeExcerpt}</p>
    <p style="margin:0;"><a href="${params.adminCaseUrl}" style="color:#0092c6;font-weight:600;">Abrir caso en el ERP</a></p>
    `,
    { title: 'Respuesta del cliente' }
  );

  return { html, text, subject };
}

module.exports = { getSupportCaseUserReplyTemplate };
