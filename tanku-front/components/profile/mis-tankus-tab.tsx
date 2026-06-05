'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import { OrdersTab } from '@/components/profile/orders-tab'
import { GiftsTab } from '@/components/profile/gifts-tab'
import { StalkerGiftPeriodSheet } from '@/components/stalkergift/stalkergift-period-sheet'
import {
  buildMisTankusPeriodOptions,
  getMisTankusPeriodRange,
} from '@/lib/utils/mis-tankus-period'

export type MisTankusFilter = 'all' | 'compras' | 'regalos'

interface MisTankusTabProps {
  userId: string
  /** Notificación / deep link: ?case= */
  initialOpenCaseId?: string | null
  /** Tras checkout: ?orderId= (sin ?case) */
  checkoutOrderId?: string | null
}

const FILTERS: { id: MisTankusFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'compras', label: 'Compras' },
  { id: 'regalos', label: 'Regalos' },
]

export function MisTankusTab({
  userId,
  initialOpenCaseId = null,
  checkoutOrderId = null,
}: MisTankusTabProps) {
  const [filter, setFilter] = useState<MisTankusFilter>('all')
  const [periodValue, setPeriodValue] = useState<string>('30d')
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false)

  /** Se recalcula en cada render para que los años disponibles sigan al calendario (p. ej. 2027, 2030). */
  const periodOptions = buildMisTankusPeriodOptions(new Date())
  const selectedPeriodLabel =
    periodOptions.find((o) => o.value === periodValue)?.label ?? 'Período'

  useEffect(() => {
    const opts = buildMisTankusPeriodOptions(new Date())
    if (!opts.some((o) => o.value === periodValue)) {
      setPeriodValue('30d')
    }
  }, [periodValue])

  const timeRange = useMemo(
    () => getMisTankusPeriodRange(periodValue, new Date()),
    [periodValue]
  )

  useEffect(() => {
    if (initialOpenCaseId) {
      setFilter((f) => (f === 'regalos' ? 'all' : f))
    }
  }, [initialOpenCaseId])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#414141] bg-[#171B21] px-2 py-1.5 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors sm:px-2.5 sm:py-1 sm:text-xs ${
                  filter === f.id
                    ? 'bg-[#73FFA2]/15 text-[#73FFA2] ring-1 ring-[#73FFA2]/40'
                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span id="mis-tankus-period-label" className="sr-only">
            Período
          </span>
          <div className="shrink-0">
            <button
              type="button"
              aria-labelledby="mis-tankus-period-label"
              aria-haspopup="listbox"
              aria-expanded={periodSheetOpen}
              aria-label={`Período: ${selectedPeriodLabel}. Abrir opciones`}
              title={`Período: ${selectedPeriodLabel}`}
              onClick={() => setPeriodSheetOpen(true)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#414141] bg-[#0f1218] text-gray-400 outline-none transition-colors hover:border-[#73FFA2]/50 hover:text-white focus-visible:border-[#73FFA2] focus-visible:ring-2 focus-visible:ring-[#73FFA2]/25 ${
                periodSheetOpen
                  ? 'border-[#73FFA2]/50 bg-[#73FFA2]/15 text-[#73FFA2] ring-1 ring-[#73FFA2]/40'
                  : ''
              }`}
            >
              <CalendarDaysIcon className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <StalkerGiftPeriodSheet
        open={periodSheetOpen}
        onClose={() => setPeriodSheetOpen(false)}
        options={periodOptions}
        value={periodValue}
        onChange={setPeriodValue}
      />

      {(filter === 'all' || filter === 'compras') && (
        <div className="space-y-3">
          {filter === 'all' && (
            <h3 className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Compras</h3>
          )}
          <OrdersTab
            userId={userId}
            initialOpenCaseId={initialOpenCaseId}
            checkoutOrderId={checkoutOrderId}
            timeRange={timeRange}
          />
        </div>
      )}

      {(filter === 'all' || filter === 'regalos') && (
        <div className="space-y-3">
          {filter === 'all' && (
            <h3 className="pt-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">Regalos</h3>
          )}
          <GiftsTab userId={userId} timeRange={timeRange} />
        </div>
      )}
    </div>
  )
}
