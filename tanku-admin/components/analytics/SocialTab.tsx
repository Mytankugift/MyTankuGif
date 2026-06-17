'use client'

import {
  PhotoIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  HandThumbUpIcon,
  FilmIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { KpiCard } from './KpiCard'
import { ChartCard } from './ChartCard'
import { TimeSeriesChart } from './TimeSeriesChart'
import { DistributionDonut } from './DistributionDonut'
import { RankingTable } from './RankingTable'
import { formatNumber } from '@/lib/format/currency'
import type { SocialAnalytics } from '@/lib/types/analytics'

export function SocialTab({ data }: { data: SocialAnalytics }) {
  const s = data.scalars
  const postersDist = [
    { key: 'Activos', count: data.postersActivity.active },
    { key: 'Inactivos', count: data.postersActivity.inactive },
  ]
  const storiesDist = [
    { key: 'Activas', count: data.storiesActivity.active },
    { key: 'Inactivas', count: data.storiesActivity.inactive },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Posters" value={formatNumber(s.posters)} showTrend={false} icon={PhotoIcon} />
        <KpiCard label="Reacciones" value={formatNumber(s.reactions)} showTrend={false} icon={HeartIcon} />
        <KpiCard label="Comentarios" value={formatNumber(s.comments)} showTrend={false} icon={ChatBubbleLeftIcon} />
        <KpiCard label="Likes a productos" value={formatNumber(s.productLikes)} showTrend={false} icon={HandThumbUpIcon} />
        <KpiCard label="Stories" value={formatNumber(s.stories)} showTrend={false} icon={FilmIcon} />
        <KpiCard label="Vistas de stories" value={formatNumber(s.storyViews)} showTrend={false} icon={EyeIcon} />
      </div>

      <ChartCard title="Posters publicados" subtitle="En el periodo">
        <TimeSeriesChart
          data={data.series}
          height={300}
          series={[{ key: 'count', label: 'Posters', color: '#ec4899', type: 'area', format: 'number' }]}
        />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Posters por estado" subtitle="Estado actual">
          <DistributionDonut data={postersDist} />
        </ChartCard>
        <ChartCard title="Stories por estado" subtitle="Estado actual">
          <DistributionDonut data={storiesDist} />
        </ChartCard>
        <ChartCard title="Top creadores" subtitle="Por posters en el periodo">
          <RankingTable items={data.topCreators} valueLabel="Posters" />
        </ChartCard>
      </div>
    </div>
  )
}
