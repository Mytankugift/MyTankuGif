'use client'

import {
  CubeIcon,
  CheckBadgeIcon,
  NoSymbolIcon,
  LockClosedIcon,
  ExclamationCircleIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import { KpiCard } from './KpiCard'
import { ChartCard } from './ChartCard'
import { TimeSeriesChart } from './TimeSeriesChart'
import { RankingTable } from './RankingTable'
import { formatNumber } from '@/lib/format/currency'
import type { CatalogAnalytics } from '@/lib/types/analytics'

export function CatalogTab({ data }: { data: CatalogAnalytics }) {
  const s = data.scalars
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3">
        Los totales de catálogo reflejan el <strong>estado actual</strong> (no dependen del rango de fechas). El rango
        solo afecta la serie de productos nuevos.
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard label="Productos totales" value={formatNumber(s.totalProducts)} showTrend={false} icon={CubeIcon} />
        <KpiCard label="Productos activos" value={formatNumber(s.activeProducts)} showTrend={false} icon={CheckBadgeIcon} />
        <KpiCard label="Variantes sin stock" value={formatNumber(s.outOfStockVariants)} showTrend={false} icon={NoSymbolIcon} />
        <KpiCard label="Bloqueados" value={formatNumber(s.lockedProducts)} showTrend={false} icon={LockClosedIcon} />
        <KpiCard label="Productos +18" value={formatNumber(s.adultProducts)} showTrend={false} icon={ExclamationCircleIcon} />
        <KpiCard label="Fuera de catálogo Dropi" value={formatNumber(s.outOfDropiCatalog)} showTrend={false} icon={NoSymbolIcon} />
        <KpiCard label="Categorías" value={formatNumber(s.totalCategories)} showTrend={false} icon={FolderIcon} />
      </div>

      <ChartCard title="Productos nuevos" subtitle="Creados en el periodo">
        <TimeSeriesChart
          data={data.newProductsSeries}
          height={300}
          series={[{ key: 'count', label: 'Productos nuevos', color: '#8b5cf6', type: 'area', format: 'number' }]}
        />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Productos por categoría" subtitle="Estado actual">
          <RankingTable items={data.topCategoriesByProducts} valueLabel="Productos" />
        </ChartCard>
        <ChartCard title="Stock por bodega" subtitle="Estado actual">
          <RankingTable items={data.stockByWarehouse} valueLabel="Unidades" />
        </ChartCard>
      </div>
    </div>
  )
}
