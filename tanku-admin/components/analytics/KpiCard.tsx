'use client'

import type { ComponentType } from 'react'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusSmallIcon } from '@heroicons/react/24/outline'

interface KpiCardProps {
  label: string
  value: string
  /** Variación % respecto al periodo anterior; null = sin comparación. */
  delta?: number | null
  /** Si true, una variación negativa se considera positiva (ej. costos). */
  invertDelta?: boolean
  icon?: ComponentType<{ className?: string }>
  hint?: string
  /** Si false, no muestra la fila de tendencia (solo un subtítulo opcional). */
  showTrend?: boolean
}

export function KpiCard({
  label,
  value,
  delta,
  invertDelta = false,
  icon: Icon,
  hint,
  showTrend = true,
}: KpiCardProps) {
  const hasDelta = delta !== null && delta !== undefined
  const isUp = hasDelta && (delta as number) > 0
  const isDown = hasDelta && (delta as number) < 0
  const isPositive = invertDelta ? isDown : isUp
  const isNegative = invertDelta ? isUp : isDown

  const deltaColor = !hasDelta
    ? 'text-gray-400'
    : isPositive
      ? 'text-green-600'
      : isNegative
        ? 'text-red-600'
        : 'text-gray-500'

  const DeltaIcon = !hasDelta || (!isUp && !isDown) ? MinusSmallIcon : isUp ? ArrowTrendingUpIcon : ArrowTrendingDownIcon

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {Icon && <Icon className="w-5 h-5 text-gray-300" />}
      </div>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      {showTrend ? (
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`inline-flex items-center gap-0.5 font-medium ${deltaColor}`}>
            <DeltaIcon className="w-3.5 h-3.5" />
            {hasDelta ? `${Math.abs(delta as number).toFixed(1).replace('.', ',')} %` : 's/d'}
          </span>
          <span className="text-gray-400">{hint ?? 'vs periodo anterior'}</span>
        </div>
      ) : (
        hint && <div className="text-xs text-gray-400">{hint}</div>
      )}
    </div>
  )
}
