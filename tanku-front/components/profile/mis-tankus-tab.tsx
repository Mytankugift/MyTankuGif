'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { OrdersTab } from '@/components/profile/orders-tab'
import { GiftsTab } from '@/components/profile/gifts-tab'
import { TankuCustomSelect } from '@/components/ui/tanku-custom-select'
import {
  buildMisTankusPeriodOptions,
  getMisTankusPeriodRange,
  type MisTankusPeriodOption,
} from '@/lib/utils/mis-tankus-period'

export type MisTankusFilter = 'all' | 'compras' | 'regalos'

interface MisTankusTabProps {
  userId: string
  initialOrderId?: string | null
}

const FILTERS: { id: MisTankusFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'compras', label: 'Compras' },
  { id: 'regalos', label: 'Regalos' },
]

function MisTankusPeriodMobileSheet({
  open,
  onClose,
  options,
  value,
  onChange,
}: {
  open: boolean
  onClose: () => void
  options: MisTankusPeriodOption[]
  value: string
  onChange: (v: string) => void
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[285] flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:hidden"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[16.5rem] overflow-hidden rounded-2xl border border-[#414141] bg-[#171B21] shadow-2xl">
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{
            borderImage:
              'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
          }}
        >
          <h2 className="text-xs font-semibold text-white">Período</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <ul className="custom-scrollbar max-h-[min(52vh,14rem)] overflow-y-auto py-1.5">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                className={`mx-1.5 flex w-[calc(100%-0.75rem)] rounded-lg px-2 py-2 text-left text-[11px] leading-snug transition-colors hover:bg-white/[0.06] ${
                  value === opt.value
                    ? 'bg-[#73FFA2]/15 font-medium text-[#73FFA2]'
                    : 'text-white'
                }`}
                onClick={() => {
                  onChange(opt.value)
                  onClose()
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  )
}

export function MisTankusTab({ userId, initialOrderId }: MisTankusTabProps) {
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#414141] bg-[#171B21] px-2 py-1.5 shadow-xl">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
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
          <span id="mis-tankus-period-label" className="sr-only">
            Período
          </span>
          <div className="ml-auto flex min-w-0 shrink-0 basis-auto">
            <div className="hidden md:block md:w-[9.25rem]">
              <TankuCustomSelect
                label=""
                labelId="mis-tankus-period-label"
                placeholder="Período"
                value={periodValue}
                onChange={setPeriodValue}
                options={periodOptions}
                menuZIndex={280}
                compact
              />
            </div>
            <button
              type="button"
              aria-labelledby="mis-tankus-period-label"
              onClick={() => setPeriodSheetOpen(true)}
              className="relative flex min-h-[26px] w-auto max-w-[10rem] items-center rounded-full border border-[#414141] bg-[#0f1218] py-0.5 pl-2 pr-7 text-left text-[11px] text-white outline-none transition-colors hover:border-[#73FFA2]/50 focus-visible:border-[#73FFA2] focus-visible:ring-2 focus-visible:ring-[#73FFA2]/25 md:hidden"
            >
              <span className="min-w-0 truncate text-white">{selectedPeriodLabel}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex w-7 items-center justify-center">
                <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
              </span>
            </button>
          </div>
        </div>
      </div>

      <MisTankusPeriodMobileSheet
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
          <OrdersTab userId={userId} initialOrderId={initialOrderId} timeRange={timeRange} />
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
