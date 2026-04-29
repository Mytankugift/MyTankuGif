'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowsUpDownIcon, FunnelIcon, GiftIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { StalkerGiftCard } from '@/components/stalkergift/stalkergift-card'
import { StalkerGiftDetailModal } from '@/components/stalkergift/stalkergift-gift-detail-modal'
import {
  MisStalkerGiftFilterSheet,
  labelForMisFilter,
  type StalkerGiftMisFilter,
} from '@/components/stalkergift/stalkergift-mis-filter-sheet'
import { StalkerGiftPeriodSheet } from '@/components/stalkergift/stalkergift-period-sheet'
import { STALKERGIFT_PATH } from '@/components/stalkergift/stalkergift-paths'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  buildMisTankusPeriodOptions,
  getMisTankusPeriodRange,
  isDateInRange,
} from '@/lib/utils/mis-tankus-period'
import type { OrderDTO, StalkerGiftDTO } from '@/types/api'

/** @deprecated filtros legacy en URL (`mis-tab-todos`) */
export type MisStalkerScope = 'all' | 'received' | 'sent'
/** @deprecated */
export type MisStalkerRecvSub = 'all' | 'pending' | 'accepted' | 'rejected'

type UnifiedItem = { gift: StalkerGiftDTO; role: 'received' | 'sent' }

function findOrderForGift(orders: OrderDTO[], gift: StalkerGiftDTO): OrderDTO | undefined {
  const byId = gift.orderId ? orders.find((o) => o.id === gift.orderId) : undefined
  if (byId) return byId
  return orders.find((o) => o.stalkerGift?.id === gift.id)
}

function isSgFilter(v: string | null): v is StalkerGiftMisFilter {
  return (
    v === 'all' ||
    v === 'pending' ||
    v === 'accepted' ||
    v === 'sent' ||
    v === 'rejected'
  )
}

/** `sgFilter` en URL (+ lectura legacy `misScope` / `recvSub`). */
function deriveFilterFromSearchParams(searchParams: Readonly<{ get: (k: string) => string | null }>): StalkerGiftMisFilter {
  const sg = searchParams.get('sgFilter')
  if (isSgFilter(sg)) return sg

  const misScope = searchParams.get('misScope')
  const recvSub = searchParams.get('recvSub')
  if (misScope === 'sent') return 'sent'
  if (misScope === 'received') {
    if (recvSub === 'pending') return 'pending'
    if (recvSub === 'accepted') return 'accepted'
    if (recvSub === 'rejected') return 'rejected'
    return 'all'
  }

  return 'all'
}

function matchesSgFilter(item: UnifiedItem, f: StalkerGiftMisFilter): boolean {
  const g = item.gift
  switch (f) {
    case 'all':
      return true
    case 'pending':
      return g.estado === 'WAITING_ACCEPTANCE' || g.estado === 'PAID'
    case 'accepted':
      return g.estado === 'ACCEPTED'
    case 'sent':
      return item.role === 'sent'
    case 'rejected':
      return g.estado === 'REJECTED' || g.estado === 'CANCELLED'
    default:
      return true
  }
}

async function fetchOrdersList(): Promise<OrderDTO[]> {
  const response = await apiClient.get<{ orders: OrderDTO[]; total: number; hasMore: boolean } | OrderDTO[]>(
    API_ENDPOINTS.ORDERS.STALKER_GIFTS,
  )
  if (!response.success || !response.data) return []
  const data = response.data
  if (typeof data === 'object' && data !== null && 'orders' in data && Array.isArray((data as { orders: OrderDTO[] }).orders)) {
    return (data as { orders: OrderDTO[] }).orders
  }
  if (Array.isArray(data)) return data as OrderDTO[]
  return []
}

interface MisStalkerGiftTabProps {
  userId: string
  initialOrderId?: string | null
}

export function MisStalkerGiftTab({ userId, initialOrderId }: MisStalkerGiftTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [receivedGifts, setReceivedGifts] = useState<StalkerGiftDTO[]>([])
  const [sentGifts, setSentGifts] = useState<StalkerGiftDTO[]>([])
  const [ordersList, setOrdersList] = useState<OrderDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const periodOptions = useMemo(() => buildMisTankusPeriodOptions(new Date()), [])
  const validPeriodSet = useMemo(() => new Set(periodOptions.map((o) => o.value)), [periodOptions])

  const [periodValue, setPeriodValue] = useState('30d')
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const [detailItem, setDetailItem] = useState<UnifiedItem | null>(null)

  const sgFilter = useMemo(() => deriveFilterFromSearchParams(searchParams), [searchParams])
  const filterLabelShort = labelForMisFilter(sgFilter)

  const selectedPeriodLabel = useMemo(
    () => periodOptions.find((o) => o.value === periodValue)?.label ?? 'Período',
    [periodOptions, periodValue],
  )

  useEffect(() => {
    const raw = searchParams.get('sgPeriod')
    if (raw && validPeriodSet.has(raw)) {
      setPeriodValue(raw)
    }
  }, [searchParams, validPeriodSet])

  const applyPeriod = useCallback(
    (v: string) => {
      setPeriodValue(v)
      const q = new URLSearchParams(searchParams.toString())
      q.delete('tab')
      q.set('sgPeriod', v)
      q.delete('misScope')
      q.delete('recvSub')
      router.replace(`${STALKERGIFT_PATH.gifts}?${q.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const timeRange = useMemo(() => getMisTankusPeriodRange(periodValue, new Date()), [periodValue])

  /** Limpia `misScope` / `recvSub` y fija `sgFilter` cuando vengan enlaces antiguos. */
  useEffect(() => {
    if (!searchParams.has('misScope') && !searchParams.has('recvSub')) return
    const q = new URLSearchParams(searchParams.toString())
    if (!q.get('sgFilter')) q.set('sgFilter', deriveFilterFromSearchParams(searchParams))
    q.delete('misScope')
    q.delete('recvSub')
    router.replace(`${STALKERGIFT_PATH.gifts}?${q.toString()}`, { scroll: false })
  }, [searchParams, router])

  const setSgFilter = useCallback(
    (filter: StalkerGiftMisFilter) => {
      const q = new URLSearchParams(searchParams.toString())
      q.delete('tab')
      q.set('sgFilter', filter)
      q.delete('misScope')
      q.delete('recvSub')
      router.replace(`${STALKERGIFT_PATH.gifts}?${q.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const loadAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const [rRes, sRes, orders] = await Promise.all([
        apiClient.get<StalkerGiftDTO[]>(API_ENDPOINTS.STALKER_GIFT.RECEIVED),
        apiClient.get<StalkerGiftDTO[]>(API_ENDPOINTS.STALKER_GIFT.SENT),
        fetchOrdersList(),
      ])
      setReceivedGifts(rRes.success && rRes.data ? rRes.data : [])
      setSentGifts(sRes.success && sRes.data ? sRes.data : [])
      setOrdersList(Array.isArray(orders) ? orders : [])
      if (!rRes.success && rRes.error?.message) {
        setError(rRes.error.message)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar StalkerGift'
      setError(msg)
      setReceivedGifts([])
      setSentGifts([])
      setOrdersList([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const receivedInPeriod = useMemo(
    () => receivedGifts.filter((g) => isDateInRange(g.createdAt, timeRange)),
    [receivedGifts, timeRange],
  )

  const sentInPeriod = useMemo(() => sentGifts.filter((g) => isDateInRange(g.createdAt, timeRange)), [sentGifts, timeRange])

  const unifiedList = useMemo((): UnifiedItem[] => {
    const items: UnifiedItem[] = [
      ...receivedInPeriod.map((g) => ({ gift: g, role: 'received' as const })),
      ...sentInPeriod.map((g) => ({ gift: g, role: 'sent' as const })),
    ]
    items.sort((a, b) => new Date(b.gift.createdAt).getTime() - new Date(a.gift.createdAt).getTime())
    return items
  }, [receivedInPeriod, sentInPeriod])

  const filteredList = useMemo(
    () => unifiedList.filter((i) => matchesSgFilter(i, sgFilter)),
    [unifiedList, sgFilter],
  )

  /** Abrir detalle cuando viene `orderId` en la URL */
  useEffect(() => {
    if (!initialOrderId) return

    let cancelled = false

    const fromLocal = (): UnifiedItem | null => {
      for (const item of unifiedList) {
        if (item.gift.orderId === initialOrderId) return item
      }
      const orderHit = ordersList.find((o) => o.id === initialOrderId)
      const gid = orderHit?.stalkerGift?.id
      if (!gid) return null
      const hit = unifiedList.find((i) => i.gift.id === gid)
      return hit ?? null
    }

    const local = fromLocal()
    if (local) {
      setDetailItem(local)
      return () => {
        cancelled = true
      }
    }

    void apiClient.get<OrderDTO>(API_ENDPOINTS.ORDERS.BY_ID(initialOrderId)).then((res) => {
      if (cancelled || !res.success || !res.data?.stalkerGift?.id) return
      const gid = res.data.stalkerGift.id
      if (sentGifts.some((g) => g.id === gid)) {
        const gift = sentGifts.find((g) => g.id === gid)
        if (gift) setDetailItem({ gift, role: 'sent' })
        return
      }
      const gift = receivedGifts.find((g) => g.id === gid)
      if (gift) setDetailItem({ gift, role: 'received' })
    })

    return () => {
      cancelled = true
    }
  }, [initialOrderId, unifiedList, ordersList, sentGifts, receivedGifts])

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#73FFA2]" />
        <p className="text-gray-400">Cargando…</p>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-4 sm:mt-3">
      <div className="flex flex-wrap items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
            <GiftIcon className="h-6 w-6 text-[#FE9600B3]" aria-hidden />
            <span>
              Mis <span className="font-semibold tracking-wide">STALKERGIFT</span>
            </span>
          </h2>
          <p className="mt-0.5 text-sm text-gray-400">
            Regalos anónimos.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          aria-haspopup="listbox"
          aria-expanded={filterSheetOpen}
          aria-label={`Mostrar regalos: ${filterLabelShort}. Abrir opciones`}
          title={`Filtro: ${filterLabelShort}`}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-[#171B21]/80 px-2 py-2 text-xs transition-colors shadow-sm md:px-3 md:py-2',
            filterSheetOpen
              ? 'bg-[#73FFA2]/14 text-[#73FFA2] ring-1 ring-[#73FFA2]/35'
              : 'text-gray-400 hover:bg-white/[0.06] hover:text-white',
          )}
        >
          <FunnelIcon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="hidden md:inline">Todos los estados</span>
          <span className="sr-only md:hidden">Filtro</span>
        </button>

        <button
          type="button"
          onClick={() => setPeriodSheetOpen(true)}
          aria-haspopup="listbox"
          aria-expanded={periodSheetOpen}
          aria-label={`Período: ${selectedPeriodLabel}. Abrir opciones`}
          title={`Período: ${selectedPeriodLabel}`}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-[#171B21]/80 px-2 py-2 text-xs transition-colors shadow-sm md:px-3 md:py-2',
            periodSheetOpen
              ? 'bg-[#66DEDB]/16 text-[#66DEDB] ring-1 ring-[#66DEDB]/30'
              : 'text-gray-400 hover:bg-white/[0.06] hover:text-white',
          )}
        >
          <ArrowsUpDownIcon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="hidden md:inline">Más recientes</span>
          <span className="sr-only md:hidden">Período</span>
        </button>
      </div>
      </div>

      <MisStalkerGiftFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        value={sgFilter}
        onChange={setSgFilter}
      />

      <StalkerGiftPeriodSheet
        open={periodSheetOpen}
        onClose={() => setPeriodSheetOpen(false)}
        title="Período"
        options={periodOptions}
        value={periodValue}
        onChange={applyPeriod}
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex w-full flex-col gap-4">
          {filteredList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-gray-500">
              No hay regalos en este período para “{filterLabelShort}”.
            </div>
          ) : (
            filteredList.map(({ gift, role }) => {
              const linked = findOrderForGift(ordersList, gift)
              return (
                <StalkerGiftCard
                  key={`${gift.id}-${role}`}
                  gift={gift}
                  role={role}
                  linkedOrder={linked}
                  onUpdate={() => void loadAll()}
                  onOpenDetail={() => setDetailItem({ gift, role })}
                />
              )
            })
          )}
        </div>
      </section>

      {detailItem ? (
        <StalkerGiftDetailModal
          isOpen={Boolean(detailItem)}
          onClose={() => setDetailItem(null)}
          gift={detailItem.gift}
          role={detailItem.role}
          linkedOrder={findOrderForGift(ordersList, detailItem.gift)}
        />
      ) : null}
    </div>
  )
}
