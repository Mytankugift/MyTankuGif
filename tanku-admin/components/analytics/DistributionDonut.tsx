'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import type { DistributionItem } from '@/lib/types/analytics'
import { formatNumber } from '@/lib/format/currency'

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#84cc16', '#94a3b8']

interface DistributionDonutProps {
  data: DistributionItem[]
  /** Mapeo opcional de claves crudas a etiquetas legibles. */
  labels?: Record<string, string>
  height?: number
}

export function DistributionDonut({ data, labels, height = 260 }: DistributionDonutProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Sin datos en el rango seleccionado
      </div>
    )
  }

  const chartData = data.map((d) => ({ name: labels?.[d.key] ?? d.key, value: d.count }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
