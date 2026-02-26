'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { NotificationContainer } from '@/components/notifications'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, logout, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  // Determinar el path del nav según la ruta (estilo consola con |)
  const getNavPath = () => {
    const path: Array<{ label: string; href?: string }> = []
    
    if (pathname === '/' || pathname === '') {
      path.push({ label: 'ERP Tanku' })
    } else if (pathname === '/workers' || pathname?.startsWith('/workers/')) {
      path.push({ label: 'Workers' })
    } else if (pathname === '/products' || pathname?.startsWith('/products/')) {
      path.push({ label: 'Productos' })
    } else if (pathname === '/categories' || pathname?.startsWith('/categories/')) {
      path.push({ label: 'Categorías' })
    } else if (pathname === '/users' || pathname?.startsWith('/users/')) {
      path.push({ label: 'Usuarios Admin' })
    } else if (pathname === '/settings' || pathname?.startsWith('/settings/')) {
      path.push({ label: 'Configuración', href: '/settings' })
      
      // Si es una subpágina de settings, agregar el nombre
      if (pathname === '/settings/price-formulas' || pathname?.startsWith('/settings/price-formulas/')) {
        path.push({ label: 'Fórmulas de Precio' })
      }
    }
    
    return path.length > 0 ? path : null
  }

  const getNavDescription = () => {
    if (pathname === '/' || pathname === '') {
      return 'El gestor y cerebro central de Tanku'
    }
    if (pathname === '/products' || pathname?.startsWith('/products/')) {
      return 'Gestiona los productos de Tanku'
    }
    if (pathname === '/categories' || pathname?.startsWith('/categories/')) {
      return 'Gestiona las categorías de productos y su jerarquía'
    }
    if (pathname === '/users' || pathname?.startsWith('/users/')) {
      return 'Gestiona los usuarios administradores del sistema'
    }
    if (pathname === '/workers' || pathname?.startsWith('/workers/')) {
      return 'Gestiona y monitorea los procesos de sincronización con Dropi'
    }
    if (pathname === '/settings/price-formulas' || pathname?.startsWith('/settings/price-formulas/')) {
      return 'Gestiona plantillas de fórmulas para calcular precios de productos'
    }
    if (pathname === '/settings' || pathname?.startsWith('/settings/')) {
      return 'Gestiona las configuraciones del sistema'
    }
    return null
  }

  useEffect(() => {
    // Solo verificar autenticación después de que el store se haya hidratado
    if (!hasHydrated) {
      console.log('[LAYOUT] Esperando hidratación del store...')
      return
    }

    // Solo verificar una vez después de la hidratación
    if (hasCheckedAuth) {
      return
    }

    console.log('[LAYOUT] Auth check después de hidratación:', { isAuthenticated, user: user?.email })
    setHasCheckedAuth(true)
    
    if (!isAuthenticated) {
      console.log('[LAYOUT] No autenticado, redirigiendo a login')
      router.replace('/auth/login')
    }
  }, [hasHydrated, isAuthenticated, router, user, hasCheckedAuth])

  // Mostrar loading mientras se hidrata o mientras se verifica
  if (!hasHydrated || (!hasCheckedAuth && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Si ya se verificó y no está autenticado, no renderizar (ya se redirigió)
  if (hasCheckedAuth && !isAuthenticated) {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Navbar */}
      <nav className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Tanku Admin
              </Link>
              {getNavPath() && (
                <>
                  <div className="h-6 w-px bg-gray-300" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      {getNavPath()?.map((segment, index) => (
                        <span key={index} className="flex items-center gap-2">
                          {index > 0 && <span className="text-gray-400">|</span>}
                          {segment.href ? (
                            <Link 
                              href={segment.href}
                              className="hover:text-blue-600 transition-colors"
                            >
                              {segment.label}
                            </Link>
                          ) : (
                            <span>{segment.label}</span>
                          )}
                        </span>
                      ))}
                    </div>
                    {getNavDescription() && (
                      <span className="text-xs text-gray-500">{getNavDescription()}</span>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* User info */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserCircleIcon className="w-5 h-5" />
                <span className="font-medium">{user?.email}</span>
                {user?.role && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'SUPER_ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Product Manager'}
                  </span>
                )}
              </div>
              
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
      
      {/* Notificaciones */}
      <NotificationContainer />
    </div>
  )
}

