'use client'

import { useState } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import {
  SyncStockJobProgress,
  type SyncStockJobMetadata,
} from '@/components/workers/SyncStockJobProgress'
import { SyncStockPipelineFollowUp } from '@/components/workers/SyncStockPipelineFollowUp'
import { computeJobDurationMs, formatDurationMs } from '@/lib/dropi/job-duration'
import { getWorkerHighlightStats } from '@/lib/dropi/worker-result-stats'

interface JobSummary {
  id: string
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
  progress: number
  metadata?: unknown
  error: string | null
  attempts: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

interface Props {
  job: JobSummary
  workerId: string
  isSyncStock: boolean
  overallProgress: number
  getStatusLabel: (status: string) => string
  getStatusColor: (status: string) => string
  onRefreshJob?: () => void
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'DONE':
      return <CheckCircleIcon className="w-8 h-8 text-green-600" />
    case 'FAILED':
      return <XCircleIcon className="w-8 h-8 text-red-600" />
    case 'RUNNING':
      return <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
    default:
      return <ClockIcon className="w-8 h-8 text-amber-600" />
  }
}

export function WorkerLastRunSummary({
  job,
  workerId,
  isSyncStock,
  overallProgress,
  getStatusLabel,
  getStatusColor,
  onRefreshJob,
}: Props) {
  const [showStepDetail, setShowStepDetail] = useState(false)

  const durationMs = computeJobDurationMs(job)
  const highlights = getWorkerHighlightStats(workerId, job.metadata)
  const syncStockMetadata = isSyncStock
    ? (job.metadata as SyncStockJobMetadata | null | undefined)
    : null
  const startedLabel = job.startedAt
    ? new Date(job.startedAt).toLocaleString('es-ES')
    : new Date(job.createdAt).toLocaleString('es-ES')
  const finishedLabel = job.finishedAt
    ? new Date(job.finishedAt).toLocaleString('es-ES')
    : null

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div
        className={`px-5 py-4 border-b ${
          job.status === 'DONE'
            ? 'bg-gradient-to-r from-green-50 to-emerald-50/80 border-green-100'
            : job.status === 'FAILED'
              ? 'bg-gradient-to-r from-red-50 to-rose-50/80 border-red-100'
              : 'bg-gradient-to-r from-slate-50 to-gray-50 border-gray-100'
        }`}
      >
        <div className="flex flex-wrap items-start gap-4">
          <StatusIcon status={job.status} />
          <div className="flex-1 min-w-[12rem]">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">Última ejecución</h2>
              <span
                className={`px-2.5 py-0.5 rounded-lg text-xs font-medium border ${getStatusColor(job.status)}`}
              >
                {getStatusLabel(job.status)}
              </span>
              <span className="text-xs text-gray-500 tabular-nums">{overallProgress}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-mono truncate" title={job.id}>
              ID: {job.id}
            </p>
          </div>

          {durationMs !== null && (
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                Duración
              </p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight">
                {formatDurationMs(durationMs)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2 text-gray-600">
            <CalendarDaysIcon className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Inicio</p>
              <p className="text-gray-900">{startedLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-gray-600">
            <CalendarDaysIcon className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Fin</p>
              <p className="text-gray-900">{finishedLabel ?? '—'}</p>
            </div>
          </div>
        </div>

        {!isSyncStock && (
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-600">Progreso alcanzado</span>
              <span className="font-semibold tabular-nums">{job.progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  job.status === 'FAILED' ? 'bg-red-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, job.progress)}%` }}
              />
            </div>
            {job.attempts > 1 && (
              <p className="text-xs text-gray-500 mt-1">Intentos: {job.attempts}</p>
            )}
          </div>
        )}

        {highlights.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {highlights.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"
              >
                <p className="text-[10px] uppercase tracking-wide text-gray-500 truncate">
                  {label}
                </p>
                <p className="text-sm font-semibold text-gray-900 tabular-nums mt-0.5">
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {isSyncStock && (
          <SyncStockPipelineFollowUp
            pipeline={syncStockMetadata?.pipeline}
            chainEnrichOnComplete={syncStockMetadata?.chainEnrichOnComplete}
            syncStockJobStatus={job.status}
            syncStockJobId={job.id}
            onPipelineUpdate={onRefreshJob ? () => onRefreshJob() : undefined}
            compact
          />
        )}

        {isSyncStock && syncStockMetadata?.steps && (
          <div>
            <button
              type="button"
              onClick={() => setShowStepDetail((v) => !v)}
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              {showStepDetail ? (
                <>
                  <ChevronUpIcon className="w-4 h-4" />
                  Ocultar detalle por pasos
                </>
              ) : (
                <>
                  <ChevronDownIcon className="w-4 h-4" />
                  Ver detalle por pasos
                </>
              )}
            </button>
            {showStepDetail && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <SyncStockJobProgress
                  metadata={syncStockMetadata}
                  jobStatus={job.status}
                  overallProgress={overallProgress}
                  compact
                />
              </div>
            )}
          </div>
        )}

        {job.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-medium text-red-800 mb-0.5">Error</p>
            <p className="text-sm text-red-700 break-words">{job.error}</p>
          </div>
        )}
      </div>
    </section>
  )
}
