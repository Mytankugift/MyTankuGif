'use client'

import type { RankingItem } from '@/lib/types/analytics'
import { formatNumber } from '@/lib/format/currency'

interface RankingTableProps {
  items: RankingItem[]
  valueLabel: string
  valueFormatter?: (value: number) => string
  extraLabel?: string
  extraFormatter?: (value: number) => string
}

export function RankingTable({
  items,
  valueLabel,
  valueFormatter = formatNumber,
  extraLabel,
  extraFormatter = formatNumber,
}: RankingTableProps) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-gray-400 py-8 text-center">Sin datos en el rango seleccionado</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
            <th className="py-2 pr-2 font-medium w-8">#</th>
            <th className="py-2 pr-2 font-medium">Nombre</th>
            <th className="py-2 pr-2 font-medium text-right">{valueLabel}</th>
            {extraLabel && <th className="py-2 pl-2 font-medium text-right">{extraLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className="border-b border-gray-50 last:border-0">
              <td className="py-2 pr-2 text-gray-400 tabular-nums">{i + 1}</td>
              <td className="py-2 pr-2 text-gray-800 truncate max-w-[220px]" title={item.label}>
                {item.label}
              </td>
              <td className="py-2 pr-2 text-right font-medium text-gray-900 tabular-nums">
                {valueFormatter(item.value)}
              </td>
              {extraLabel && (
                <td className="py-2 pl-2 text-right text-gray-600 tabular-nums">
                  {item.extra !== undefined ? extraFormatter(item.extra) : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
