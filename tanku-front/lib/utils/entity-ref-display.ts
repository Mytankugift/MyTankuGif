/** Muestra ref legible (ORD-2026-…) o fallback corto del id interno. */
export function displayEntityRef(
  entity: { ref?: string | null; id: string },
  options?: { prefixHash?: boolean; slice?: number }
): string {
  if (entity.ref) return entity.ref
  const slice = options?.slice ?? -8
  const short = entity.id.slice(slice).toUpperCase()
  return options?.prefixHash === false ? short : `#${short}`
}

export const displayOrderRef = (order: { ref?: string | null; id: string }) =>
  displayEntityRef(order)

export const displayCaseRef = (c: { ref?: string | null; id: string }) =>
  displayEntityRef(c)

export const displayGiftRef = (g: { ref?: string | null; id: string }) =>
  displayEntityRef(g)
