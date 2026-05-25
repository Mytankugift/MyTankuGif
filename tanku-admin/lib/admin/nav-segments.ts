export type NavSegment = { label: string; href?: string }

const SETTINGS_PAGES: Record<string, { label: string; description: string }> = {
  '/settings': {
    label: 'Configuración',
    description: 'Gestiona las configuraciones del sistema',
  },
  '/settings/price-formulas': {
    label: 'Fórmulas de precio',
    description: 'Plantillas de fórmulas para calcular precios de productos',
  },
  '/settings/cron': {
    label: 'Cron y sincronización',
    description: 'Crons del sistema, sync stock Dropi y recordatorios de eventos',
  },
  '/settings/email-test': {
    label: 'Email de prueba',
    description: 'Correo SMTP y plantilla HTML de regalo (demo)',
  },
}

export function buildAdminNavPath(pathname: string | null): NavSegment[] | null {
  if (!pathname) return null

  if (pathname === '/' || pathname === '') {
    return [{ label: 'ERP Tanku' }]
  }

  if (pathname === '/workers' || pathname.startsWith('/workers/')) {
    const segments: NavSegment[] = [{ label: 'Workers', href: '/workers' }]
    const workerId = pathname.startsWith('/workers/')
      ? pathname.replace('/workers/', '').split('/')[0]
      : ''
    const labels: Record<string, string> = {
      'sync-raw': 'Sincronizar RAW',
      normalize: 'Normalizar',
      enrich: 'Enriquecer',
      'sync-backend': 'Sincronizar Backend',
      'sync-stock': 'Sincronizar Stock',
    }
    if (workerId && labels[workerId]) {
      segments.push({ label: labels[workerId] })
    }
    return segments
  }

  if (pathname === '/products' || pathname.startsWith('/products/')) {
    const segments: NavSegment[] = [{ label: 'Productos', href: '/products' }]
    if (pathname.startsWith('/products/') && pathname !== '/products') {
      segments.push({ label: 'Detalle de producto' })
    }
    return segments
  }

  if (pathname === '/categories' || pathname.startsWith('/categories/')) {
    const segments: NavSegment[] = [{ label: 'Categorías', href: '/categories' }]
    if (pathname.startsWith('/categories/') && pathname !== '/categories') {
      segments.push({ label: 'Detalle de categoría' })
    }
    return segments
  }

  if (pathname === '/users' || pathname.startsWith('/users/')) {
    return [{ label: 'Usuarios Admin', href: '/users' }]
  }

  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    const segments: NavSegment[] = [{ label: 'Configuración', href: '/settings' }]
    const sub = SETTINGS_PAGES[pathname]
    if (sub && pathname !== '/settings') {
      segments.push({ label: sub.label })
    }
    return segments
  }

  return null
}

export function buildAdminNavDescription(pathname: string | null): string | null {
  if (!pathname) return null

  if (pathname === '/' || pathname === '') {
    return 'El gestor y cerebro central de Tanku'
  }

  if (pathname.startsWith('/workers/')) {
    const workerId = pathname.replace('/workers/', '').split('/')[0]
    const labels: Record<string, string> = {
      'sync-raw': 'Sincronizar RAW',
      normalize: 'Normalizar',
      enrich: 'Enriquecer',
      'sync-backend': 'Sincronizar Backend',
      'sync-stock': 'Sincronizar Stock',
    }
    return labels[workerId]
      ? `Proceso: ${labels[workerId]}`
      : 'Gestiona y monitorea los procesos de sincronización con Dropi'
  }
  if (pathname === '/workers') {
    return 'Gestiona y monitorea los procesos de sincronización con Dropi'
  }

  if (pathname === '/products' || pathname.startsWith('/products/')) {
    return pathname === '/products'
      ? 'Gestiona los productos de Tanku'
      : 'Edita y revisa un producto del catálogo'
  }

  if (pathname === '/categories' || pathname.startsWith('/categories/')) {
    return pathname === '/categories'
      ? 'Gestiona las categorías de productos y su jerarquía'
      : 'Detalle y edición de categoría'
  }

  if (pathname === '/users' || pathname.startsWith('/users/')) {
    return 'Gestiona los usuarios administradores del sistema'
  }

  const settingsSub = SETTINGS_PAGES[pathname]
  if (settingsSub) return settingsSub.description
  if (pathname === '/settings') return SETTINGS_PAGES['/settings'].description

  return null
}
