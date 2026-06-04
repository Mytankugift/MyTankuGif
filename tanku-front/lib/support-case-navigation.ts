/** Deep link a postventa desde notificaciones (un solo query param). */

export function isSupportCaseNotificationType(type: string | undefined): boolean {
  return type === 'support_case_reply' || type === 'support_case_status'
}

/** URL mínima: el backend resuelve orderId desde el caso. */
export function buildSupportCaseProfileHref(supportCaseId: string): string {
  return `/profile?case=${encodeURIComponent(supportCaseId)}`
}

/** Quita params de deep link del perfil (postventa y checkout). */
export function clearProfileDeepLinkParams(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('case')
  url.searchParams.delete('orderId')
  url.searchParams.delete('tab')
  url.searchParams.delete('supportCaseId')
  url.searchParams.delete('supportCaseRef')
  const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '')
  window.history.replaceState({}, '', next)
}

/** @deprecated usar clearProfileDeepLinkParams */
export function clearSupportCaseDeepLinkFromUrl(): void {
  clearProfileDeepLinkParams()
}
