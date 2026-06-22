'use client'

import type { RankingItem } from '@/lib/types/analytics'
import { formatNumber } from '@/lib/format/currency'

export type RankingExtraColumn = {
  label: string
  getValue: (item: RankingItem) => number | undefined
  formatter?: (value: number) => string
}

interface RankingTableProps {
  items: RankingItem[]
  valueLabel: string
  valueFormatter?: (value: number) => string
  /** @deprecated Usar extraColumns para múltiples columnas. */
  extraLabel?: string
  /** @deprecated Usar extraColumns para múltiples columnas. */
  extraFormatter?: (value: number) => string
  extraColumns?: RankingExtraColumn[]
  compact?: boolean
}

export function RankingTable({
  items,
  valueLabel,
  valueFormatter = formatNumber,
  extraLabel,
  extraFormatter = formatNumber,
  extraColumns,
  compact = false,
}: RankingTableProps) {
  if (!items || items.length === 0) {
    return (
      <div className={`text-sm text-gray-400 text-center ${compact ? 'py-4' : 'py-8'}`}>
        Sin datos en el rango seleccionado
      </div>
    )
  }

  const columns: RankingExtraColumn[] =
    extraColumns ??
    (extraLabel
      ? [{ label: extraLabel, getValue: (item) => item.extra, formatter: extraFormatter }]
      : [])

  const cellPy = compact ? 'py-1.5' : 'py-2'
  const headClass = compact ? 'text-[10px]' : 'text-xs'
  const bodyClass = compact ? 'text-xs' : 'text-sm'
  const nameMaxW = compact ? 'max-w-[140px]' : 'max-w-[220px]'

  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${bodyClass}`}>
        <thead>
          <tr className={`text-left ${headClass} uppercase tracking-wide text-gray-400 border-b border-gray-100`}>
            <th className={`${cellPy} pr-2 font-medium w-6`}>#</th>
            <th className={`${cellPy} pr-2 font-medium`}>Nombre</th>
            <th className={`${cellPy} pr-2 font-medium text-right whitespace-nowrap`}>{valueLabel}</th>
            {columns.map((col) => (
              <th key={col.label} className={`${cellPy} pl-2 font-medium text-right whitespace-nowrap`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className="border-b border-gray-50 last:border-0">
              <td className={`${cellPy} pr-2 text-gray-400 tabular-nums`}>{i + 1}</td>
              <td className={`${cellPy} pr-2 text-gray-800 truncate ${nameMaxW}`} title={item.label}>
                {item.label}
              </td>
              <td className={`${cellPy} pr-2 text-right font-medium text-gray-900 tabular-nums`}>
                {valueFormatter(item.value)}
              </td>
              {columns.map((col) => {
                const raw = col.getValue(item)
                const fmt = col.formatter ?? formatNumber
                return (
                  <td key={col.label} className={`${cellPy} pl-2 text-right text-gray-600 tabular-nums whitespace-nowrap`}>
                    {raw !== undefined && raw !== null ? fmt(raw) : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
