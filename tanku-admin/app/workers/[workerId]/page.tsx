'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { 
  PlayIcon, 
  StopIcon, 
  ArrowPathIcon,
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
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

interface ProcessStep {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  message?: string
}

const PROCESSES: Record<string, {
  id: string
  name: string
  description: string
  type: 'RAW' | 'NORMALIZE' | 'ENRICH' | 'SYNC_PRODUCT' | 'SYNC_STOCK'
  color: string
  icon: string
  endpoint: string
  steps: Array<{ name: string; key: string }>
}> = {
  'sync-raw': {
    id: 'sync-raw',
    name: 'Sincronizar RAW',
    description: 'Guarda JSON crudo en DropiRawProduct',
    endpoint: API_ENDPOINTS.DROPI.SYNC_RAW,
    type: 'RAW',
    color: 'bg-blue-500',
    icon: '📦',
    steps: [
      { name: 'Sincronizando productos RAW', key: 'raw' }
    ]
  },
  'normalize': {
    id: 'normalize',
    name: 'Normalizar',
    description: 'Normaliza a DropiProduct',
    endpoint: API_ENDPOINTS.DROPI.NORMALIZE,
    type: 'NORMALIZE',
    color: 'bg-purple-500',
    icon: '🔄',
    steps: [
      { name: 'Normalizando productos', key: 'normalize' }
    ]
  },
  'enrich': {
    id: 'enrich',
    name: 'Enriquecer',
    description: 'Enriquece con descripciones e imágenes',
    endpoint: API_ENDPOINTS.DROPI.ENRICH,
    type: 'ENRICH',
    color: 'bg-yellow-500',
    icon: '✨',
    steps: [
      { name: 'Enriqueciendo productos', key: 'enrich' }
    ]
  },
  'sync-backend': {
    id: 'sync-to-backend',
    name: 'Sincronizar Backend',
    description: 'Sincroniza a Product/ProductVariant/WarehouseVariant',
    endpoint: API_ENDPOINTS.DROPI.SYNC_TO_BACKEND,
    type: 'SYNC_PRODUCT',
    color: 'bg-green-500',
    icon: '🚀',
    steps: [
      { name: 'Sincronizando al backend', key: 'sync' }
    ]
  },
  'sync-stock': {
    id: 'sync-stock',
    name: 'Sincronizar Stock',
    description: 'Actualiza stock y precios, marca productos sin stock como inactivos',
    endpoint: API_ENDPOINTS.DROPI.SYNC_STOCK,
    type: 'SYNC_STOCK',
    color: 'bg-indigo-500',
    icon: '📊',
    steps: [
      { name: 'Sincronizando RAW', key: 'raw' },
      { name: 'Normalizando productos', key: 'normalize' },
      { name: 'Sincronizando al backend', key: 'sync' },
      { name: 'Actualizando estados', key: 'status' }
    ]
  },
}

export default function WorkerPage() {
  const router = useRouter()
  const params = useParams()
  const workerId = params.workerId as string

  const [jobs, setJobs] = useState<DropiJob[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [activeJob, setActiveJob] = useState<DropiJob | null>(null)
  const [expandedHistory, setExpandedHistory] = useState(true)
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([])

  const process = PROCESSES[workerId]

  if (!process) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <p className="text-gray-600">Worker no encontrado</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg"
            >
              Volver al dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Cargar jobs del proceso
  const loadJobs = async () => {
    try {
      const response = await apiClient.get<{ jobs: DropiJob[]; count: number }>(
        `${API_ENDPOINTS.DROPI.JOBS.LIST}?limit=100&type=${process.type}`
      )
      if (response.data) {
        // El backend ya filtra por tipo, pero por si acaso filtramos también en el frontend
        const processJobs = response.data.jobs.filter(job => job.type === process.type)
        setJobs(processJobs)
        
        // Buscar job activo
        const active = processJobs.find(
          j => j.status === 'PENDING' || j.status === 'RUNNING'
        )
        setActiveJob(active || null)
        
        if (active) {
          updateSteps(active)
        }
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
        if (response.data.status === 'PENDING' || response.data.status === 'RUNNING') {
          setActiveJob(response.data)
          updateSteps(response.data)
        } else {
          setActiveJob(null)
        }
        setJobs(prev => prev.map(j => j.id === jobId ? response.data : j))
      }
    } catch (error) {
      console.error('Error cargando estado del job:', error)
    }
  }

  // Actualizar pasos del proceso
  const updateSteps = (job: DropiJob) => {
    const steps: ProcessStep[] = process.steps.map((step, index) => {
      const totalSteps = process.steps.length
      const stepProgress = Math.floor((job.progress / totalSteps) * 100)
      
      if (job.status === 'RUNNING') {
        if (index * (100 / totalSteps) < job.progress) {
          return { ...step, status: 'completed' as const, progress: 100 }
        } else if (index * (100 / totalSteps) <= job.progress && job.progress < (index + 1) * (100 / totalSteps)) {
          return { ...step, status: 'running' as const, progress: (job.progress % (100 / totalSteps)) * totalSteps }
        } else {
          return { ...step, status: 'pending' as const }
        }
      } else if (job.status === 'DONE') {
        return { ...step, status: 'completed' as const, progress: 100 }
      } else if (job.status === 'FAILED') {
        return { ...step, status: 'failed' as const }
      } else {
        return { ...step, status: 'pending' as const }
      }
    })

    setProcessSteps(steps)
  }

  // Ejecutar proceso
  const executeProcess = async () => {
    setExecuting(true)
    try {
      const response = await apiClient.post<{ jobId: string; status: string; type: string }>(
        process.endpoint,
        {}
      )
      if (response.data) {
        await loadJobs()
        startJobPolling(response.data.jobId)
      }
    } catch (error: any) {
      console.error('Error ejecutando proceso:', error)
      alert(`Error: ${error.response?.data?.error || error.message || 'No se pudo ejecutar el proceso'}`)
    } finally {
      setExecuting(false)
    }
  }

  // Polling para jobs activos
  const startJobPolling = (jobId: string) => {
    const interval = setInterval(async () => {
      await loadJobStatus(jobId)
      // Si el job terminó, dejar de hacer polling
      const currentJob = jobs.find(j => j.id === jobId)
      if (currentJob && (currentJob.status === 'DONE' || currentJob.status === 'FAILED')) {
        clearInterval(interval)
      }
    }, 2000)
    
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

  // Polling para job activo
  useEffect(() => {
    if (!activeJob) return

    const interval = setInterval(() => {
      loadJobStatus(activeJob.id)
    }, 2000)

    return () => clearInterval(interval)
  }, [activeJob?.id])

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

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'running': return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed': return <XCircleIcon className="w-5 h-5 text-red-500" />
      default: return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Volver al dashboard</span>
          </button>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-4 mb-2">
              <div className={`w-16 h-16 ${process.color} rounded-xl flex items-center justify-center text-3xl shadow-sm`}>
                {process.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{process.name}</h1>
                <p className="text-sm text-gray-600">{process.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estado actual */}
        {activeJob && (
          <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Ejecución Actual</h2>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(activeJob.status)}`}>
                {getStatusLabel(activeJob.status)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Progreso general</span>
                  <span className="text-gray-900 font-semibold">{activeJob.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${process.color} transition-all duration-300 rounded-full`}
                    style={{ width: `${activeJob.progress}%` }}
                  />
                </div>
              </div>

              {/* Pasos del proceso */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Pasos del proceso</h3>
                {processSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    {getStepStatusIcon(step.status)}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        step.status === 'completed' ? 'text-gray-900' : 
                        step.status === 'running' ? 'text-blue-600' : 
                        'text-gray-500'
                      }`}>
                        {step.name}
                      </p>
                      {step.progress !== undefined && step.status === 'running' && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {step.progress !== undefined && step.status === 'running' && (
                      <span className="text-xs text-gray-500 font-medium">{Math.round(step.progress)}%</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-gray-500">
                <span>Iniciado: {activeJob.startedAt ? new Date(activeJob.startedAt).toLocaleString('es-ES') : '-'}</span>
                <button
                  onClick={() => cancelJob(activeJob.id)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors border border-red-200"
                >
                  <StopIcon className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botón ejecutar si no hay job activo */}
        {!activeJob && (
          <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <button
              onClick={executeProcess}
              disabled={executing}
              className={`w-full px-6 py-4 ${process.color} hover:opacity-90 text-white font-semibold rounded-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm text-lg`}
            >
              {executing ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Ejecutando...
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  Ejecutar Proceso
                </>
              )}
            </button>
          </div>
        )}

        {/* Historial */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => setExpandedHistory(!expandedHistory)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Historial</h2>
              <p className="text-sm text-gray-500 mt-1">{jobs.length} ejecuciones</p>
            </div>
            {expandedHistory ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedHistory && (
            <div className="border-t border-gray-200">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-gray-500 mt-3">Cargando historial...</p>
                </div>
              ) : jobs.length === 0 ? (
                <p className="text-gray-500 text-center py-12">No hay historial</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(job.status)}`}>
                            {getStatusLabel(job.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {job.startedAt ? new Date(job.startedAt).toLocaleString('es-ES') : 'No iniciado'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{job.progress}%</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full ${getStatusColor(job.status).split(' ')[0]}`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {job.finishedAt 
                            ? `Finalizado: ${new Date(job.finishedAt).toLocaleString('es-ES')}`
                            : 'En progreso...'}
                        </span>
                        {(job.status === 'PENDING' || job.status === 'RUNNING') && (
                          <button
                            onClick={() => cancelJob(job.id)}
                            className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>

                      {job.error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs text-red-700 font-medium">Error:</p>
                          <p className="text-xs text-red-600 mt-1">{job.error}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

