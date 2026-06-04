'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { SupportCaseDetail, SupportCaseDropiPreview } from '@/lib/types/support-cases'
import { DropiLineActions } from '@/components/support-cases/DropiLineActions'
import { SupportCaseDropiProviderLinks } from '@/components/support-cases/SupportCaseDropiProviderLinks'
import { DropiPreviewModal } from '@/components/support-cases/DropiPreviewModal'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { dropiStatusBadgeClass, formatDropiStatus } from '@/lib/dropi-status'
import {
  getCachedDropiPreview,
  setCachedDropiPreview,
  dropiPreviewCacheAgeMs,
} from '@/lib/dropi-preview-cache'
import { DROPI_PREVIEW_CACHE_TTL_MS } from '@/lib/dropi-preview-parse'
import {
  getSupportCaseReportedItemIds,
  isSupportCaseReportedItem,
} from '@/lib/support-case-reported-items'

interface SupportCaseOrderLinesProps {
  detail: SupportCaseDetail
}

function formatCacheHint(caseId: string, orderItemId: string): string | null {
  const age = dropiPreviewCacheAgeMs(caseId, orderItemId)
  if (age == null) return null
  const min = Math.floor(age / 60000)
  if (min < 1) return 'Consultado hace menos de 1 min (en caché)'
  return `Consultado hace ${min} min (en caché · actualiza cada ${DROPI_PREVIEW_CACHE_TTL_MS / 60000} min)`
}

export function SupportCaseOrderLines({ detail }: SupportCaseOrderLinesProps) {
  const { snapshot } = detail
  const reportedItemIds = getSupportCaseReportedItemIds(detail)
  const dropiByItemId = new Map(
    (detail.dropiOrderItems ?? []).map((d) => [d.orderItemId, d])
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<SupportCaseDropiPreview | null>(null)
  const [previewProductLabel, setPreviewProductLabel] = useState('')
  const [activeOrderItemId, setActiveOrderItemId] = useState<string | null>(null)

  const fetchDropiPreview = async (
    orderItemId: string,
    productLabel: string,
    forceRefresh: boolean
  ) => {
    setActiveOrderItemId(orderItemId)
    setPreviewProductLabel(productLabel)
    setError(null)

    if (!forceRefresh) {
      const cached = getCachedDropiPreview(detail.id, orderItemId)
      if (cached) {
        setPreviewData(cached)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    if (forceRefresh) setPreviewData(null)

    try {
      const response = await apiClient.get<{ success: boolean; data: SupportCaseDropiPreview }>(
        API_ENDPOINTS.ADMIN.SUPPORT_CASES.DROPI_PREVIEW(detail.id, orderItemId)
      )
      if (response.data.data) {
        setPreviewData(response.data.data)
        setCachedDropiPreview(detail.id, orderItemId, response.data.data)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar Dropi')
    } finally {
      setLoading(false)
    }
  }

  const openDropiPreview = async (orderItemId: string, productLabel: string) => {
    setModalOpen(true)
    setPreviewData(null)
    await fetchDropiPreview(orderItemId, productLabel, false)
  }

  const refreshDropiPreview = () => {
    if (!activeOrderItemId) return
    void fetchDropiPreview(activeOrderItemId, previewProductLabel, true)
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Bloques del pedido</h2>
        <p className="mt-1 text-sm text-gray-500">
          Captura al reportar el{' '}
          {new Date(snapshot.reportedAt).toLocaleString('es-CO', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
          . «Al reportar» es histórico; «En Tanku (BD)» es el estado guardado en Tanku (webhook o
          actualización). «Consultar estado en Dropi» consulta la API en vivo (con caché 10 min).
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.items.map((item) => {
            const isReportProduct = isSupportCaseReportedItem(item.id, reportedItemIds)
            const live = dropiByItemId.get(item.id)
            const imageUrl = item.productImageUrl ?? live?.productImageUrl ?? null
            const label = item.variantTitle
              ? `${item.productTitle} — ${item.variantTitle}`
              : item.productTitle
            const dropiOrderId = item.dropiOrderId ?? live?.dropiOrderId ?? null
            const liveStatus = live?.dropiStatus ?? null

            return (
              <article
                key={item.id}
                className={`flex h-full flex-col rounded-xl border p-4 shadow-sm ${
                  isReportProduct
                    ? 'border-blue-400 bg-blue-50/60 ring-1 ring-blue-200'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="relative mx-auto aspect-square w-full max-w-[140px] overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={item.productTitle}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="mt-3 min-w-0 flex-1">
                  {isReportProduct ? (
                    <span className="mb-2 inline-block rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Producto del reporte
                    </span>
                  ) : null}
                  <p className="font-medium text-gray-900 line-clamp-2">{item.productTitle}</p>
                  {item.variantTitle && item.variantTitle !== item.productTitle ? (
                    <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">{item.variantTitle}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-gray-500">Cantidad: {item.quantity}</p>
                  {dropiOrderId != null ? (
                    <p className="mt-1 font-mono text-xs text-sky-900">Dropi #{dropiOrderId}</p>
                  ) : null}
                  {live?.dropiSupplierId != null ? (
                    <div className="mt-2">
                      <SupportCaseDropiProviderLinks
                        dropiOrderItems={[live]}
                        variant="inline"
                      />
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${dropiStatusBadgeClass(item.dropiStatus)}`}
                      title="Estado Dropi en Tanku al momento del reporte"
                    >
                      Al reportar: {formatDropiStatus(item.dropiStatus)}
                    </span>
                    {liveStatus != null ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${dropiStatusBadgeClass(liveStatus)}`}
                        title="Estado actual guardado en order_items (webhook Dropi o refresh)"
                      >
                        En Tanku (BD): {formatDropiStatus(liveStatus)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {dropiOrderId != null ? (
                  <DropiLineActions
                    dropiOrderId={dropiOrderId}
                    onConsult={() => openDropiPreview(item.id, label)}
                    consultLoading={loading && modalOpen && activeOrderItemId === item.id}
                  />
                ) : null}
              </article>
            )
          })}
        </div>
      </div>

      <DropiPreviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={loading}
        error={error}
        data={previewData}
        productLabel={previewProductLabel}
        cacheHint={
          activeOrderItemId ? formatCacheHint(detail.id, activeOrderItemId) : null
        }
        onRefresh={refreshDropiPreview}
      />
    </>
  )
}
