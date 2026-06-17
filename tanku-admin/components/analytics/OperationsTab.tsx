'use client'

import { WrenchScrewdriverIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { KpiCard } from './KpiCard'
import { ChartCard } from './ChartCard'
import { TimeSeriesChart } from './TimeSeriesChart'
import { DistributionDonut } from './DistributionDonut'
import { formatNumber, formatPercent } from '@/lib/format/currency'
import type { OperationsAnalytics } from '@/lib/types/analytics'

const JOB_TYPE_LABELS: Record<string, string> = {
  RAW: 'RAW',
  NORMALIZE: 'Normalizar',
  ENRICH: 'Enriquecer',
  SYNC_PRODUCT: 'Sync producto',
  SYNC_STOCK: 'Sync stock',
}

const JOB_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  RUNNING: 'En ejecución',
  DONE: 'Completado',
  FAILED: 'Fallido',
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${Math.round(seconds)} s`
  const minutes = seconds / 60
  if (minutes < 60) return `${minutes.toFixed(1).replace('.', ',')} min`
  return `${(minutes / 60).toFixed(1).replace('.', ',')} h`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

export function OperationsTab({ data }: { data: OperationsAnalytics }) {
  const s = data.scalars
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Jobs totales" value={formatNumber(s.totalJobs)} showTrend={false} icon={WrenchScrewdriverIcon} />
        <KpiCard
          label="Tasa de fallo"
          value={formatPercent(s.failureRate)}
          showTrend={false}
          icon={ExclamationTriangleIcon}
          hint={`${formatNumber(s.failed)} fallidos`}
        />
        <KpiCard label="Duración media" value={formatDuration(s.avgDurationSeconds)} showTrend={false} icon={ClockIcon} />
      </div>

      <ChartCard title="Jobs creados" subtitle="En el periodo">
        <TimeSeriesChart
          data={data.series}
          height={300}
          series={[{ key: 'count', label: 'Jobs', color: '#3b82f6', type: 'area', format: 'number' }]}
        />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Jobs por tipo">
          <DistributionDonut data={data.byType} labels={JOB_TYPE_LABELS} />
        </ChartCard>
        <ChartCard title="Jobs por estado">
          <DistributionDonut data={data.byStatus} labels={JOB_STATUS_LABELS} />
        </ChartCard>
      </div>

      <ChartCard title="Estado de crons" subtitle="Última ejecución de tareas programadas">
        {data.crons.length === 0 ? (
          <div className="text-sm text-gray-400 py-6 text-center">Sin crons registrados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-2 font-medium">Cron</th>
                  <th className="py-2 pr-2 font-medium">Último estado</th>
                  <th className="py-2 pr-2 font-medium">Completado</th>
                  <th className="py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {data.crons.map((c) => (
                  <tr key={c.jobKey} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-2 text-gray-800 font-medium">{c.jobKey}</td>
                    <td className="py-2 pr-2 text-gray-600">{c.lastStatus ?? '—'}</td>
                    <td className="py-2 pr-2 text-gray-600 tabular-nums">{formatDate(c.lastCompletedAt)}</td>
                    <td className="py-2 text-red-600 truncate max-w-[240px]" title={c.lastError ?? ''}>
                      {c.lastError ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  )
}
