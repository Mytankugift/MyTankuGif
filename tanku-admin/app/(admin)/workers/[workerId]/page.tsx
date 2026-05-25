'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  SyncStockJobProgress,
  type SyncStockJobMetadata,
} from '@/components/workers/SyncStockJobProgress'
import {
  computeSyncStockOverallProgress,
  getSyncStockActiveStepLabel,
} from '@/lib/dropi/sync-stock-progress'
import { parseSyncStockMetadata } from '@/lib/dropi/parse-sync-stock-metadata'
import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal'
import { getWorkerProcess } from '@/lib/admin/worker-processes'
import { useWorkerToolbarStore } from '@/lib/stores/worker-toolbar-store'
import {
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'

interface DropiJob {
  id: string
  type: 'RAW' | 'NORMALIZE' | 'ENRICH' | 'SYNC_PRODUCT' | 'SYNC_STOCK'
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
  progress: number
  metadata?: SyncStockJobMetadata | null
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

const POLL_ACTIVE_MS = 5000
const POLL_IDLE_LIST_MS = 45000

function noCacheParams() {
  return { _t: Date.now() }
}

export default function WorkerPage() {
  const params = useParams()
  const workerId = params.workerId as string

  const [jobs, setJobs] = useState<DropiJob[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [activeJob, setActiveJob] = useState<DropiJob | null>(null)
  const [expandedHistory, setExpandedHistory] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([])
  const [expandedHistoryJobId, setExpandedHistoryJobId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<
    'execute' | { type: 'cancel'; jobId: string } | null
  >(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [propagateProductFicha, setPropagateProductFicha] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeJobIdRef = useRef<string | null>(null)

  const process = getWorkerProcess(workerId)
  const isSyncStock = workerId === 'sync-stock'

  const updateSteps = useCallback(
    (job: DropiJob) => {
      if (!process) return
      const steps: ProcessStep[] = process.steps.map((step, index) => {
        const totalSteps = process.steps.length
        if (job.status === 'RUNNING') {
          if (index * (100 / totalSteps) < job.progress) {
            return { ...step, status: 'completed' as const, progress: 100 }
          }
          if (
            index * (100 / totalSteps) <= job.progress &&
            job.progress < (index + 1) * (100 / totalSteps)
          ) {
            return {
              ...step,
              status: 'running' as const,
              progress: (job.progress % (100 / totalSteps)) * totalSteps,
            }
          }
          return { ...step, status: 'pending' as const }
        }
        if (job.status === 'DONE') {
          return { ...step, status: 'completed' as const, progress: 100 }
        }
        if (job.status === 'FAILED') {
          return { ...step, status: 'failed' as const }
        }
        return { ...step, status: 'pending' as const }
      })
      setProcessSteps(steps)
    },
    [process]
  )

  const loadJobs = useCallback(async () => {
    if (!process) return
    try {
      const response = await apiClient.get<{ jobs: DropiJob[]; count: number }>(
        API_ENDPOINTS.DROPI.JOBS.LIST,
        {
          params: {
            limit: 10,
            type: process.type,
            ...noCacheParams(),
          },
        }
      )
      if (response.data) {
        const processJobs = response.data.jobs
          .filter((job) => job.type === process.type)
          .map((job) =>
            isSyncStock
              ? { ...job, metadata: parseSyncStockMetadata(job.metadata) ?? job.metadata }
              : job
          )
        setJobs(processJobs)
        const active = processJobs.find(
          (j) => j.status === 'PENDING' || j.status === 'RUNNING'
        )
        setActiveJob(active || null)
        activeJobIdRef.current = active?.id ?? null
        if (active && !isSyncStock) {
          updateSteps(active)
        }
      }
    } catch (error: unknown) {
      console.error('Error cargando jobs:', error)
    } finally {
      setLoading(false)
    }
  }, [process, isSyncStock, updateSteps])

  const loadJobStatus = useCallback(
    async (jobId: string): Promise<DropiJob | null> => {
      try {
        const response = await apiClient.get<DropiJob>(
          API_ENDPOINTS.DROPI.JOBS.BY_ID(jobId),
          { params: noCacheParams() }
        )
        if (!response.data) return null

        const job = {
          ...response.data,
          metadata: isSyncStock
            ? parseSyncStockMetadata(response.data.metadata) ?? response.data.metadata
            : response.data.metadata,
        }
        setJobs((prev) => prev.map((j) => (j.id === jobId ? job : j)))

        if (job.status === 'PENDING' || job.status === 'RUNNING') {
          setActiveJob(job)
          activeJobIdRef.current = job.id
          if (!isSyncStock) updateSteps(job)
        } else {
          setActiveJob(null)
          activeJobIdRef.current = null
          void loadJobs()
        }
        return job
      } catch (error) {
        console.error('Error cargando estado del job:', error)
        return null
      }
    },
    [isSyncStock, updateSteps, loadJobs]
  )

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const setWorkerPage = useWorkerToolbarStore((s) => s.setWorkerPage)
  const patchWorkerPage = useWorkerToolbarStore((s) => s.patchWorkerPage)
  const clearWorkerPage = useWorkerToolbarStore((s) => s.clearWorkerPage)

  const executeProcess = useCallback(async () => {
    if (!process) return
    setExecuting(true)
    try {
      const body =
        isSyncStock && propagateProductFicha ? { propagateProductFicha: true } : {}
      const response = await apiClient.post<{ jobId: string; status: string; type: string }>(
        process.endpoint,
        body
      )
      if (response.data) {
        await loadJobs()
        void loadJobStatus(response.data.jobId)
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string }
      console.error('Error ejecutando proceso:', error)
      alert(
        `Error: ${err.response?.data?.error || err.message || 'No se pudo ejecutar el proceso'}`
      )
    } finally {
      setExecuting(false)
    }
  }, [process, loadJobs, loadJobStatus, isSyncStock, propagateProductFicha])

  const cancelJob = useCallback(
    async (jobId: string) => {
      stopPolling()
      setActiveJob(null)
      activeJobIdRef.current = null
      try {
        await apiClient.delete(API_ENDPOINTS.DROPI.JOBS.CANCEL(jobId))
        await loadJobs()
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string }
        alert(`Error cancelando job: ${err.response?.data?.error || err.message}`)
        await loadJobs()
      }
    },
    [stopPolling, loadJobs]
  )

  useEffect(() => {
    if (!process) return
    setWorkerPage(workerId, {
      execute: () => setConfirmAction('execute'),
      cancel: (id) => setConfirmAction({ type: 'cancel', jobId: id }),
    })
    return () => clearWorkerPage()
  }, [workerId, process, setWorkerPage, clearWorkerPage])

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return
    setConfirmLoading(true)
    try {
      if (confirmAction === 'execute') {
        await executeProcess()
      } else {
        await cancelJob(confirmAction.jobId)
      }
      setConfirmAction(null)
    } finally {
      setConfirmLoading(false)
    }
  }, [confirmAction, executeProcess, cancelJob])

  useEffect(() => {
    if (!process) return
    void loadJobs()
    const interval = setInterval(() => {
      if (!activeJobIdRef.current) void loadJobs()
    }, POLL_IDLE_LIST_MS)
    return () => clearInterval(interval)
  }, [process, loadJobs])

  useEffect(() => {
    stopPolling()
    if (!activeJob?.id) return

    const jobId = activeJob.id
    const poll = async () => {
      if (activeJobIdRef.current !== jobId) return
      const job = await loadJobStatus(jobId)
      if (job && (job.status === 'DONE' || job.status === 'FAILED')) {
        stopPolling()
      }
    }

    void poll()
    pollingRef.current = setInterval(poll, POLL_ACTIVE_MS)
    return stopPolling
  }, [activeJob?.id, loadJobStatus, stopPolling])

  const syncStockOverall =
    activeJob && isSyncStock
      ? computeSyncStockOverallProgress(activeJob.metadata)
      : activeJob?.progress ?? 0

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

  useEffect(() => {
    if (!process) return
    const syncStepLabel =
      isSyncStock && activeJob ? getSyncStockActiveStepLabel(activeJob.metadata) : null

    patchWorkerPage({
      executing,
      activeJob: activeJob
        ? {
            id: activeJob.id,
            status: activeJob.status,
            statusLabel:
              syncStepLabel ??
              (activeJob.status === 'PENDING' ? 'En cola' : getStatusLabel(activeJob.status)),
            progressText: isSyncStock
              ? `${syncStockOverall}%`
              : `${activeJob.progress}%`,
          }
        : null,
    })
  }, [executing, activeJob, syncStockOverall, isSyncStock, process, patchWorkerPage])

  useEffect(() => {
    if (loading) return
    setHistoryReady(true)
  }, [loading])

  useEffect(() => {
    if (!historyReady) return
    if (activeJob) {
      setExpandedHistory(false)
      setExpandedHistoryJobId(null)
    } else {
      setExpandedHistory(true)
    }
  }, [historyReady, activeJob?.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'DONE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'running':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  if (!process) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="text-gray-600">Worker no encontrado</p>
      </div>
    )
  }

  const historyLocked = !!activeJob

  return (
    <AdminPageShell>
      <div className="flex flex-col gap-10">
          {activeJob && (
            <section className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Proceso en curso</h2>
              {isSyncStock ? (
              <SyncStockJobProgress
                metadata={parseSyncStockMetadata(activeJob.metadata)}
                jobStatus={activeJob.status}
                overallProgress={syncStockOverall}
                fallbackProgress={activeJob.progress}
              />
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Progreso</span>
                      <span className="text-gray-900 font-semibold">{activeJob.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                        style={{ width: `${activeJob.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {processSteps.map((step, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg"
                      >
                        {getStepStatusIcon(step.status)}
                        <p className="text-sm font-medium text-gray-800 flex-1">{step.name}</p>
                        {step.status === 'running' && step.progress !== undefined && (
                          <span className="text-xs text-gray-500">{Math.round(step.progress)}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                {activeJob.startedAt ? (
                  <>
                    Iniciado: {new Date(activeJob.startedAt).toLocaleString('es-ES')}
                  </>
                ) : activeJob.createdAt ? (
                  <>
                    Encolado: {new Date(activeJob.createdAt).toLocaleString('es-ES')}
                    {activeJob.status === 'PENDING' ? ' (esperando worker)' : null}
                  </>
                ) : (
                  'Sin fecha'
                )}
              </p>
            </section>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={() => {
                if (historyLocked) return
                setExpandedHistory(!expandedHistory)
              }}
              disabled={historyLocked}
              aria-expanded={expandedHistory}
              className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${
                historyLocked
                  ? 'cursor-not-allowed bg-gray-50/80'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="text-left">
                <h2 className="text-base font-semibold text-gray-900">Historial</h2>
                <p className="text-sm text-gray-500">
                  {historyLocked
                    ? 'Disponible cuando termine el proceso en curso'
                    : `Últimas ${jobs.length} ejecuciones (máx. 10 por tipo en BD)`}
                </p>
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
                    <p className="text-gray-500 mt-3 text-sm">Cargando historial...</p>
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-gray-500 text-center py-12 text-sm">No hay historial</p>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {jobs.map((job) => {
                      const historyProgress = isSyncStock
                        ? computeSyncStockOverallProgress(job.metadata)
                        : job.progress
                      const showDetail =
                        isSyncStock &&
                        !!job.metadata &&
                        expandedHistoryJobId === job.id

                      return (
                        <div key={job.id} className="px-5 py-4 hover:bg-gray-50/80">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-xs font-medium border ${getStatusColor(job.status)}`}
                              >
                                {getStatusLabel(job.status)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {job.startedAt
                                  ? new Date(job.startedAt).toLocaleString('es-ES')
                                  : 'No iniciado'}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 tabular-nums">
                              {historyProgress}%
                            </span>
                          </div>

                          {!isSyncStock && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                              <div
                                className={`h-1.5 rounded-full ${getStatusColor(job.status).split(' ')[0]}`}
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          )}

                          {isSyncStock && job.metadata && (
                            <div className="mb-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedHistoryJobId((id) =>
                                    id === job.id ? null : job.id
                                  )
                                }
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                {expandedHistoryJobId === job.id
                                  ? 'Ocultar detalle'
                                  : 'Ver detalle por pasos'}
                              </button>
                              {showDetail && (
                                <div className="mt-2">
                                  <SyncStockJobProgress
                                    metadata={job.metadata}
                                    jobStatus={job.status}
                                    overallProgress={historyProgress}
                                    compact
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              {job.finishedAt
                                ? `Finalizado: ${new Date(job.finishedAt).toLocaleString('es-ES')}`
                                : 'En progreso...'}
                            </span>
                            {(job.status === 'PENDING' || job.status === 'RUNNING') &&
                              job.id !== activeJob?.id && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmAction({ type: 'cancel', jobId: job.id })
                                  }
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200"
                                >
                                  Cancelar
                                </button>
                              )}
                          </div>

                          {job.error && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-xs text-red-600">{job.error}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      <AdminConfirmModal
        open={confirmAction !== null}
        title={
          confirmAction === 'execute'
            ? `Ejecutar ${process.name}`
            : 'Cancelar ejecución'
        }
        message={
          confirmAction === 'execute' ? (
            <>
              <p className="mb-3">
                Se encolará el proceso <strong>{process.name}</strong>. Puede tardar varios minutos
                según el catálogo Dropi.
              </p>
              {isSyncStock ? (
                <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-gray-300"
                    checked={propagateProductFicha}
                    onChange={(e) => setPropagateProductFicha(e.target.checked)}
                  />
                  <span>
                    <strong>Actualizar ficha en Tanku</strong> (descripción e imágenes desde
                    enrich). Recomendado tras <strong>Enriquecer</strong>. El cron no usa esta
                    opción.
                  </span>
                </label>
              ) : null}
            </>
          ) : confirmAction ? (
            <>
              ¿Cancelar el job en curso? El worker dejará de procesarlo; los datos ya guardados no
              se revierten.
            </>
          ) : null
        }
        confirmLabel={confirmAction === 'execute' ? 'Ejecutar' : 'Cancelar job'}
        variant={confirmAction === 'execute' ? 'primary' : 'danger'}
        loading={confirmLoading || executing}
        onClose={() => !confirmLoading && setConfirmAction(null)}
        onConfirm={() => void handleConfirmAction()}
      />
    </AdminPageShell>
  )
}
