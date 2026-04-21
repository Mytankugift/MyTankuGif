/**
 * @param {string} content - HTML interno
 * @param {{ title?: string }} [opts]
 * @returns {string}
 */
function wrap(content, opts = {}) {
  const title = opts.title || 'Tanku';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:24px 28px 8px;font-size:20px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">
              ${escapeHtml(title)}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;font-size:15px;line-height:1.55;color:#374151;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { wrap };
