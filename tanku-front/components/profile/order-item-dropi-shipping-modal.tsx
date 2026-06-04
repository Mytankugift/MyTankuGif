'use client'

import { useCallback, useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ProfileTabletOverlayModal } from '@/components/profile/profile-tablet-overlay-modal'
import { NOTIFICATION_ROW_DIVIDER_STYLE } from '@/lib/notifications-display'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { dropiStatusChipClass, formatDropiStatus } from '@/lib/dropi-status'
import {
  getDropiFullData,
  getDropiHistorySorted,
  getDropiProductName,
  hasStoredDropiHistory,
  storedDropiDataToPreview,
  storedDropiWebhookOnlyToPreview,
  type DropiStatusPreview,
} from '@/lib/dropi-preview-parse'
interface OrderItemDropiShippingModalProps {
  open: boolean
  onClose: () => void
  orderItemId: string | null
  productTitle: string
  tankuDropiStatus?: string | null
  dropiWebhookData?: unknown
}

export function OrderItemDropiShippingModal({
  open,
  onClose,
  orderItemId,
  productTitle,
  tankuDropiStatus,
  dropiWebhookData,
}: OrderItemDropiShippingModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<DropiStatusPreview | null>(null)

  const loadFromDb = useCallback(() => {
    if (!hasStoredDropiHistory(dropiWebhookData)) return false
    const fromDb = storedDropiDataToPreview(dropiWebhookData)
    if (!fromDb) return false
    setPreview(fromDb)
    setError(null)
    return true
  }, [dropiWebhookData])

  useEffect(() => {
    if (!open || !orderItemId) {
      setPreview(null)
      setError(null)
      setLoading(false)
      return
    }

    if (loadFromDb()) return

    const webhookOnly = storedDropiWebhookOnlyToPreview(dropiWebhookData)
    if (webhookOnly) setPreview(webhookOnly)

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const response = await apiClient.get<DropiStatusPreview>(
          API_ENDPOINTS.ORDERS.DROPI_STATUS_BY_ITEM(orderItemId)
        )
        if (cancelled) return
        if (response.success && response.data) {
          setPreview(response.data)
          setError(null)
        }
      } catch (err: unknown) {
        if (cancelled) return
        if (!webhookOnly) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el envío')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, orderItemId, dropiWebhookData, loadFromDb])

  const fullData = getDropiFullData(preview)
  const statusRaw =
    (typeof preview?.status === 'string' ? preview.status : null) ??
    (typeof fullData?.status === 'string' ? fullData.status : null) ??
    tankuDropiStatus
  const statusLabel = statusRaw ? formatDropiStatus(statusRaw) : 'Sin estado'

  const history = fullData ? getDropiHistorySorted(fullData) : []
  const dropiProductName = fullData ? getDropiProductName(fullData) : null

  const shippingCompany =
    (typeof preview?.shipping_company === 'string' ? preview.shipping_company : null) ??
    (typeof fullData?.shipping_company === 'string' ? fullData.shipping_company : null)

  const shippingGuide =
    (typeof preview?.shipping_guide === 'string' ? preview.shipping_guide : null) ??
    (typeof fullData?.shipping_guide === 'string' ? fullData.shipping_guide : null)

  const sticker =
    (typeof preview?.sticker === 'string' ? preview.sticker : null) ??
    (typeof fullData?.sticker === 'string' ? fullData.sticker : null)

  const guideUrl =
    shippingCompany && sticker
      ? `${process.env.NEXT_PUBLIC_DROPI_API_URL || 'https://api.dropi.co'}/guias/${shippingCompany.toLowerCase()}/${sticker}`
      : null

  const storedGuideUrl =
    dropiWebhookData &&
    typeof dropiWebhookData === 'object' &&
    !Array.isArray(dropiWebhookData) &&
    typeof (dropiWebhookData as Record<string, unknown>).guideUrl === 'string'
      ? ((dropiWebhookData as Record<string, unknown>).guideUrl as string)
      : null

  return (
    <ProfileTabletOverlayModal
      open={open}
      onClose={onClose}
      titleId="order-dropi-shipping-title"
      mobileLayout="dialog"
      mobileBackdrop="blur"
      maxWidthClass="max-w-md"
      panelHeightClass="h-auto max-h-[min(32rem,85dvh)] md:max-h-[min(32rem,85vh)]"
    >
      <div
        className="flex shrink-0 items-start justify-between gap-2 border-b bg-[#171B21] px-4 py-3"
        style={NOTIFICATION_ROW_DIVIDER_STYLE}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Envío</p>
          <h3
            id="order-dropi-shipping-title"
            className="text-sm font-semibold leading-snug text-white line-clamp-2"
          >
            {productTitle}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-white/[0.06] hover:text-white"
          aria-label="Cerrar"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {loading && !preview ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#73FFA2]" />
          </div>
        ) : error && !preview ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#414141]/90 bg-black/20 px-3 py-2.5">
              <span className="text-xs text-gray-400">Estado actual</span>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${dropiStatusChipClass(statusRaw)}`}
              >
                {statusLabel}
              </span>
            </div>

            {shippingCompany ? (
              <div className="rounded-lg border border-[#414141]/90 bg-black/20 px-3 py-2.5">
                <p className="text-xs text-gray-500">Transportadora</p>
                <p className="mt-1 text-sm text-gray-200">{shippingCompany}</p>
                {shippingGuide ? (
                  <p className="mt-1 font-mono text-xs text-gray-500">Guía: {shippingGuide}</p>
                ) : null}
              </div>
            ) : null}

            {loading && history.length === 0 ? (
              <p className="text-xs text-gray-500">Cargando historial…</p>
            ) : null}

            {history.length > 0 ? (
              <div>
                <p className="mb-3 text-[10px] font-medium uppercase text-gray-500">
                  Historial del pedido
                </p>
                <ol className="relative ml-1 space-y-0">
                  {history.map((entry, idx) => {
                    const isLast = idx === history.length - 1
                    return (
                      <li key={idx} className="relative flex gap-3 pb-4 last:pb-0">
                        {!isLast ? (
                          <span
                            className="absolute left-[5px] top-2 bottom-0 w-px bg-[#414141]"
                            aria-hidden
                          />
                        ) : null}
                        <span className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#66DEDB] ring-2 ring-[#1a1a1a]" />
                        <div className="min-w-0 flex-1 text-xs">
                          {entry.created_at ? (
                            <time className="text-gray-500">
                              {new Date(entry.created_at).toLocaleString('es-CO')}
                            </time>
                          ) : null}
                          {entry.status ? (
                            <p className="mt-0.5 font-medium text-gray-200">
                              {formatDropiStatus(entry.status)}
                            </p>
                          ) : null}
                          {entry.notes ? (
                            <p className="mt-1 whitespace-pre-wrap text-gray-400">{entry.notes}</p>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ) : !loading ? (
              <p className="text-xs text-gray-500">
                El historial se mostrará cuando haya más movimientos en el envío.
              </p>
            ) : null}

            {dropiProductName && dropiProductName !== productTitle ? (
              <p className="text-xs text-gray-500">
                Producto en Dropi: <span className="text-gray-300">{dropiProductName}</span>
              </p>
            ) : null}

            {guideUrl || storedGuideUrl ? (
              <a
                href={guideUrl ?? storedGuideUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-xs font-medium text-[#73FFA2] hover:text-[#66DEDB]"
              >
                Abrir guía de envío
                {shippingGuide ? ` (${shippingGuide})` : ''}
              </a>
            ) : null}
          </div>
        )}
      </div>
    </ProfileTabletOverlayModal>
  )
}
