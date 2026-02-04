'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { config } from '@/lib/config'
import { PlayIcon, StopIcon, ArrowPathIcon, ServerIcon } from '@heroicons/react/24/outline'

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

const PROCESSES = [
  {
    id: 'sync-raw',
    name: '1. Sincronizar RAW',
    description: 'Guarda JSON crudo en DropiRawProduct',
    endpoint: API_ENDPOINTS.DROPI.SYNC_RAW,
    type: 'RAW' as const,
    color: 'bg-blue-500',
    icon: '📦',
  },
  {
    id: 'normalize',
    name: '2. Normalizar',
    description: 'Normaliza a DropiProduct',
    endpoint: API_ENDPOINTS.DROPI.NORMALIZE,
    type: 'NORMALIZE' as const,
    color: 'bg-purple-500',
    icon: '🔄',
  },
  {
    id: 'enrich',
    name: '3. Enriquecer',
    description: 'Enriquece con descripciones e imágenes',
    endpoint: API_ENDPOINTS.DROPI.ENRICH,
    type: 'ENRICH' as const,
    color: 'bg-yellow-500',
    icon: '✨',
  },
  {
    id: 'sync-to-backend',
    name: '4. Sincronizar Backend',
    description: 'Sincroniza a Product/ProductVariant/WarehouseVariant',
    endpoint: API_ENDPOINTS.DROPI.SYNC_TO_BACKEND,
    type: 'SYNC_PRODUCT' as const,
    color: 'bg-green-500',
    icon: '🚀',
  },
]

export default function AdminDashboard() {
  const [jobs, setJobs] = useState<DropiJob[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState<Set<string>>(new Set())
  const [activeJobs, setActiveJobs] = useState<Map<string, DropiJob>>(new Map())

  // Cargar jobs
  const loadJobs = async () => {
    try {
      const response = await apiClient.get<{ jobs: DropiJob[]; count: number }>(
        API_ENDPOINTS.DROPI.JOBS.LIST + '?limit=30'
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
      // Mostrar error más descriptivo
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        alert(`❌ Error de conexión:\n\nPosibles causas:\n1. CORS: El backend no permite requests desde http://localhost:3001\n2. URL incorrecta: ${config.apiUrl}\n3. Backend no accesible\n\nRevisa la consola para más detalles.`)
      }
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
        // Actualizar en la lista de jobs
        setJobs(prev => prev.map(j => j.id === jobId ? response.data : j))
      }
    } catch (error) {
      console.error('Error cargando estado del job:', error)
    }
  }

  // Ejecutar proceso
  const executeProcess = async (process: typeof PROCESSES[0]) => {
    setExecuting(prev => new Set(prev).add(process.id))
    try {
      const response = await apiClient.post<{ jobId: string; status: string; type: string }>(
        process.endpoint,
        {}
      )
      if (response.data) {
        const jobId = response.data.jobId
        setActiveJobs(prev => new Map(prev).set(jobId, {
          id: jobId,
          type: process.type,
          status: 'PENDING',
          progress: 0,
          attempts: 0,
          error: null,
          createdAt: new Date().toISOString(),
          startedAt: null,
          finishedAt: null,
        }))
        await loadJobs()
        startJobPolling(jobId)
      }
    } catch (error: any) {
      console.error('Error ejecutando proceso:', error)
      alert(`Error: ${error.response?.data?.error || error.message || 'No se pudo ejecutar el proceso'}`)
    } finally {
      setExecuting(prev => {
        const updated = new Set(prev)
        updated.delete(process.id)
        return updated
      })
    }
  }

  // Polling para jobs activos
  const startJobPolling = (jobId: string) => {
    const interval = setInterval(async () => {
      await loadJobStatus(jobId)
      // El loadJobStatus ya actualiza activeJobs, así que no necesitamos verificar aquí
      // El useEffect principal se encargará de limpiar cuando activeJobs.size cambie
    }, 2000)
    
    // Limpiar después de 10 minutos como seguridad
    setTimeout(() => clearInterval(interval), 10 * 60 * 1000)
  }

  // Cancelar job
  const cancelJob = async (jobId: string) => {
    if (!confirm('¿Estás seguro de cancelar este job?')) return
    
    try {
      await apiClient.delete(API_ENDPOINTS.DROPI.JOBS.CANCEL(jobId))
      await loadJobs()
    } catch (error: any) {
      alert(`Error cancelando job: ${error.response?.data?.error || error.message}`)
    }
  }

  // Cargar jobs al montar y cada 5 segundos
  useEffect(() => {
    loadJobs()
    const interval = setInterval(loadJobs, 5000)
    return () => clearInterval(interval)
  }, [])

  // Polling para jobs activos
  useEffect(() => {
    if (activeJobs.size === 0) return

    const interval = setInterval(() => {
      // Obtener IDs de jobs activos actuales
      const jobIds = Array.from(activeJobs.keys())
      jobIds.forEach(jobId => {
        loadJobStatus(jobId)
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [activeJobs.size])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500'
      case 'RUNNING': return 'bg-blue-500'
      case 'DONE': return 'bg-green-500'
      case 'FAILED': return 'bg-red-500'
      default: return 'bg-gray-500'
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'RAW': return 'Sincronizar RAW'
      case 'NORMALIZE': return 'Normalizar'
      case 'ENRICH': return 'Enriquecer'
      case 'SYNC_PRODUCT': return 'Sincronizar Backend'
      case 'SYNC_STOCK': return 'Sincronizar Stock'
      default: return type
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#73FFA2] mb-2">
                🚀 Dashboard de Procesos Dropi
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <ServerIcon className="w-4 h-4" />
                <span>Conectado a: {config.apiUrl}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  config.isProduction ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  {config.isProduction ? 'PRODUCCIÓN' : 'LOCAL'}
                </span>
              </div>
            </div>
            <button
              onClick={loadJobs}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Actualizar
            </button>
          </div>
        </div>

        {/* Procesos principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {PROCESSES.map((process) => {
            const isExecuting = executing.has(process.id)
            const activeJob = Array.from(activeJobs.values()).find(
              j => j.type === process.type && (j.status === 'PENDING' || j.status === 'RUNNING')
            )

            return (
              <div
                key={process.id}
                className="bg-gray-800 rounded-lg p-6 border-2 border-gray-700 hover:border-[#73FFA2] transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{process.icon}</span>
                    <h3 className="text-lg font-semibold text-white">{process.name}</h3>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${process.color}`} />
                </div>
                <p className="text-sm text-gray-400 mb-4">{process.description}</p>

                {activeJob ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span>Estado: {getStatusLabel(activeJob.status)}</span>
                      <span>{activeJob.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${process.color}`}
                        style={{ width: `${activeJob.progress}%` }}
                      />
                    </div>
                    {(activeJob.status === 'RUNNING' || activeJob.status === 'PENDING') && (
                      <button
                        onClick={() => cancelJob(activeJob.id)}
                        className="w-full mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded flex items-center justify-center gap-1"
                      >
                        <StopIcon className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => executeProcess(process)}
                    disabled={isExecuting}
                    className={`w-full px-4 py-2 ${process.color} hover:opacity-90 text-white font-semibold rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isExecuting ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Ejecutando...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-4 h-4" />
                        Ejecutar
                      </>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Historial de jobs */}
        <div className="bg-gray-800 rounded-lg p-6 border-2 border-gray-700">
          <h2 className="text-xl font-semibold text-[#73FFA2] mb-4">Historial de Jobs</h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2] mx-auto"></div>
              <p className="text-gray-400 mt-2">Cargando jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay jobs registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300">Tipo</th>
                    <th className="text-left py-3 px-4 text-gray-300">Estado</th>
                    <th className="text-left py-3 px-4 text-gray-300">Progreso</th>
                    <th className="text-left py-3 px-4 text-gray-300">Inicio</th>
                    <th className="text-left py-3 px-4 text-gray-300">Fin</th>
                    <th className="text-left py-3 px-4 text-gray-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-4 text-white">{getTypeLabel(job.type)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusColor(job.status)}`}>
                          {getStatusLabel(job.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getStatusColor(job.status)}`}
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="text-gray-300 text-xs">{job.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {job.startedAt ? new Date(job.startedAt).toLocaleString('es-ES') : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {job.finishedAt ? new Date(job.finishedAt).toLocaleString('es-ES') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {(job.status === 'PENDING' || job.status === 'RUNNING') && (
                          <button
                            onClick={() => cancelJob(job.id)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                          >
                            Cancelar
                          </button>
                        )}
                        {job.error && (
                          <button
                            onClick={() => alert(job.error)}
                            className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded ml-2"
                            title={job.error}
                          >
                            Ver Error
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

