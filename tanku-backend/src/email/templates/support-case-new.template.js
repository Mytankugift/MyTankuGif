const { wrap } = require('./base.template');

const CASE_TYPE_LABELS = {
  NOT_RECEIVED: 'No recibí mi pedido',
  DAMAGED: 'Producto dañado',
  DELAY: 'Demora en el envío',
  WRONG_ITEM: 'Producto incorrecto',
  INCOMPLETE: 'Pedido incompleto',
};

/**
 * @param {{
 *   caseRef: string,
 *   caseType: string,
 *   orderId: string,
 *   orderRef?: string | null,
 *   description: string,
 *   evidenceCount: number,
 *   adminCaseUrl: string,
 * }} params
 * @returns {{ html: string, text: string, subject: string }}
 */
function getSupportCaseNewTemplate(params) {
  const typeLabel = CASE_TYPE_LABELS[params.caseType] ?? params.caseType;
  const orderDisplay = params.orderRef?.trim() || params.orderId;
  const subject = `Reclamo ${params.caseRef} — requiere revisión`;
  const desc =
    params.description.length > 400
      ? `${params.description.slice(0, 397)}…`
      : params.description;
  const safeDesc = desc.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const text = [
    'Un cliente reportó un problema con su pedido en Tanku.',
    'Revisa el caso y toma acción en el ERP.',
    '',
    `Reclamo: ${params.caseRef}`,
    `Motivo: ${typeLabel}`,
    `Pedido: ${orderDisplay}`,
    `Evidencias adjuntas: ${params.evidenceCount}`,
    '',
    'Descripción del cliente:',
    desc,
    '',
    `Abrir en ERP: ${params.adminCaseUrl}`,
  ].join('\n');

  const html = wrap(
    `
    <p style="margin:0 0 16px;">Un cliente reportó un <strong>problema con su pedido</strong>. Revisa el reclamo y toma acción en el ERP.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:4px 8px 4px 0;color:#6b7280;">Reclamo</td><td style="padding:4px 0;"><strong>${params.caseRef}</strong></td></tr>
      <tr><td style="padding:4px 8px 4px 0;color:#6b7280;">Motivo</td><td style="padding:4px 0;">${typeLabel}</td></tr>
      <tr><td style="padding:4px 8px 4px 0;color:#6b7280;">Pedido</td><td style="padding:4px 0;font-family:monospace;font-size:13px;">${orderDisplay}</td></tr>
      <tr><td style="padding:4px 8px 4px 0;color:#6b7280;">Evidencias</td><td style="padding:4px 0;">${params.evidenceCount}</td></tr>
    </table>
    <p style="margin:16px 0 8px;color:#374151;font-size:14px;"><strong>Descripción del cliente</strong></p>
    <p style="margin:0 0 20px;white-space:pre-wrap;font-size:14px;line-height:1.5;">${safeDesc}</p>
    <p style="margin:0;"><a href="${params.adminCaseUrl}" style="color:#0092c6;font-weight:600;">Abrir caso en el ERP</a></p>
    `,
    { title: 'Nuevo reclamo de cliente' }
  );

  return { html, text, subject };
}

module.exports = { getSupportCaseNewTemplate };
