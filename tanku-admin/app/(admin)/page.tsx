'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import Link from 'next/link'
import { 
  Cog6ToothIcon,
  CubeIcon,
  FolderIcon,
  UserGroupIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function AdminHomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAdminAuthStore()
  const hasHydrated = useAdminAuthStore((state) => state._hasHydrated)
  const [showInfoModal, setShowInfoModal] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return
    
    if (!isAuthenticated) {
      router.replace('/auth/login')
      return
    }
  }, [hasHydrated, isAuthenticated, router])

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const modules = [
    {
      id: 'workers',
      name: 'Workers',
      description: 'Gestión y monitoreo de procesos de sincronización Dropi',
      icon: WrenchScrewdriverIcon,
      color: 'bg-blue-500',
      href: '/workers',
      status: 'active'
    },
    {
      id: 'products',
      name: 'Productos',
      description: 'Gestión de productos, variantes y precios',
      icon: CubeIcon,
      color: 'bg-purple-500',
      href: '/products',
      status: 'active'
    },
    {
      id: 'categories',
      name: 'Categorías',
      description: 'Organización y gestión de categorías de productos',
      icon: FolderIcon,
      color: 'bg-green-500',
      href: '/categories',
      status: 'active'
    },
    {
      id: 'users',
      name: 'Usuarios',
      description: 'Administración de usuarios y permisos',
      icon: UserGroupIcon,
      color: 'bg-yellow-500',
      href: '/users',
      status: 'active'
    },
    {
      id: 'analytics',
      name: 'Analíticas',
      description: 'Reportes y métricas del sistema',
      icon: ChartBarIcon,
      color: 'bg-indigo-500',
      href: '#',
      status: 'coming-soon'
    },
    {
      id: 'settings',
      name: 'Configuración',
      description: 'Ajustes generales del sistema',
      icon: Cog6ToothIcon,
      color: 'bg-gray-500',
      href: '/settings',
      status: 'active'
    },
  ]

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {modules.map((module) => {
            const Icon = module.icon
            const isActive = module.status === 'active'
            
            const content = (
              <div className={`
                relative bg-white rounded-xl shadow-sm border-2 transition-all duration-200 h-full flex flex-col
                ${isActive 
                  ? 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer' 
                  : 'border-gray-100 opacity-75 cursor-not-allowed'
                }
              `}>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`
                      ${module.color} rounded-lg p-3 shadow-sm flex-shrink-0
                      ${!isActive && 'opacity-50'}
                    `}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {module.name}
                        </h3>
                        {!isActive && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex-shrink-0">
                            Próximamente
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  
                  {isActive && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 font-medium mt-auto pt-4 border-t border-gray-100">
                      <span>Acceder</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            )

            if (isActive) {
              return (
                <Link key={module.id} href={module.href}>
                  {content}
                </Link>
              )
            }

            return (
              <div key={module.id}>
                {content}
              </div>
            )
          })}
        </div>

        {/* Botón de ayuda en la esquina */}
        <button
          onClick={() => setShowInfoModal(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-10"
          title="Información del sistema"
        >
          <QuestionMarkCircleIcon className="w-6 h-6" />
        </button>

        {/* Modal de información */}
        {showInfoModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowInfoModal(false)}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Sistema Centralizado de Gestión
                  </h2>
                  <button
                    onClick={() => setShowInfoModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-gray-700 leading-relaxed mb-6">
                  El ERP de Tanku es el núcleo que coordina todas las operaciones del primer Give-commerce. 
                  Desde aquí puedes gestionar la sincronización con Dropi, administrar productos y categorías, 
                  controlar usuarios y permisos, y acceder a todas las herramientas necesarias para 
                  mantener el sistema funcionando de manera óptima.
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Sincronización automatizada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Gestión de inventario</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Control de usuarios</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>Reportes y analíticas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
