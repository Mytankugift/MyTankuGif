'use client'

import { LifebuoyIcon, ClockIcon, CheckCircleIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline'
import { KpiCard } from './KpiCard'
import { ChartCard } from './ChartCard'
import { TimeSeriesChart } from './TimeSeriesChart'
import { DistributionDonut } from './DistributionDonut'
import { RankingTable } from './RankingTable'
import { formatNumber, formatPercent } from '@/lib/format/currency'
import type { SupportAnalytics } from '@/lib/types/analytics'

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  IN_REVIEW: 'En revisión',
  WAITING_USER: 'Esperando usuario',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

const TYPE_LABELS: Record<string, string> = {
  NOT_RECEIVED: 'No recibido',
  DAMAGED: 'Dañado',
  DELAY: 'Retraso',
  WRONG_ITEM: 'Producto equivocado',
  INCOMPLETE: 'Incompleto',
}

export function SupportTab({ data }: { data: SupportAnalytics }) {
  const s = data.scalars
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Casos creados" value={formatNumber(s.created)} showTrend={false} icon={LifebuoyIcon} />
        <KpiCard label="Casos abiertos" value={formatNumber(s.open)} showTrend={false} icon={ClockIcon} />
        <KpiCard label="Casos resueltos" value={formatNumber(s.resolved)} showTrend={false} icon={CheckCircleIcon} />
        <KpiCard
          label="Casos / pedidos"
          value={formatPercent(s.caseRateOverOrders)}
          showTrend={false}
          icon={ReceiptPercentIcon}
          hint={
            s.avgResolutionHours !== null
              ? `Resolución media: ${s.avgResolutionHours.toString().replace('.', ',')} h`
              : 'Resolución media: —'
          }
        />
      </div>

      <ChartCard title="Casos creados" subtitle="En el periodo">
        <TimeSeriesChart
          data={data.series}
          height={300}
          series={[{ key: 'count', label: 'Casos', color: '#14b8a6', type: 'area', format: 'number' }]}
        />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Por estado">
          <DistributionDonut data={data.byStatus} labels={STATUS_LABELS} />
        </ChartCard>
        <ChartCard title="Por tipo de caso">
          <DistributionDonut data={data.byType} labels={TYPE_LABELS} />
        </ChartCard>
        <ChartCard title="Carga por admin" subtitle="Casos asignados">
          <RankingTable items={data.byAdmin} valueLabel="Casos" />
        </ChartCard>
      </div>
    </div>
  )
}
