'use client'

import { useState } from 'react'
import {
  CursorArrowRaysIcon,
  UsersIcon,
  UserIcon,
  EyeSlashIcon,
  BoltIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { KpiCard } from './KpiCard'
import { ChartCard } from './ChartCard'
import { TimeSeriesChart } from './TimeSeriesChart'
import { DistributionDonut } from './DistributionDonut'
import { RankingTable } from './RankingTable'
import { formatNumber, formatPercent } from '@/lib/format/currency'
import type { BehaviorAnalytics, FunnelStep, RetentionCohort, SeriesPoint } from '@/lib/types/analytics'

const EVENT_TYPE_LABELS: Record<string, string> = {
  product_view: 'Vio en feed (impresión)',
  product_click: 'Abrió detalle',
  add_to_cart: 'Agregó al carrito',
  gift_cart_start: 'Inició regalo',
  profile_view: 'Vio perfil',
  wishlist_view: 'Vio wishlist',
  wishlist_add: 'Agregó a wishlist',
  purchase: 'Compró',
}

const GRANULARITY_LABEL: Record<string, string> = { day: 'diarios', week: 'semanales', month: 'mensuales' }
const GRANULARITY_NOUN: Record<string, string> = { day: 'día', week: 'semana', month: 'mes' }

/** Glosario de la pestaña Comportamiento (se muestra en el modal de ayuda). */
const METRIC_HELP: { term: string; desc: string }[] = [
  { term: 'Eventos totales', desc: 'Número total de interacciones registradas en el rango (cada vista, clic, agregado al carrito, etc.).' },
  { term: 'Actores activos', desc: 'Personas o sesiones únicas que generaron al menos un evento. Cuenta tanto usuarios logueados como anónimos (por sesión).' },
  { term: 'Usuarios registrados', desc: 'De los actores activos, cuántos estaban logueados (identidad de cuenta real).' },
  { term: 'Eventos anónimos', desc: 'Eventos disparados sin sesión iniciada (usuario no logueado en ese momento).' },
  { term: 'Eventos / actor', desc: 'Promedio de eventos por actor activo. Indica la intensidad de uso: más alto = cada persona interactúa más.' },
  { term: 'Pegajosidad (DAU/MAU)', desc: 'DAU promedio diario dividido por el MAU (actores únicos de los últimos 30 días), en %. Mide qué tan seguido vuelve la gente; más alto = más recurrencia.' },
  { term: 'Usuarios activos diarios (DAU)', desc: 'Serie con los actores únicos por día y el total de eventos por día. Útil para ver tendencia de actividad.' },
  { term: 'Embudo de adquisición', desc: 'Pasos secuenciales: Vio en feed (impresión) → Abrió detalle → Agregó al carrito. El % a la derecha es la conversión respecto al paso anterior (dónde se cae la gente). La impresión es exposición pasiva (la card pasó por pantalla); abrir detalle ya es interés real.' },
  { term: 'Resultados', desc: 'Desenlaces alternativos desde «Abrió detalle» (NO son secuenciales entre sí): Agregó a wishlist, Compró para sí (compra propia, no regalo) e Inició regalo. El % es respecto a los actores que abrieron detalle. Un mismo actor puede caer en varios.' },
  { term: 'Eventos por tipo', desc: 'Distribución de interacciones reales en el rango (clics, carrito, wishlist, compra, etc.). No incluye impresiones pasivas del feed (`product_view`), que con el ranking global actual distorsionan el gráfico; esas impresiones sí aparecen en el embudo como paso de exposición.' },
  { term: 'Retención semanal por cohorte', desc: 'Agrupa a los usuarios registrados por la semana de su primer evento (cohorte) y muestra el % que vuelve en las semanas siguientes (S0, S1, S2…). Necesita varias semanas de datos para llenarse.' },
  { term: 'Top productos abiertos', desc: 'Productos con más aperturas de detalle (`product_click`: modal del feed o página del producto). «Aperturas totales» cuenta cada apertura; «Usuarios únicos» cuenta cuentas o sesiones distintas que abrieron al menos una vez. Mide interés activo, no impresiones de scroll.' },
]

const FUNNEL_HELP: { term: string; desc: string }[] = [
  {
    term: '¿Qué es este embudo?',
    desc: 'Resume el interés en productos en tres pasos conceptuales: exposición en el feed → apertura de detalle → agregar al carrito. Cada fila muestra cuántos actores únicos generaron ese evento al menos una vez en el rango de fechas.',
  },
  {
    term: 'Actor único',
    desc: 'Usuario logueado (por cuenta) o visitante anónimo (por sesión). Una misma persona no se cuenta dos veces en un mismo paso.',
  },
  {
    term: 'Vio en feed (impresión)',
    desc: 'La card del producto entró en pantalla al hacer scroll (evento product_view). Es exposición pasiva: el producto se mostró, aunque no haya hecho clic.',
  },
  {
    term: 'Abrió detalle',
    desc: 'Abrió el modal del producto en el feed o entró a la página del producto (evento product_click). Indica interés activo, no solo scroll.',
  },
  {
    term: 'Agregó al carrito',
    desc: 'Añadió al menos un producto al carrito (evento add_to_cart). No implica compra ni checkout.',
  },
  {
    term: 'Porcentaje a la derecha',
    desc: 'Conversión respecto al paso anterior: actores de este paso ÷ actores del paso de arriba. Ejemplo: 3 vieron, 1 abrió → 33,3 %. El primer paso no tiene %.',
  },
  {
    term: 'Cómo leerlo',
    desc: 'Los pasos se muestran en orden lógico, pero el cálculo compara totales por tipo de evento en el periodo (no exige mismo producto ni misma visita en secuencia). Con poco tráfico los números pueden variar mucho de un día a otro.',
  },
]

const OUTCOMES_HELP: { term: string; desc: string }[] = [
  {
    term: '¿Qué son los resultados?',
    desc: 'Desenlaces alternativos que alguien puede tomar después de mostrar interés en un producto. No son pasos en cadena: un mismo actor puede aparecer en varios resultados.',
  },
  {
    term: 'Base del cálculo',
    desc: 'Todos los porcentajes usan como denominador los actores que abrieron detalle (product_click) en el periodo. Si la base es 1, un solo evento ya marca 0 % o 100 %.',
  },
  {
    term: 'Agregó a wishlist',
    desc: 'Guardó un producto en la wishlist (evento wishlist_add) en el rango seleccionado.',
  },
  {
    term: 'Compró para sí',
    desc: 'Completó una compra propia, no regalo (evento purchase con isGift = false).',
  },
  {
    term: 'Inició regalo',
    desc: 'Empezó el flujo de regalo o carrito regalo (evento gift_cart_start).',
  },
  {
    term: 'Porcentaje junto al número',
    desc: 'Actores con ese desenlace ÷ actores que abrieron detalle. Ejemplo: base 10, 2 en wishlist → 20 %.',
  },
  {
    term: 'Relación con el embudo',
    desc: '«Agregó al carrito» solo aparece en el embudo de la izquierda. Aquí se miden wishlist, compra y regalo. Puedes tener carrito en el embudo y 0 % en todos los resultados si nadie wishlisteó, compró ni inició regalo.',
  },
]

const RETENTION_HELP: { term: string; desc: string }[] = [
  {
    term: '¿Qué es la retención por cohorte?',
    desc: 'Mide si los usuarios registrados vuelven a usar la plataforma en las semanas después de su primera actividad. Cada fila es una cohorte (grupo que «entró» la misma semana).',
  },
  {
    term: 'Cohorte (columna izquierda)',
    desc: 'Semana en la que ese usuario registró su primer evento en Tanku (fecha de inicio de la fila, formato YYYY-MM-DD).',
  },
  {
    term: 'Usuarios (tamaño de cohorte)',
    desc: 'Cuántos usuarios registrados tuvieron su primer evento en esa semana. Es el 100 % de referencia para S0.',
  },
  {
    term: 'S0, S1, S2…',
    desc: 'Semanas transcurridas desde la cohorte: S0 = semana de entrada, S1 = una semana después, S2 = dos semanas después, etc. Cada celda es el % de esa cohorte que generó al menos un evento en esa semana.',
  },
  {
    term: 'Cómo leer un porcentaje',
    desc: 'Ejemplo: cohorte con 50 usuarios, S1 = 24 % → 12 de esos 50 volvieron a tener actividad la semana siguiente. S0 suele ser 100 % (todos activos en su semana de entrada).',
  },
  {
    term: 'Solo usuarios registrados',
    desc: 'No incluye sesiones anónimas: hace falta user_id para seguir a la misma persona entre semanas.',
  },
  {
    term: 'Cuándo aparece vacío o incompleto',
    desc: 'Hacen falta varias semanas de datos. Las celdas futuras (cohortes que aún no llegaron a S3, etc.) muestran «·». Con pocos usuarios los % pueden saltar mucho.',
  },
]

export function BehaviorTab({ data }: { data: BehaviorAnalytics }) {
  const s = data.scalars
  const [showHelp, setShowHelp] = useState(false)
  const [showFunnelHelp, setShowFunnelHelp] = useState(false)
  const [showOutcomesHelp, setShowOutcomesHelp] = useState(false)
  const [showRetentionHelp, setShowRetentionHelp] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Métricas de comportamiento derivadas de los eventos de la plataforma.
        </p>
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          <InformationCircleIcon className="h-4 w-4" />
          ¿Qué significa cada métrica?
        </button>
      </div>

      {showHelp && (
        <SectionHelpModal
          title="¿Qué significa cada métrica?"
          items={METRIC_HELP}
          footer="Nota: «actor» = usuario logueado o, si es anónimo, su sesión. La retención usa solo usuarios registrados."
          onClose={() => setShowHelp(false)}
        />
      )}
      {showFunnelHelp && (
        <SectionHelpModal
          title="Embudo de adquisición"
          items={FUNNEL_HELP}
          onClose={() => setShowFunnelHelp(false)}
        />
      )}
      {showOutcomesHelp && (
        <SectionHelpModal
          title="Resultados"
          items={OUTCOMES_HELP}
          onClose={() => setShowOutcomesHelp(false)}
        />
      )}
      {showRetentionHelp && (
        <SectionHelpModal
          title="Retención semanal por cohorte"
          items={RETENTION_HELP}
          onClose={() => setShowRetentionHelp(false)}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Eventos totales" value={formatNumber(s.totalEvents)} showTrend={false} icon={CursorArrowRaysIcon} />
        <KpiCard label="Actores activos" value={formatNumber(s.activeActors)} showTrend={false} icon={UsersIcon} hint="Usuario o sesión" />
        <KpiCard label="Usuarios registrados" value={formatNumber(s.registeredUsers)} showTrend={false} icon={UserIcon} />
        <KpiCard label="Eventos anónimos" value={formatNumber(s.anonymousEvents)} showTrend={false} icon={EyeSlashIcon} />
        <KpiCard label="Eventos / actor" value={s.eventsPerActor.toString().replace('.', ',')} showTrend={false} icon={BoltIcon} />
        <KpiCard
          label="Pegajosidad (DAU/MAU)"
          value={formatPercent(data.stickiness.ratio)}
          showTrend={false}
          icon={ArrowPathIcon}
          hint={`DAU prom. ${data.stickiness.avgDau.toString().replace('.', ',')} · MAU ${formatNumber(data.stickiness.mau)}`}
        />
      </div>

      <ChartCard
        title={`Usuarios activos (${GRANULARITY_LABEL[data.range.granularity] ?? 'día'})`}
        subtitle={`Actores únicos por ${GRANULARITY_NOUN[data.range.granularity] ?? 'día'} y eventos totales`}
      >
        <TimeSeriesChart
          data={data.dauSeries as unknown as SeriesPoint[]}
          height={320}
          series={[
            { key: 'dau', label: 'Activos', color: '#6366f1', type: 'area', format: 'number', yAxisId: 'left' },
            { key: 'events', label: 'Eventos', color: '#f59e0b', type: 'line', format: 'number', yAxisId: 'right' },
          ]}
        />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Embudo de adquisición"
          subtitle="Actores únicos por paso: vio → abrió → carrito (incluye anónimos)"
          action={<SectionHelpButton label="¿Cómo leer el embudo?" onClick={() => setShowFunnelHelp(true)} />}
        >
          <FunnelChart steps={data.funnel} />
        </ChartCard>
        <ChartCard
          title="Resultados"
          subtitle="Desenlaces desde «Abrió detalle» (alternativos, no secuenciales)"
          action={<SectionHelpButton label="¿Cómo leer los resultados?" onClick={() => setShowOutcomesHelp(true)} />}
        >
          <OutcomesChart outcomes={data.outcomes} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Eventos por tipo"
          subtitle="Interacciones reales (sin impresiones pasivas del feed)"
        >
          <DistributionDonut data={data.eventsByType} labels={EVENT_TYPE_LABELS} />
        </ChartCard>
        <ChartCard
          title="Top productos abiertos"
          subtitle="Aperturas de detalle (modal o página); ordenado por total"
        >
          <RankingTable
            items={data.topOpenedProducts}
            valueLabel="Aperturas totales"
            extraColumns={[{ label: 'Usuarios únicos', getValue: (item) => item.extra }]}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Retención semanal por cohorte"
        subtitle="Usuarios registrados; % que vuelve cada semana"
        action={<SectionHelpButton label="¿Cómo leer la retención?" onClick={() => setShowRetentionHelp(true)} />}
      >
        <RetentionHeatmap retention={data.retention} />
      </ChartCard>
    </div>
  )
}

function OutcomesChart({ outcomes }: { outcomes: BehaviorAnalytics['outcomes'] }) {
  const { openActors, items } = outcomes
  if (openActors === 0 && items.every((it) => it.actors === 0)) {
    return <p className="py-8 text-center text-sm text-gray-400">Sin datos en el rango seleccionado</p>
  }
  const COLORS: Record<string, string> = {
    wishlist_add: '#8b5cf6',
    self_purchase: '#10b981',
    gift_cart_start: '#f59e0b',
  }
  return (
    <div className="flex flex-col gap-3 py-1">
      <p className="text-xs text-gray-500">
        Base: <span className="font-semibold text-gray-700">{openActors.toLocaleString('es-CO')}</span> actores que abrieron detalle
      </p>
      {items.map((it) => {
        const pct = it.conversionFromOpen ?? 0
        return (
          <div key={it.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{it.label}</span>
              <span className="font-semibold text-gray-900">
                {it.actors.toLocaleString('es-CO')}
                {it.conversionFromOpen !== null && (
                  <span className="ml-1.5 text-xs font-normal text-gray-400">
                    {pct.toString().replace('.', ',')}%
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: COLORS[it.key] ?? '#6366f1' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SectionHelpButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
    >
      <InformationCircleIcon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

function SectionHelpModal({
  title,
  items,
  footer,
  onClose,
}: {
  title: string
  items: { term: string; desc: string }[]
  footer?: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <dl className="divide-y divide-gray-100 px-5 py-2">
          {items.map((m) => (
            <div key={m.term} className="py-3">
              <dt className="text-sm font-semibold text-gray-800">{m.term}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-gray-600">{m.desc}</dd>
            </div>
          ))}
        </dl>
        {footer && (
          <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">{footer}</div>
        )}
      </div>
    </div>
  )
}

function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  if (!steps || steps.length === 0 || steps.every((s) => s.actors === 0)) {
    return <div className="text-sm text-gray-400 py-8 text-center">Sin datos en el rango seleccionado</div>
  }
  const max = Math.max(...steps.map((s) => s.actors), 1)

  return (
    <div className="flex flex-col gap-3 py-1">
      {steps.map((step) => {
        const width = Math.max((step.actors / max) * 100, step.actors > 0 ? 4 : 0)
        return (
          <div key={step.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{step.label}</span>
              <span className="font-medium text-gray-900 tabular-nums">{formatNumber(step.actors)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-6 rounded-md bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-md bg-gradient-to-r from-indigo-500 to-indigo-400"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="w-16 text-right text-xs tabular-nums text-gray-500">
                {step.conversionFromPrev === null ? '—' : `${formatPercent(step.conversionFromPrev)}`}
              </span>
            </div>
          </div>
        )
      })}
      <p className="text-xs text-gray-400 mt-1">El % a la derecha es la conversión respecto al paso anterior.</p>
    </div>
  )
}

function RetentionHeatmap({ retention }: { retention: BehaviorAnalytics['retention'] }) {
  const { cohorts, weekOffsets } = retention
  if (!cohorts || cohorts.length === 0) {
    return <div className="text-sm text-gray-400 py-8 text-center">Sin datos suficientes para cohortes</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-gray-400">
            <th className="py-2 pr-3 text-left font-medium">Cohorte</th>
            <th className="py-2 pr-3 text-right font-medium">Usuarios</th>
            {weekOffsets.map((w) => (
              <th key={w} className="py-2 px-1 text-center font-medium">
                S{w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort: RetentionCohort) => (
            <tr key={cohort.cohort}>
              <td className="py-1.5 pr-3 text-gray-700 whitespace-nowrap">{cohort.cohort}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums text-gray-900">{formatNumber(cohort.size)}</td>
              {cohort.values.map((value, i) => (
                <td key={i} className="py-1 px-0.5 text-center">
                  {value === null ? (
                    <span className="text-gray-300">·</span>
                  ) : (
                    <span
                      className="inline-block w-full rounded px-1 py-0.5 tabular-nums"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${Math.max(value / 100, 0.06)})`,
                        color: value > 55 ? '#fff' : '#3730a3',
                      }}
                    >
                      {Math.round(value)}%
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
