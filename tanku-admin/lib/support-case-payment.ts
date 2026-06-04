export function formatSupportCasePayment(method: string | null, status: string) {
  if (method === 'cash_on_delivery') {
    return status === 'paid' || status === 'completed' ? 'Contra entrega · pagado' : 'Contra entrega'
  }
  if (method === 'epayco') return 'En línea (ePayco)'
  return method?.replace(/_/g, ' ') ?? '—'
}
