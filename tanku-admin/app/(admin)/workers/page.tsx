'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import {
  computeSyncStockOverallProgress,
  getSyncStockActiveStepLabel,
} from '@/lib/dropi/sync-stock-progress'
import { parseSyncStockMetadata } from '@/lib/dropi/parse-sync-stock-metadata'
import { WORKER_PROCESSES } from '@/lib/admin/worker-processes'

interface DropiJob {
  id: string
  type: 'RAW' | 'NORMALIZE' | 'ENRICH' | 'SYNC_PRODUCT' | 'SYNC_STOCK'
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
  progress: number
  attempts: number
  error: string | null
  metadata?: unknown
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

export default function WorkersDashboard() {
  const router = useRouter()
  const { isAuthenticated } = useAdminAuthStore()
  const hasHydrated = useAdminAuthStore((state) => state._hasHydrated)
  const [jobs, setJobs] = useState<DropiJob[]>([])
  const [loading, setLoading] = useState(true)
  const [activeJobs, setActiveJobs] = useState<Map<string, DropiJob>>(new Map())

  const loadJobs = useCallback(async () => {
    try {
      const response = await apiClient.get<{ jobs: DropiJob[]; count: number }>(
        API_ENDPOINTS.DROPI.JOBS.LIST + '?limit=10'
      )
      if (response.data) {
        setJobs(response.data.jobs)
        const active = new Map<string, DropiJob>()
        response.data.jobs.forEach((job) => {
          if (job.status === 'PENDING' || job.status === 'RUNNING') {
            active.set(job.id, job)
          }
        })
        setActiveJobs(active)
      }
    } catch (error: unknown) {
      console.error('Error cargando jobs:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await apiClient.get<DropiJob>(API_ENDPOINTS.DROPI.JOBS.BY_ID(jobId))
      if (response.data) {
        setActiveJobs((prev) => {
          const updated = new Map(prev)
          if (response.data.status === 'PENDING' || response.data.status === 'RUNNING') {
            updated.set(jobId, response.data)
          } else {
            updated.delete(jobId)
          }
          return updated
        })
        setJobs((prev) => prev.map((j) => (j.id === jobId ? response.data : j)))
      }
    } catch (error) {
      console.error('Error cargando estado del job:', error)
    }
  }, [])

  const getActiveJob = (processType: string) => {
    return Array.from(activeJobs.values()).find(
      (j) => j.type === processType && (j.status === 'PENDING' || j.status === 'RUNNING')
    )
  }

  const getProcessStats = (processType: string) => {
    const processJobs = jobs.filter((job) => job.type === processType)
    const total = processJobs.length
    const completed = processJobs.filter((j) => j.status === 'DONE').length
    const failed = processJobs.filter((j) => j.status === 'FAILED').length
    const lastRun = processJobs.length > 0 ? processJobs[0] : null

    return { total, completed, failed, lastRun }
  }

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return

    loadJobs()

    const jobsInterval = setInterval(() => {
      loadJobs()
    }, 20000)

    return () => {
      clearInterval(jobsInterval)
    }
  }, [hasHydrated, isAuthenticated, loadJobs])

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || activeJobs.size === 0) return

    const interval = setInterval(() => {
      const jobIds = Array.from(activeJobs.keys())
      jobIds.forEach((jobId) => {
        loadJobStatus(jobId)
      })
    }, 8000)

    return () => clearInterval(interval)
  }, [hasHydrated, activeJobs.size, isAuthenticated, loadJobStatus])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendiente'
      case 'RUNNING':
        return 'Ejecutando'
      case 'DONE':
        return 'Completado'
      case 'FAILED':
        return 'Fallido'
      default:
        return status
    }
  }

  const getJobProgressLabel = (job: DropiJob) => {
    if (job.type === 'SYNC_STOCK') {
      const step = getSyncStockActiveStepLabel(job.metadata)
      if (step) return step
      if (job.status === 'PENDING') return 'En cola'
    }
    return job.status === 'PENDING' ? 'En cola' : getStatusLabel(job.status)
  }

  const getJobProgressPercent = (job: DropiJob) => {
    if (job.type === 'SYNC_STOCK') {
      const meta = parseSyncStockMetadata(job.metadata)
      if (meta) return computeSyncStockOverallProgress(meta)
    }
    return job.progress
  }

  if (!hasHydrated || !isAuthenticated) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {WORKER_PROCESSES.map((process) => {
            const activeJob = getActiveJob(process.type)
            const stats = getProcessStats(process.type)
            const progressPct = activeJob ? getJobProgressPercent(activeJob) : 0
            const progressLabel = activeJob ? getJobProgressLabel(activeJob) : null

            return (
              <button
                key={process.id}
                type="button"
                onClick={() => router.push(process.route)}
                className="text-left bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 ${process.color} rounded-lg flex items-center justify-center text-xl shrink-0`}
                    >
                      {process.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900">{process.name}</h3>
                            {process.badge === 'cron' ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200">
                                Cron
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{process.description}</p>
                    </div>
                  </div>

                  {activeJob ? (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between gap-2 text-sm mb-2">
                        <span className="font-medium text-blue-800 truncate">{progressLabel}</span>
                        <span className="text-gray-900 font-semibold tabular-nums shrink-0">
                          {progressPct}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${process.color} transition-all duration-300 rounded-full`}
                          style={{ width: `${Math.min(100, progressPct)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {stats.lastRun?.finishedAt ? (
                        <p className="text-xs text-gray-500">
                          Última vez:{' '}
                          {new Date(stats.lastRun.finishedAt).toLocaleString('es-ES', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      ) : stats.lastRun?.status === 'FAILED' ? (
                        <p className="text-xs text-red-600">Última ejecución fallida</p>
                      ) : (
                        <p className="text-xs text-gray-400">Sin ejecuciones recientes</p>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
