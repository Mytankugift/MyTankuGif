'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { SeriesPoint } from '@/lib/types/analytics'
import { formatCurrency, formatNumber, formatCurrencyCompact } from '@/lib/format/currency'

export interface SeriesConfig {
  key: string
  label: string
  color: string
  type?: 'area' | 'line'
  format?: 'currency' | 'number'
  yAxisId?: 'left' | 'right'
}

interface TimeSeriesChartProps {
  data: SeriesPoint[]
  series: SeriesConfig[]
  height?: number
}

const formatValue = (value: number, format?: 'currency' | 'number') =>
  format === 'currency' ? formatCurrency(value) : formatNumber(value)

export function TimeSeriesChart({ data, series, height = 280 }: TimeSeriesChartProps) {
  const hasRightAxis = series.some((s) => s.yAxisId === 'right')

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Sin datos en el rango seleccionado
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v) =>
            series.find((s) => (s.yAxisId ?? 'left') === 'left')?.format === 'currency'
              ? formatCurrencyCompact(v)
              : formatNumber(v)
          }
        />
        {hasRightAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v) =>
              series.find((s) => s.yAxisId === 'right')?.format === 'currency'
                ? formatCurrencyCompact(v)
                : formatNumber(v)
            }
          />
        )}
        <Tooltip
          formatter={(value, name) => {
            const cfg = series.find((s) => s.label === name)
            return [formatValue(Number(value), cfg?.format), String(name)]
          }}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) =>
          (s.type ?? 'area') === 'area' ? (
            <Area
              key={s.key}
              yAxisId={s.yAxisId ?? 'left'}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
            />
          ) : (
            <Line
              key={s.key}
              yAxisId={s.yAxisId ?? 'left'}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
            />
          )
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
