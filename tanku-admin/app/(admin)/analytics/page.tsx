'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  UsersIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  GiftIcon,
  ArrowTrendingUpIcon,
  ReceiptPercentIcon,
  TruckIcon,
  CubeIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { AdminPageShell } from '@/components/admin/AdminPageShell'
import {
  DateRangeFilter,
  presetToRange,
  type RangeState,
} from '@/components/analytics/DateRangeFilter'
import { KpiCard } from '@/components/analytics/KpiCard'
import { ChartCard } from '@/components/analytics/ChartCard'
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart'
import { DistributionDonut } from '@/components/analytics/DistributionDonut'
import { RankingTable } from '@/components/analytics/RankingTable'
import { SupportTab } from '@/components/analytics/SupportTab'
import { OperationsTab } from '@/components/analytics/OperationsTab'
import { CatalogTab } from '@/components/analytics/CatalogTab'
import { SocialTab } from '@/components/analytics/SocialTab'
import { BehaviorTab } from '@/components/analytics/BehaviorTab'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format/currency'
import type {
  OverviewAnalytics,
  SalesAnalytics,
  UsersAnalytics,
  GiftsAnalytics,
  SupportAnalytics,
  OperationsAnalytics,
  CatalogAnalytics,
  SocialAnalytics,
  BehaviorAnalytics,
} from '@/lib/types/analytics'

type TabId = 'overview' | 'sales' | 'users' | 'gifts' | 'support' | 'operations' | 'catalog' | 'social' | 'behavior'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Resumen' },
  { id: 'sales', label: 'Ventas' },
  { id: 'users', label: 'Usuarios' },
  { id: 'gifts', label: 'Regalos' },
  { id: 'support', label: 'Postventa' },
  { id: 'operations', label: 'Operación' },
  { id: 'catalog', label: 'Catálogo' },
  { id: 'social', label: 'Social' },
  { id: 'behavior', label: 'Comportamiento' },
]

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PROCESSING: 'Procesando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Pagado',
  captured: 'Capturado',
  awaiting: 'Esperando pago',
  not_paid: 'Contraentrega',
  rejected: 'Rechazado',
  failed: 'Fallido',
  pending: 'Pendiente',
}

const GIFT_ESTADO_LABELS: Record<string, string> = {
  CREATED: 'Creado',
  PAID: 'Pagado',
  WAITING_ACCEPTANCE: 'Esperando aceptación',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  normal: 'Venta normal',
  direct_gift: 'Regalo directo',
  stalker_gift: 'StalkerGift (envío)',
}

const GIFT_FLOW_LABELS: Record<string, string> = {
  stalker_gift: 'StalkerGift',
  direct_gift: 'Regalo directo',
}

const GIFTS_SECTIONS = [
  { id: 'gifts-overview', label: 'Resumen' },
  { id: 'gifts-stalkergift', label: 'StalkerGift' },
  { id: 'gifts-directo', label: 'Regalo directo' },
] as const

function scrollToGiftsSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const PRODUCT_RANKING_COLUMNS = [
  { label: 'Ingresos', getValue: (i: { extra?: number }) => i.extra, formatter: formatCurrency },
  { label: 'Proveedor', getValue: (i: { supplierCost?: number }) => i.supplierCost, formatter: formatCurrency },
  { label: 'Envío', getValue: (i: { shippingCost?: number }) => i.shippingCost, formatter: formatCurrency },
] as const

export default function AnalyticsPage() {
  const router = useRouter()
  const { isAuthenticated } = useAdminAuthStore()
  const hasHydrated = useAdminAuthStore((state) => state._hasHydrated)

  const initialRange = presetToRange('30d')
  const [range, setRange] = useState<RangeState>({
    preset: '30d',
    from: initialRange.from,
    to: initialRange.to,
    granularity: 'day',
  })
  const [tab, setTab] = useState<TabId>('overview')

  const [overview, setOverview] = useState<OverviewAnalytics | null>(null)
  const [sales, setSales] = useState<SalesAnalytics | null>(null)
  const [users, setUsers] = useState<UsersAnalytics | null>(null)
  const [gifts, setGifts] = useState<GiftsAnalytics | null>(null)
  const [support, setSupport] = useState<SupportAnalytics | null>(null)
  const [operations, setOperations] = useState<OperationsAnalytics | null>(null)
  const [catalog, setCatalog] = useState<CatalogAnalytics | null>(null)
  const [social, setSocial] = useState<SocialAnalytics | null>(null)
  const [behavior, setBehavior] = useState<BehaviorAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const params = useMemo(
    () => ({ from: range.from, to: range.to, granularity: range.granularity }),
    [range.from, range.to, range.granularity]
  )
  const rangeKey = `${params.from}|${params.to}|${params.granularity}`

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return

    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        if (tab === 'overview') {
          const res = await apiClient.get<{ success: boolean; data: OverviewAnalytics }>(
            API_ENDPOINTS.ADMIN.ANALYTICS.OVERVIEW(params)
          )
          if (!cancelled) setOverview(res.data.data)
        } else if (tab === 'sales') {
          const res = await apiClient.get<{ success: boolean; data: SalesAnalytics }>(
            API_ENDPOINTS.ADMIN.ANALYTICS.SALES(params)
          )
          if (!cancelled) setSales(res.data.data)
        } else if (tab === 'users') {
          const res = await apiClient.get<{ success: boolean; data: UsersAnalytics }>(
            API_ENDPOINTS.ADMIN.ANALYTICS.USERS(params)
          )
          if (!cancelled) setUsers(res.data.data)
        } else if (tab === 'gifts') {
          const res = await apiClient.get<{ success: boolean; data: GiftsAnalytics }>(
            API_ENDPOINTS.ADMIN.ANALYTICS.GIFTS(params)
          )
          if (!cancelled) setGifts(res.data.data)
        } else if (tab === 'support') {
          const res = await apiClient.get<{ success: boolean; data: SupportAnalytics }>(
            API_ENDPOINTS.ADMIN.ANALYTICS.SUPPORT(params)
          )
          if (!cancelled) setSupport(res.data.data)
        } else if (tab === 'operations') {
          const res = await apiClient.get<{ success: boolean; data: OperationsAnalytics }>(
            API_ENDPOINTS.ADMIN.ANALYTICS.OPERATIONS(params)
          )
          if (!cancelled) setOperations(res.data.data)
        } else if (tab === 'catalog') {
          const res = await apiClient.get<{ success: boolean; data: CatalogAnalytics }>(
            API_ENDPOINTS.ADMIN.ANALYTICS.CATALOG(params)
          )
          if (!cancelled) setCatalog(res.data.data)
        } else if (tab === 'social') {
          const res = await apiClient.get<{ success: boolean; data: SocialAnalytics }>(
            API_ENDPOINTS.ADMIN.ANALYTICS.SOCIAL(params)
          )
          if (!cancelled) setSocial(res.data.data)
        } else if (tab === 'behavior') {
          const res = await apiClient.get<{ success: boolean; data: BehaviorAnalytics }>(
            API_ENDPOINTS.ADMIN.ANALYTICS.BEHAVIOR(params)
          )
          if (!cancelled) setBehavior(res.data.data)
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error?.message || 'Error al cargar las analíticas')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [tab, rangeKey, hasHydrated, isAuthenticated])

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <AdminPageShell className="min-h-full">
      <div className="flex flex-col gap-5">
        {/* Filtros */}
        <DateRangeFilter value={range} onChange={setRange} />

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 -mb-px">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        )}

        {!loading && tab === 'overview' && overview && <OverviewTab data={overview} />}
        {!loading && tab === 'sales' && sales && <SalesTab data={sales} />}
        {!loading && tab === 'users' && users && <UsersTab data={users} />}
        {!loading && tab === 'gifts' && gifts && <GiftsTab data={gifts} />}
        {!loading && tab === 'support' && support && <SupportTab data={support} />}
        {!loading && tab === 'operations' && operations && <OperationsTab data={operations} />}
        {!loading && tab === 'catalog' && catalog && <CatalogTab data={catalog} />}
        {!loading && tab === 'social' && social && <SocialTab data={social} />}
        {!loading && tab === 'behavior' && behavior && <BehaviorTab data={behavior} />}
      </div>
    </AdminPageShell>
  )
}

function OverviewTab({ data }: { data: OverviewAnalytics }) {
  const k = data.kpis
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Usuarios nuevos" value={formatNumber(k.newUsers.current)} delta={k.newUsers.delta} icon={UsersIcon} />
        <KpiCard
          label="Ingresos confirmados"
          value={formatCurrency(k.confirmedRevenue.current)}
          delta={k.confirmedRevenue.delta}
          icon={BanknotesIcon}
        />
        <KpiCard label="Ganancia real" value={formatCurrency(k.profit.current)} delta={k.profit.delta} icon={ArrowTrendingUpIcon} />
        <KpiCard label="Pedidos confirmados" value={formatNumber(k.confirmedOrders.current)} delta={k.confirmedOrders.delta} icon={ShoppingBagIcon} />
        <KpiCard
          label="Ticket promedio"
          value={formatCurrency(k.averageOrderValue.current)}
          delta={k.averageOrderValue.delta}
          icon={ReceiptPercentIcon}
        />
        <KpiCard
          label="StalkerGift activos"
          value={formatNumber(k.giftsCreated.current)}
          delta={k.giftsCreated.delta}
          icon={GiftIcon}
          hint={`Aceptación: ${formatPercent(data.giftAcceptanceRate)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Ingresos vs ganancia" subtitle="Pedidos confirmados (ePayco)">
          <TimeSeriesChart
            data={data.revenueSeries}
            series={[
              { key: 'revenue', label: 'Ingresos', color: '#6366f1', type: 'area', format: 'currency' },
              { key: 'profit', label: 'Ganancia', color: '#22c55e', type: 'line', format: 'currency' },
            ]}
          />
        </ChartCard>
        <ChartCard title="Usuarios nuevos" subtitle="Registros en el periodo">
          <TimeSeriesChart
            data={data.usersSeries}
            series={[{ key: 'count', label: 'Usuarios nuevos', color: '#06b6d4', type: 'area', format: 'number' }]}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Pedidos por estado">
          <DistributionDonut data={data.ordersByStatus} labels={ORDER_STATUS_LABELS} />
        </ChartCard>
        <ChartCard title="Top productos vendidos" subtitle="Por unidades (pedidos confirmados)">
          <RankingTable
            items={data.topProducts}
            valueLabel="Unid."
            extraColumns={[...PRODUCT_RANKING_COLUMNS]}
          />
        </ChartCard>
      </div>
    </div>
  )
}

function SalesTab({ data }: { data: SalesAnalytics }) {
  const s = data.scalars
  const seg = s.bySegment
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Ingresos confirmados" value={formatCurrency(s.confirmedRevenue)} showTrend={false} icon={BanknotesIcon} />
        <KpiCard label="Ganancia real" value={formatCurrency(s.profit)} showTrend={false} icon={ArrowTrendingUpIcon} hint="Ganancia como dropshipper" />
        <KpiCard label="Pedidos confirmados" value={formatNumber(s.confirmedOrders)} showTrend={false} icon={ShoppingBagIcon} />
        <KpiCard label="Ticket promedio" value={formatCurrency(s.averageOrderValue)} showTrend={false} icon={ReceiptPercentIcon} />
        <KpiCard label="Unidades vendidas" value={formatNumber(s.unitsSold)} showTrend={false} icon={CubeIcon} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Venta normal"
          value={formatCurrency(seg.normal.revenue)}
          showTrend={false}
          icon={ShoppingBagIcon}
          hint={`${formatNumber(seg.normal.orders)} pedidos`}
        />
        <KpiCard
          label="Regalo directo"
          value={formatCurrency(seg.directGift.revenue)}
          showTrend={false}
          icon={GiftIcon}
          hint={`${formatNumber(seg.directGift.orders)} pedidos · carrito regalo`}
        />
        <KpiCard
          label="StalkerGift (envío)"
          value={formatCurrency(seg.stalkerGift.revenue)}
          showTrend={false}
          icon={GiftIcon}
          hint={`${formatNumber(seg.stalkerGift.orders)} pedidos · orden post-aceptación`}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Costo proveedor" value={formatCurrency(s.supplierCost)} showTrend={false} icon={CubeIcon} hint="supplier_price Dropi" />
        <KpiCard label="Envío real" value={formatCurrency(s.realShippingCost)} showTrend={false} icon={TruckIcon} hint="shipping_amount: transportadora" />
        <KpiCard label="Fees Dropi" value={formatCurrency(s.dropiFees)} showTrend={false} icon={ReceiptPercentIcon} hint="Residual: total − proveedor − envío" />
        <KpiCard label="Costo Dropi (total)" value={formatCurrency(s.shippingCost)} showTrend={false} icon={BanknotesIcon} hint="discounted_amount" />
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
        Contraentrega pendiente de entrega: <strong>{formatNumber(data.codPending.orders)}</strong> pedidos por{' '}
        <strong>{formatCurrency(data.codPending.amount)}</strong> (no contabilizados como ingreso hasta la entrega).
      </div>

      <ChartCard title="Ingresos, ganancia y pedidos" subtitle="Pedidos confirmados (ePayco)">
        <TimeSeriesChart
          data={data.series}
          height={320}
          series={[
            { key: 'revenue', label: 'Ingresos', color: '#6366f1', type: 'area', format: 'currency', yAxisId: 'left' },
            { key: 'profit', label: 'Ganancia', color: '#22c55e', type: 'line', format: 'currency', yAxisId: 'left' },
            { key: 'orders', label: 'Pedidos', color: '#f59e0b', type: 'line', format: 'number', yAxisId: 'right' },
          ]}
        />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <ChartCard title="Por tipo de venta" subtitle="Pedidos confirmados en el periodo">
          <DistributionDonut data={data.byOrderType} labels={ORDER_TYPE_LABELS} />
        </ChartCard>
        <ChartCard title="Pedidos por estado">
          <DistributionDonut data={data.byStatus} labels={ORDER_STATUS_LABELS} />
        </ChartCard>
        <ChartCard title="Por estado de pago">
          <DistributionDonut data={data.byPaymentStatus} labels={PAYMENT_STATUS_LABELS} />
        </ChartCard>
        <ChartCard title="Por método de pago">
          <DistributionDonut data={data.byPaymentMethod} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="Top productos vendidos" subtitle="Por unidades">
            <RankingTable
              items={data.topProducts}
              valueLabel="Unid."
              extraColumns={[...PRODUCT_RANKING_COLUMNS]}
            />
          </ChartCard>
        </div>
        <ChartCard title="Top categorías" subtitle="Por unidades">
          <RankingTable
            items={data.topCategories}
            valueLabel="Unid."
            extraLabel="Ingresos"
            extraFormatter={formatCurrency}
            compact
          />
        </ChartCard>
      </div>
    </div>
  )
}

function UsersTab({ data }: { data: UsersAnalytics }) {
  const verifiedDist = [
    { key: 'Verificados', count: data.emailVerified.verified },
    { key: 'Sin verificar', count: data.emailVerified.unverified },
  ]
  const visibilityDist = [
    { key: 'Público', count: data.profileVisibility.public },
    { key: 'Privado', count: data.profileVisibility.private },
    { key: 'Sin perfil', count: data.profileVisibility.noProfile },
  ]
  const originDist = [
    { key: 'Google', count: data.registrationOrigin.google },
    { key: 'Email', count: data.registrationOrigin.email },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard label="Usuarios nuevos (periodo)" value={formatNumber(data.scalars.newUsers)} showTrend={false} icon={UsersIcon} />
        <KpiCard label="Usuarios totales" value={formatNumber(data.scalars.totalUsers)} showTrend={false} icon={UsersIcon} />
      </div>

      <ChartCard title="Usuarios nuevos" subtitle="Registros en el periodo">
        <TimeSeriesChart
          data={data.series}
          height={320}
          series={[{ key: 'count', label: 'Usuarios nuevos', color: '#06b6d4', type: 'area', format: 'number' }]}
        />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Email verificado" subtitle="Total histórico">
          <DistributionDonut data={verifiedDist} />
        </ChartCard>
        <ChartCard title="Visibilidad de perfil" subtitle="Total histórico">
          <DistributionDonut data={visibilityDist} />
        </ChartCard>
        <ChartCard title="Origen de registro" subtitle="Aproximado (sin contraseña = Google)">
          <DistributionDonut data={originDist} />
        </ChartCard>
      </div>
    </div>
  )
}

function GiftsTab({ data }: { data: GiftsAnalytics }) {
  const sg = data.stalkerGift.scalars
  const dg = data.directGift.scalars

  const totalGiftRevenue = sg.shippedRevenue + dg.revenue
  const giftFlowDistribution = [
    { key: 'stalker_gift', count: sg.shipped },
    { key: 'direct_gift', count: dg.orders },
  ].filter((d) => d.count > 0)

  return (
    <div className="flex flex-col gap-8">
      {/* Navegación rápida — siempre visible al entrar a la pestaña */}
      <nav
        className="flex flex-wrap gap-2 p-1.5 bg-white rounded-xl border border-gray-200 shadow-sm"
        aria-label="Secciones de regalos"
      >
        {GIFTS_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollToGiftsSection(s.id)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Resumen general */}
      <section id="gifts-overview" className="flex flex-col gap-4 scroll-mt-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Resumen general</h2>
          <p className="text-sm text-gray-500">
            Vista rápida de ambos flujos de regalo en el periodo. Detalle por tipo más abajo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Ingresos por regalos"
            value={formatCurrency(totalGiftRevenue)}
            showTrend={false}
            icon={BanknotesIcon}
            hint="StalkerGift enviados + regalo directo"
          />
          <KpiCard
            label="StalkerGift activos"
            value={formatNumber(sg.activeInPeriod)}
            showTrend={false}
            icon={GiftIcon}
            hint="Creado, aceptado o enviado"
          />
          <KpiCard
            label="StalkerGift enviados"
            value={formatNumber(sg.shipped)}
            showTrend={false}
            icon={TruckIcon}
            hint={formatCurrency(sg.shippedRevenue)}
          />
          <KpiCard
            label="Regalo directo"
            value={formatNumber(dg.orders)}
            showTrend={false}
            icon={ShoppingBagIcon}
            hint={dg.orders > 0 ? formatCurrency(dg.revenue) : 'Sin pedidos en el periodo'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Actividad por flujo" subtitle="Envíos StalkerGift vs pedidos regalo directo">
            <DistributionDonut data={giftFlowDistribution} labels={GIFT_FLOW_LABELS} height={220} />
          </ChartCard>

          <button
            type="button"
            onClick={() => scrollToGiftsSection('gifts-stalkergift')}
            className="text-left bg-violet-50 rounded-xl border border-violet-200 p-5 hover:border-violet-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">StalkerGift</p>
                <p className="text-sm text-violet-900/80 mt-1">Anónimo · checkout → aceptación → envío</p>
              </div>
              <ChevronDownIcon className="w-5 h-5 text-violet-400 group-hover:text-violet-600 shrink-0" />
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-violet-950">
              <li><span className="text-violet-600">Activos:</span> {formatNumber(sg.activeInPeriod)}</li>
              <li><span className="text-violet-600">Pagados:</span> {formatNumber(sg.paid)} · <span className="text-violet-600">Enviados:</span> {formatNumber(sg.shipped)}</li>
              <li><span className="text-violet-600">Ingresos envío:</span> {formatCurrency(sg.shippedRevenue)}</li>
            </ul>
            <p className="mt-3 text-xs font-medium text-violet-600">Ver detalle StalkerGift ↓</p>
          </button>

          <button
            type="button"
            onClick={() => scrollToGiftsSection('gifts-directo')}
            className="text-left bg-pink-50 rounded-xl border border-pink-200 p-5 hover:border-pink-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">Regalo directo</p>
                <p className="text-sm text-pink-900/80 mt-1">Carrito regalo · identidades visibles</p>
              </div>
              <ChevronDownIcon className="w-5 h-5 text-pink-400 group-hover:text-pink-600 shrink-0" />
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-pink-950">
              <li><span className="text-pink-600">Pedidos:</span> {formatNumber(dg.orders)}</li>
              <li><span className="text-pink-600">Ingresos:</span> {formatCurrency(dg.revenue)}</li>
              <li><span className="text-pink-600">Unidades:</span> {formatNumber(dg.unitsSold)}</li>
            </ul>
            <p className="mt-3 text-xs font-medium text-pink-600">Ver detalle regalo directo ↓</p>
          </button>
        </div>
      </section>

      {/* StalkerGift — flujo anónimo */}
      <section id="gifts-stalkergift" className="flex flex-col gap-4 border-t border-gray-200 pt-8 scroll-mt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">StalkerGift</h2>
            <p className="text-sm text-gray-500">Regalo anónimo · pago en checkout → aceptación → envío</p>
          </div>
          <button
            type="button"
            onClick={() => scrollToGiftsSection('gifts-overview')}
            className="text-xs text-gray-500 hover:text-gray-800 shrink-0"
          >
            ↑ Resumen
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Activos en periodo" value={formatNumber(sg.activeInPeriod)} showTrend={false} icon={GiftIcon} hint="Creado, aceptado o enviado en el rango" />
          <KpiCard label="Creados" value={formatNumber(sg.created)} showTrend={false} icon={GiftIcon} />
          <KpiCard label="Enviados" value={formatNumber(sg.shipped)} showTrend={false} hint={`Ingresos envío: ${formatCurrency(sg.shippedRevenue)}`} />
          <KpiCard label="Tasa de aceptación" value={formatPercent(sg.acceptanceRate)} showTrend={false} hint={`${formatNumber(sg.accepted)} aceptados`} />
          <KpiCard label="Pagados" value={formatNumber(sg.paid)} showTrend={false} hint={`Tasa pago: ${formatPercent(sg.paidRate)}`} />
          <KpiCard
            label="Tiempo medio a aceptar"
            value={sg.avgTimeToAcceptHours !== null ? `${sg.avgTimeToAcceptHours.toString().replace('.', ',')} h` : '—'}
            showTrend={false}
          />
        </div>

        <ChartCard title="StalkerGift creados" subtitle="Por fecha de creación">
          <TimeSeriesChart
            data={data.stalkerGift.series}
            height={280}
            series={[{ key: 'count', label: 'Regalos', color: '#a855f7', type: 'area', format: 'number' }]}
          />
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Por estado">
            <DistributionDonut data={data.stalkerGift.byEstado} labels={GIFT_ESTADO_LABELS} />
          </ChartCard>
          <ChartCard title="Top regaladores" subtitle="StalkerGift en el periodo">
            <RankingTable items={data.stalkerGift.topSenders} valueLabel="Regalos" />
          </ChartCard>
        </div>
      </section>

      {/* Regalo directo — carrito regalo, no anónimo */}
      <section id="gifts-directo" className="flex flex-col gap-4 border-t border-gray-200 pt-8 scroll-mt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Regalo directo</h2>
            <p className="text-sm text-gray-500">Carrito regalo · compra para un amigo con identidades visibles</p>
          </div>
          <button
            type="button"
            onClick={() => scrollToGiftsSection('gifts-overview')}
            className="text-xs text-gray-500 hover:text-gray-800 shrink-0"
          >
            ↑ Resumen
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Pedidos confirmados" value={formatNumber(dg.orders)} showTrend={false} icon={ShoppingBagIcon} />
          <KpiCard label="Ingresos" value={formatCurrency(dg.revenue)} showTrend={false} icon={BanknotesIcon} />
          <KpiCard label="Ticket promedio" value={formatCurrency(dg.averageOrderValue)} showTrend={false} icon={ReceiptPercentIcon} />
          <KpiCard label="Unidades" value={formatNumber(dg.unitsSold)} showTrend={false} icon={CubeIcon} />
        </div>

        <ChartCard title="Regalos directos" subtitle="Pedidos confirmados en el periodo">
          <TimeSeriesChart
            data={data.directGift.series}
            height={280}
            series={[
              { key: 'count', label: 'Pedidos', color: '#ec4899', type: 'area', format: 'number', yAxisId: 'left' },
              { key: 'revenue', label: 'Ingresos', color: '#6366f1', type: 'line', format: 'currency', yAxisId: 'right' },
            ]}
          />
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Top remitentes" subtitle="Quién regala">
            <RankingTable items={data.directGift.topSenders} valueLabel="Regalos" />
          </ChartCard>
          <ChartCard title="Top destinatarios" subtitle="Quién recibe">
            <RankingTable items={data.directGift.topRecipients} valueLabel="Regalos" />
          </ChartCard>
        </div>
      </section>
    </div>
  )
}
