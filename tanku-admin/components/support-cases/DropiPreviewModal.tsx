'use client'

import { XMarkIcon, ArrowPathIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { dropiProviderDashboardUrl } from '@/lib/admin/dropi-dashboard'
import { formatDropiStatus } from '@/lib/dropi-status'
import type { SupportCaseDropiPreview } from '@/lib/types/support-cases'
import {
  getDropiFullData,
  getDropiHistorySorted,
  getDropiProductName,
  getDropiSupplierId,
  getDropiSupplierLabel,
  getDropiWarehouseLabel,
  parseTankuOrderIdFromDropiNotes,
} from '@/lib/dropi-preview-parse'
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock'

interface DropiPreviewModalProps {
  open: boolean
  onClose: () => void
  loading: boolean
  error: string | null
  data: SupportCaseDropiPreview | null
  productLabel?: string
  cacheHint?: string | null
  onRefresh?: () => void
}

export function DropiPreviewModal({
  open,
  onClose,
  loading,
  error,
  data,
  productLabel,
  cacheHint,
  onRefresh,
}: DropiPreviewModalProps) {
  useBodyScrollLock(open)

  if (!open) return null

  const preview = data?.preview
  const fullData = getDropiFullData(preview)
  const statusRaw =
    (typeof preview?.status === 'string' ? preview.status : null) ??
    (typeof fullData?.status === 'string' ? fullData.status : null)
  const status = statusRaw ? formatDropiStatus(statusRaw) : null

  const history = fullData ? getDropiHistorySorted(fullData) : []
  const dropiProductName = fullData ? getDropiProductName(fullData) : null
  const supplierLabel = fullData ? getDropiSupplierLabel(fullData) : null
  const supplierId =
    data?.dropiSupplierId ??
    (fullData ? getDropiSupplierId(fullData) : null) ??
    (preview && typeof preview === 'object' && !Array.isArray(preview)
      ? getDropiSupplierId(preview as Record<string, unknown>)
      : null)
  const warehouseLabel = fullData ? getDropiWarehouseLabel(fullData) : null
  const dropiNotes = fullData?.notes
  const tankuOrderFromNotes = parseTankuOrderIdFromDropiNotes(dropiNotes)

  const shippingCompany =
    (typeof preview?.shipping_company === 'string' ? preview.shipping_company : null) ??
    (typeof fullData?.shipping_company === 'string' ? fullData.shipping_company : null)

  const shippingGuide =
    (typeof preview?.shipping_guide === 'string' ? preview.shipping_guide : null) ??
    (typeof fullData?.shipping_guide === 'string' ? fullData.shipping_guide : null)

  const recipientName = fullData
    ? [fullData.name, fullData.surname].filter((v) => typeof v === 'string').join(' ')
    : [preview?.name ?? preview?.client_name, preview?.surname ?? preview?.client_surname]
        .filter(Boolean)
        .join(' ')

  const city =
    (typeof preview?.city === 'string' ? preview.city : null) ??
    (typeof fullData?.city === 'string' ? fullData.city : null)
  const state =
    (typeof preview?.state === 'string' ? preview.state : null) ??
    (typeof fullData?.state === 'string' ? fullData.state : null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dropi-preview-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90vh,40rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="dropi-preview-title" className="text-lg font-semibold text-gray-900">
              Estado en Dropi
            </h2>
            {data ? (
              <p className="mt-1 text-sm text-gray-600">
                Orden Dropi{' '}
                <span className="font-mono font-medium text-sky-800">#{data.dropiOrderId}</span>
                {productLabel ? ` · ${productLabel}` : ''}
              </p>
            ) : null}
            {cacheHint ? (
              <p className="mt-1 text-xs text-gray-500">{cacheHint}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onRefresh ? (
              <button
                type="button"
                disabled={loading}
                onClick={onRefresh}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
                aria-label="Actualizar desde Dropi"
                title="Actualizar desde Dropi"
              >
                <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {loading && !preview ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
            </div>
          ) : error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : preview ? (
            <div className="space-y-4">
              {status ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase text-gray-500">Estado actual</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{status}</p>
                </div>
              ) : null}

              {history.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500 mb-3">
                    Historial en Dropi
                  </p>
                  <ol className="relative ml-2 space-y-4 border-l-2 border-sky-200 pl-6">
                    {history.map((entry, i) => (
                      <li key={i} className="relative">
                        <span className="absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-sky-500" />
                        {entry.created_at ? (
                          <time className="text-xs text-gray-500">
                            {new Date(entry.created_at).toLocaleString('es-CO')}
                          </time>
                        ) : null}
                        {entry.status ? (
                          <p className="text-sm font-medium text-gray-900">
                            {formatDropiStatus(entry.status)}
                          </p>
                        ) : null}
                        {entry.notes ? (
                          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                            {entry.notes}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {dropiProductName ? (
                <div>
                  <p className="text-xs text-gray-500">Producto en Dropi</p>
                  <p className="text-sm font-medium text-gray-900">{dropiProductName}</p>
                </div>
              ) : null}

              {supplierLabel || warehouseLabel ? (
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {supplierLabel ? (
                    <div>
                      <dt className="text-xs text-gray-500">Proveedor</dt>
                      <dd className="text-sm text-gray-900">{supplierLabel}</dd>
                      {supplierId != null ? (
                        <dd className="mt-1.5">
                          <a
                            href={dropiProviderDashboardUrl(supplierId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100"
                          >
                            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                            Abrir proveedor en Dropi
                          </a>
                        </dd>
                      ) : null}
                    </div>
                  ) : null}
                  {warehouseLabel ? (
                    <div>
                      <dt className="text-xs text-gray-500">Bodega origen</dt>
                      <dd className="text-sm text-gray-900">{warehouseLabel}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {typeof dropiNotes === 'string' && dropiNotes.trim() ? (
                <div>
                  <p className="text-xs text-gray-500">Notas de la orden</p>
                  <p className="text-sm text-gray-800">{dropiNotes}</p>
                  {tankuOrderFromNotes ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Pedido Tanku referenciado:{' '}
                      <span className="font-mono text-gray-700">{tankuOrderFromNotes}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {shippingCompany ? (
                  <div>
                    <dt className="text-xs text-gray-500">Transportadora</dt>
                    <dd className="text-sm text-gray-900">{shippingCompany}</dd>
                  </div>
                ) : null}
                {shippingGuide ? (
                  <div>
                    <dt className="text-xs text-gray-500">Guía</dt>
                    <dd className="text-sm font-mono text-gray-900">{shippingGuide}</dd>
                  </div>
                ) : null}
                {recipientName ? (
                  <div>
                    <dt className="text-xs text-gray-500">Destinatario</dt>
                    <dd className="text-sm text-gray-900">{recipientName}</dd>
                  </div>
                ) : null}
                {city ? (
                  <div>
                    <dt className="text-xs text-gray-500">Ciudad</dt>
                    <dd className="text-sm text-gray-900">
                      {city}
                      {state ? `, ${state}` : ''}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700">
                  Ver respuesta completa (JSON)
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto overscroll-contain rounded-md bg-gray-900 p-3 text-[11px] text-gray-300">
                  {JSON.stringify(fullData ?? preview, null, 2)}
                </pre>
              </details>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-gray-200 px-5 py-3 flex justify-end gap-2">
          {onRefresh ? (
            <button
              type="button"
              disabled={loading}
              onClick={onRefresh}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Actualizar desde Dropi
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
