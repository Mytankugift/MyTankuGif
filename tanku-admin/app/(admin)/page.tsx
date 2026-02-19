'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { config } from '@/lib/config'
import { 
  ArrowPathIcon, 
  ServerIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface DropiJob {
  id: string
  type: 'RAW' | 'NORMALIZE' | 'ENRICH' | 'SYNC_PRODUCT' | 'SYNC_STOCK'
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
  progress: number
  attempts: number
  error: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

interface ProxyStatus {
  status: 'active' | 'inactive' | 'not_configured' | 'active_with_errors'
  isActive: boolean
  proxyUrl: string | null
  message: string
  responseTime?: number
  httpStatus?: number
  timestamp: string
}

const PROCESSES = [
  {
    id: 'sync-raw',
    name: 'Sincronizar RAW',
    description: 'Guarda JSON crudo en DropiRawProduct',
    type: 'RAW' as const,
    color: 'bg-blue-500',
    icon: '📦',
    route: '/workers/sync-raw'
  },
  {
    id: 'normalize',
    name: 'Normalizar',
    description: 'Normaliza a DropiProduct',
    type: 'NORMALIZE' as const,
    color: 'bg-purple-500',
    icon: '🔄',
    route: '/workers/normalize'
  },
  {
    id: 'enrich',
    name: 'Enriquecer',
    description: 'Enriquece con descripciones e imágenes',
    type: 'ENRICH' as const,
    color: 'bg-yellow-500',
    icon: '✨',
    route: '/workers/enrich'
  },
  {
    id: 'sync-to-backend',
    name: 'Sincronizar Backend',
    description: 'Sincroniza a Product/ProductVariant/WarehouseVariant',
    type: 'SYNC_PRODUCT' as const,
    color: 'bg-green-500',
    icon: '🚀',
    route: '/workers/sync-backend'
  },
  {
    id: 'sync-stock',
    name: 'Sincronizar Stock',
    description: 'Actualiza stock y precios, marca productos sin stock como inactivos',
    type: 'SYNC_STOCK' as const,
    color: 'bg-indigo-500',
    icon: '📊',
    route: '/workers/sync-stock'
  },
]

export default function AdminDashboard() {
  const router = useRouter()
  const { isAuthenticated } = useAdminAuthStore()
  const [jobs, setJobs] = useState<DropiJob[]>([])
  const [loading, setLoading] = useState(true)
  const [activeJobs, setActiveJobs] = useState<Map<string, DropiJob>>(new Map())
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus | null>(null)

  // Redirigir a login si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  // Cargar jobs
  const loadJobs = async () => {
    try {
      const response = await apiClient.get<{ jobs: DropiJob[]; count: number }>(
        API_ENDPOINTS.DROPI.JOBS.LIST + '?limit=100'
      )
      if (response.data) {
        setJobs(response.data.jobs)
        // Actualizar jobs activos
        const active = new Map<string, DropiJob>()
        response.data.jobs.forEach(job => {
          if (job.status === 'PENDING' || job.status === 'RUNNING') {
            active.set(job.id, job)
          }
        })
        setActiveJobs(active)
      }
    } catch (error: any) {
      console.error('Error cargando jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar estado de un job específico
  const loadJobStatus = async (jobId: string) => {
    try {
      const response = await apiClient.get<DropiJob>(
        API_ENDPOINTS.DROPI.JOBS.BY_ID(jobId)
      )
      if (response.data) {
        setActiveJobs(prev => {
          const updated = new Map(prev)
          if (response.data.status === 'PENDING' || response.data.status === 'RUNNING') {
            updated.set(jobId, response.data)
          } else {
            updated.delete(jobId)
          }
          return updated
        })
        setJobs(prev => prev.map(j => j.id === jobId ? response.data : j))
      }
    } catch (error) {
      console.error('Error cargando estado del job:', error)
    }
  }

  // Obtener job activo de un proceso
  const getActiveJob = (processType: string) => {
    return Array.from(activeJobs.values()).find(
      j => j.type === processType && (j.status === 'PENDING' || j.status === 'RUNNING')
    )
  }

  // Obtener estadísticas de un proceso
  const getProcessStats = (processType: string) => {
    const processJobs = jobs.filter(job => job.type === processType)
    const total = processJobs.length
    const completed = processJobs.filter(j => j.status === 'DONE').length
    const failed = processJobs.filter(j => j.status === 'FAILED').length
    const lastRun = processJobs.length > 0 ? processJobs[0] : null

    return { total, completed, failed, lastRun }
  }

  // Cargar estado del proxy
  const loadProxyStatus = async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: ProxyStatus }>(
        API_ENDPOINTS.ADMIN.SYSTEM.PROXY_STATUS
      )
      if (response.data.success) {
        setProxyStatus(response.data.data)
      }
    } catch (error: any) {
      console.error('Error cargando estado del proxy:', error)
      // Si es 404, el endpoint no está disponible (backend no recompilado)
      if (error.response?.status === 404) {
        setProxyStatus({
          status: 'inactive',
          isActive: false,
          proxyUrl: null,
          message: 'Endpoint no disponible (backend necesita recompilarse)',
          timestamp: new Date().toISOString(),
        })
      } else {
        setProxyStatus({
          status: 'inactive',
          isActive: false,
          proxyUrl: null,
          message: `Error al verificar estado del proxy: ${error.message || 'Error desconocido'}`,
          timestamp: new Date().toISOString(),
        })
      }
    }
  }

  // Cargar jobs al montar y cada 5 segundos
  useEffect(() => {
    loadJobs()
    loadProxyStatus() // Cargar inmediatamente
    
    // Polling para jobs (cada 5 segundos)
    const jobsInterval = setInterval(() => {
      loadJobs()
    }, 5000)
    
    // Polling para proxy (cada 30 segundos - tiene cache de 30s en el backend)
    const proxyInterval = setInterval(() => {
      loadProxyStatus()
    }, 30000)
    
    return () => {
      clearInterval(jobsInterval)
      clearInterval(proxyInterval)
    }
  }, [])

  // Polling para jobs activos
  useEffect(() => {
    if (activeJobs.size === 0) return

    const interval = setInterval(() => {
      const jobIds = Array.from(activeJobs.keys())
      jobIds.forEach(jobId => {
        loadJobStatus(jobId)
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [activeJobs.size])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'RUNNING': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'DONE': return 'bg-green-100 text-green-800 border-green-200'
      case 'FAILED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendiente'
      case 'RUNNING': return 'Ejecutando'
      case 'DONE': return 'Completado'
      case 'FAILED': return 'Fallido'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Dashboard de Procesos Dropi
            </h1>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ServerIcon className="w-4 h-4" />
                <span>{config.apiUrl}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                config.isProduction 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {config.isProduction ? 'PRODUCCIÓN' : 'LOCAL'}
              </span>
              
              {/* Estado del Proxy */}
              {proxyStatus && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${
                  proxyStatus.isActive 
                    ? proxyStatus.status === 'active_with_errors'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-green-50 text-green-700 border-green-200'
                    : proxyStatus.status === 'not_configured'
                    ? 'bg-gray-50 text-gray-700 border-gray-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {proxyStatus.isActive ? (
                    proxyStatus.status === 'active_with_errors' ? (
                      <XCircleIcon className="w-4 h-4" />
                    ) : (
                      <CheckCircleIcon className="w-4 h-4" />
                    )
                  ) : (
                    <XCircleIcon className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    Proxy: {proxyStatus.status === 'not_configured' 
                      ? 'No configurado' 
                      : proxyStatus.status === 'active_with_errors'
                      ? 'Activo con errores'
                      : proxyStatus.isActive 
                      ? 'Activo' 
                      : 'Inactivo'}
                  </span>
                  {proxyStatus.responseTime && (
                    <span className="text-xs opacity-75">
                      ({proxyStatus.responseTime}ms)
                    </span>
                  )}
                  {proxyStatus.httpStatus && (
                    <span className="text-xs opacity-75">
                      [HTTP {proxyStatus.httpStatus}]
                    </span>
                  )}
                </div>
              )}
            </div>
            {proxyStatus && proxyStatus.message && (
              <p className="mt-2 text-xs text-gray-500">
                {proxyStatus.proxyUrl && (
                  <span className="mr-2">URL: {proxyStatus.proxyUrl}</span>
                )}
                {proxyStatus.message}
              </p>
            )}
          </div>
        </div>

        {/* Procesos principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROCESSES.map((process) => {
            const activeJob = getActiveJob(process.type)
            const stats = getProcessStats(process.type)

            return (
              <div
                key={process.id}
                onClick={() => router.push(process.route)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${process.color} rounded-lg flex items-center justify-center text-2xl shadow-sm`}>
                        {process.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{process.name}</h3>
                        <p className="text-sm text-gray-500">{process.description}</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </div>

                  {activeJob && (
                    <div className="space-y-3 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 font-medium">Ejecutando</span>
                        <span className="text-gray-900 font-semibold">{activeJob.progress}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full ${process.color} transition-all duration-300 rounded-full`}
                          style={{ width: `${activeJob.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {!activeJob && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Total ejecuciones:</span>
                        <span className="font-semibold text-gray-900">{stats.total}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Completadas:</span>
                        <span className="font-semibold text-green-600">{stats.completed}</span>
                      </div>
                      {stats.failed > 0 && (
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Fallidas:</span>
                          <span className="font-semibold text-red-600">{stats.failed}</span>
                        </div>
                      )}
                      {stats.lastRun && (
                        <div className="pt-2 mt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            Última ejecución: {stats.lastRun.finishedAt 
                              ? new Date(stats.lastRun.finishedAt).toLocaleString('es-ES', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })
                              : 'Nunca'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      Click para ver detalles
                      <ChevronRightIcon className="w-3 h-3" />
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
