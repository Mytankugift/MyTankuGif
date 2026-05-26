'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  getPipelineEnrichMessage,
  getPipelineSyncProductMessage,
  type SyncStockPipelineFollowUp,
} from '@/lib/dropi/sync-stock-pipeline'

interface ChildJobSnapshot {
  status: string
  progress: number
}

interface Props {
  pipeline: SyncStockPipelineFollowUp | undefined
  chainEnrichOnComplete?: boolean
  syncStockJobStatus: string
  /** Si se pasa, al terminar enrich se vuelve a leer metadata del SYNC_STOCK padre */
  syncStockJobId?: string
  onPipelineUpdate?: (pipeline: SyncStockPipelineFollowUp | undefined) => void
  compact?: boolean
}

const TONE_CLASS = {
  success: 'border-green-200 bg-green-50/80',
  info: 'border-blue-200 bg-blue-50/80',
  muted: 'border-gray-200 bg-gray-50',
  warning: 'border-amber-200 bg-amber-50/80',
} as const

function ChildJobStatus({
  label,
  href,
  jobId,
  snapshot,
}: {
  label: string
  href: string
  jobId: string
  snapshot: ChildJobSnapshot | null
}) {
  const isActive = snapshot?.status === 'PENDING' || snapshot?.status === 'RUNNING'
  const isDone = snapshot?.status === 'DONE'
  const isFailed = snapshot?.status === 'FAILED'

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs mt-1.5">
      {isActive && <ArrowPathIcon className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
      {isDone && <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />}
      {isFailed && <XCircleIcon className="w-3.5 h-3.5 text-red-600" />}
      {!snapshot && <ClockIcon className="w-3.5 h-3.5 text-gray-400" />}
      <span className="text-gray-700">
        {label}
        {snapshot ? (
          <>
            {' '}
            · {snapshot.status === 'PENDING' ? 'En cola' : snapshot.status === 'RUNNING' ? 'Ejecutando' : snapshot.status === 'DONE' ? 'Completado' : 'Fallido'}
            {isActive || isDone ? ` · ${snapshot.progress}%` : null}
          </>
        ) : null}
      </span>
      <Link
        href={href}
        className="inline-flex items-center gap-0.5 font-medium text-indigo-600 hover:text-indigo-800"
      >
        Ver worker
        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
      </Link>
      <span className="text-gray-400 font-mono truncate max-w-[8rem]" title={jobId}>
        {jobId.slice(0, 8)}…
      </span>
    </div>
  )
}

export function SyncStockPipelineFollowUp({
  pipeline: pipelineProp,
  chainEnrichOnComplete = true,
  syncStockJobStatus,
  syncStockJobId,
  onPipelineUpdate,
  compact = false,
}: Props) {
  const [pipeline, setPipeline] = useState(pipelineProp)
  const [enrichSnap, setEnrichSnap] = useState<ChildJobSnapshot | null>(null)
  const [syncSnap, setSyncSnap] = useState<ChildJobSnapshot | null>(null)

  useEffect(() => {
    setPipeline(pipelineProp)
  }, [pipelineProp])

  const showPipeline =
    syncStockJobStatus === 'DONE' ||
    syncStockJobStatus === 'FAILED' ||
    !!pipeline?.enrich ||
    chainEnrichOnComplete === false

  const enrichMsg = getPipelineEnrichMessage(pipeline?.enrich, chainEnrichOnComplete !== false)
  const syncMsg = getPipelineSyncProductMessage(pipeline?.syncProduct)

  const enrichJobId = pipeline?.enrich?.jobId
  const syncJobId = pipeline?.syncProduct?.jobId

  useEffect(() => {
    if (!enrichJobId) {
      setEnrichSnap(null)
      return
    }

    let cancelled = false
    const poll = async () => {
      try {
        const res = await apiClient.get<{ status: string; progress: number }>(
          API_ENDPOINTS.DROPI.JOBS.BY_ID(enrichJobId),
          { params: { _t: Date.now() } }
        )
        if (!cancelled && res.data) {
          setEnrichSnap({ status: res.data.status, progress: res.data.progress })
          if (
            syncStockJobId &&
            onPipelineUpdate &&
            (res.data.status === 'DONE' || res.data.status === 'FAILED')
          ) {
            const parent = await apiClient.get<{ metadata?: { pipeline?: SyncStockPipelineFollowUp } }>(
              API_ENDPOINTS.DROPI.JOBS.BY_ID(syncStockJobId),
              { params: { _t: Date.now() } }
            )
            if (!cancelled && parent.data?.metadata?.pipeline) {
              setPipeline(parent.data.metadata.pipeline)
              onPipelineUpdate(parent.data.metadata.pipeline)
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    void poll()
    const id = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enrichJobId, syncStockJobId, onPipelineUpdate])

  useEffect(() => {
    if (!syncJobId) {
      setSyncSnap(null)
      return
    }

    let cancelled = false
    const poll = async () => {
      try {
        const res = await apiClient.get<{ status: string; progress: number }>(
          API_ENDPOINTS.DROPI.JOBS.BY_ID(syncJobId),
          { params: { _t: Date.now() } }
        )
        if (!cancelled && res.data) {
          setSyncSnap({ status: res.data.status, progress: res.data.progress })
        }
      } catch {
        /* ignore */
      }
    }

    void poll()
    const id = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [syncJobId])

  if (!showPipeline) return null

  return (
    <div
      className={`rounded-lg border ${compact ? 'p-3' : 'p-4'} space-y-3 border-indigo-200 bg-indigo-50/40`}
    >
      <p className={`font-medium text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
        Pipeline posterior (en paralelo)
      </p>
      <p className="text-xs text-gray-600">
        No forma parte del % de los 4 pasos. El cron de stock sigue en su intervalo.
      </p>

      <div className={`rounded-lg border px-3 py-2.5 ${TONE_CLASS[enrichMsg.tone]}`}>
        <p className="text-sm font-medium text-gray-900">{enrichMsg.title}</p>
        <p className="text-xs text-gray-600 mt-0.5 break-words">{enrichMsg.detail}</p>
        {enrichJobId ? (
          <ChildJobStatus
            label="Enrich"
            href="/workers/enrich"
            jobId={enrichJobId}
            snapshot={enrichSnap}
          />
        ) : null}
      </div>

      {syncMsg ? (
        <div className={`rounded-lg border px-3 py-2.5 ${TONE_CLASS[syncMsg.tone]}`}>
          <p className="text-sm font-medium text-gray-900">{syncMsg.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 break-words">{syncMsg.detail}</p>
          {syncJobId ? (
            <ChildJobStatus
              label="Propagar a Tanku"
              href="/workers/sync-to-backend"
              jobId={syncJobId}
              snapshot={syncSnap}
            />
          ) : null}
        </div>
      ) : enrichSnap?.status === 'DONE' && pipeline?.enrich?.enqueued ? (
        <p className="text-xs text-gray-500">
          Propagar a Tanku se encolará al terminar enrich si hubo productos enriquecidos.
        </p>
      ) : null}
    </div>
  )
}
