/** Rutas de detalle donde las acciones van en la página en móvil, no en el menú hamburguesa. */
export function isProductDetailPath(pathname: string | null): boolean {
  if (!pathname) return false
  return /^\/products\/[^/]+$/.test(pathname)
}

export function isCategoryDetailPath(pathname: string | null): boolean {
  if (!pathname) return false
  return /^\/categories\/[^/]+$/.test(pathname)
}

export function hideDetailActionsInMobileMenu(pathname: string | null): boolean {
  return isProductDetailPath(pathname) || isCategoryDetailPath(pathname)
}
