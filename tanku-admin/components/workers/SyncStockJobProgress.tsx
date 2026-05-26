'use client'

import { useState } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'

const STEP_LABELS: Record<string, string> = {
  raw: '1. Favoritos Dropi',
  normalize: '2. Normalizar y retiro',
  sync: '3. Catálogo Tanku',
  status: '4. Stock y ranking',
}

const STAT_LABELS: Record<string, string> = {
  productosProcesados: 'Productos traídos de Dropi',
  paginas: 'Páginas procesadas',
  syncRunId: 'ID de corrida (sync run)',
  filasPurgadasCorridasAnteriores: 'Filas raw purgadas (corridas anteriores)',
  limpiezaRaw: 'Limpieza raw',
  normalizados: 'Productos normalizados',
  normalizadosAcumulado: 'Normalizados (acumulado)',
  totalRaw: 'Filas en dropi_raw',
  erroresAcumulado: 'Errores en normalize',
  privatizadosEnDropi: 'Privatizados en dropi_products',
  privatizadosDesactivadosEnTanku: 'Privatizados desactivados en Tanku',
  lotes: 'Lotes backend',
  dropiProductsTotal: 'Total dropi_products (no privatizados)',
  variantesActualizadas: 'Variantes actualizadas',
  warehouseVariantsCreados: 'Warehouse variants creados/actualizados',
  excluidosSinStockRanking: 'Excluidos del ranking (stock < 30)',
  incluidosConStockRanking: 'Incluidos en ranking (stock OK)',
  catalogDropiIdsCount: 'Favoritos en catálogo (IDs)',
  purgedDropiProducts: 'dropi_products purgados',
  retainedForOrders: 'Conservados (tienen pedidos)',
  deletedNoOrders: 'Eliminados (sin pedidos)',
  markedOutOfCatalog: 'Marcados fuera de catálogo',
  productosRevisados: 'Productos en catálogo revisados',
  productosEnCatalogo: 'Productos en catálogo Dropi',
  variantesInactivadas: 'Variantes marcadas inactivas (sin stock)',
  productosInactivados: 'Productos marcados inactivos',
}

export interface SyncStockStepState {
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  stats?: Record<string, unknown>
  message?: string
}

export interface SyncStockJobMetadata {
  currentStep: string
  steps: Record<string, SyncStockStepState>
}

interface Props {
  metadata: SyncStockJobMetadata | null | undefined
  jobStatus: string
  overallProgress: number
  compact?: boolean
  /** Si no hay metadata en BD (job antiguo), barra simple con este % */
  fallbackProgress?: number
}

function formatStatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function StepIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="w-5 h-5 text-green-600 shrink-0" />
    case 'running':
      return <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
    case 'failed':
      return <XCircleIcon className="w-5 h-5 text-red-600 shrink-0" />
    default:
      return <ClockIcon className="w-5 h-5 text-gray-400 shrink-0" />
  }
}

export function SyncStockJobProgress({
  metadata,
  jobStatus,
  overallProgress,
  compact = false,
  fallbackProgress,
}: Props) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const stepKeys = ['raw', 'normalize', 'sync', 'status'] as const

  if (!metadata?.steps) {
    const pct = fallbackProgress ?? overallProgress
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Progreso</span>
          <span className="font-semibold tabular-nums">{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all rounded-full"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          Detalle por pasos disponible en jobs nuevos. Si persiste, reinicia API y workers y lanza otra
          ejecución.
        </p>
      </div>
    )
  }

  const toggle = (key: string) => {
    setExpandedStep((prev) => (prev === key ? null : key))
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 font-medium">Progreso general</span>
          <span className="text-gray-900 font-semibold">{overallProgress}%</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-200 gap-0.5">
          {stepKeys.map((key) => {
            const step = metadata.steps[key]
            const fill =
              step?.status === 'completed'
                ? 100
                : step?.status === 'running'
                  ? step.progress
                  : 0
            const bg =
              step?.status === 'completed'
                ? 'bg-green-500'
                : step?.status === 'running'
                  ? 'bg-blue-500'
                  : step?.status === 'failed'
                    ? 'bg-red-500'
                    : 'bg-gray-300'
            return (
              <button
                key={key}
                type="button"
                title={STEP_LABELS[key]}
                onClick={() => toggle(key)}
                className={`flex-1 relative h-full min-w-0 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-sm ${
                  expandedStep === key ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <div className={`absolute inset-y-0 left-0 ${bg}`} style={{ width: `${fill}%` }} />
              </button>
            )
          })}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-500 px-0.5">
          {stepKeys.map((key) => (
            <span key={key} className="flex-1 text-center truncate px-0.5">
              {key === 'raw' ? 'RAW' : key === 'normalize' ? 'Norm.' : key === 'sync' ? 'Back.' : 'Est.'}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {stepKeys.map((key, index) => {
          const step = metadata.steps[key] || { status: 'pending', progress: 0 }
          const isCurrent = metadata.currentStep === key && jobStatus === 'RUNNING'
          const isExpanded = expandedStep === key

          return (
            <div
              key={key}
              className={`rounded-lg border transition-colors ${
                isExpanded ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-gray-50'
              } ${isCurrent ? 'ring-1 ring-blue-300' : ''}`}
            >
              <button
                type="button"
                onClick={() => toggle(key)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <StepIcon status={step.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {STEP_LABELS[key] || key}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-normal text-blue-600">en curso</span>
                    )}
                  </p>
                  {step.message && (
                    <p className="text-xs text-gray-600 truncate mt-0.5">{step.message}</p>
                  )}
                </div>
                <span className="text-xs font-semibold text-gray-700 tabular-nums">
                  {step.status === 'completed' ? '100%' : `${Math.round(step.progress)}%`}
                </span>
                {isExpanded ? (
                  <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-200/80 mt-0">
                  <div className="pt-3 space-y-2">
                    {step.stats && Object.keys(step.stats).length > 0 ? (
                      <dl className="grid grid-cols-1 gap-1.5 text-xs">
                        {Object.entries(step.stats).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <dt className="text-gray-600 shrink-0">
                              {STAT_LABELS[k] || k}
                            </dt>
                            <dd className="text-gray-900 font-medium text-right break-all">
                              {formatStatValue(v)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-xs text-gray-500">Sin métricas aún.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {jobStatus === 'DONE' && !compact && (
        <p className="text-xs text-indigo-700 font-medium">
          Sincronización finalizada. Revisa cada paso para el detalle.
        </p>
      )}
    </div>
  )
}
