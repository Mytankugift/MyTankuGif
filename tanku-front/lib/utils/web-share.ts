export type NativeSharePayload = {
  title?: string
  text?: string
  url: string
}

export function canUseNativeShare(payload: NativeSharePayload): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }
  try {
    return !navigator.canShare || navigator.canShare(payload)
  } catch {
    return false
  }
}

export async function shareViaNative(payload: NativeSharePayload): Promise<'shared' | 'aborted' | 'unavailable'> {
  if (!canUseNativeShare(payload)) return 'unavailable'

  try {
    await navigator.share(payload)
    return 'shared'
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'aborted'
    return 'unavailable'
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      return ok
    } catch {
      return false
    }
  }
}
