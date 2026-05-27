'use client'

import type { SupportCaseDetail } from '@/lib/types/support-cases'
import { CASE_TYPE_LABELS } from '@/lib/types/support-cases'
import { DropiOrderActions } from '@/components/support-cases/DropiOrderActions'

function formatPayment(method: string | null, status: string) {
  if (method === 'cash_on_delivery') {
    return status === 'paid' || status === 'completed' ? 'Contra entrega · pagado' : 'Contra entrega'
  }
  if (method === 'epayco') return 'En línea (ePayco)'
  return method?.replace(/_/g, ' ') ?? '—'
}

function shipStatusClass(status: string | null) {
  if (!status) return 'bg-gray-100 text-gray-600'
  const u = status.toUpperCase()
  if (u === 'DELIVERED') return 'bg-green-100 text-green-800'
  if (u === 'CANCELLED' || u === 'REJECTED') return 'bg-red-100 text-red-800'
  if (u === 'SHIPPED' || u === 'GUIA_GENERADA') return 'bg-purple-100 text-purple-800'
  return 'bg-amber-100 text-amber-800'
}

interface SupportCaseSnapshotViewProps {
  detail: SupportCaseDetail
}

export function SupportCaseSnapshotView({ detail }: SupportCaseSnapshotViewProps) {
  const { snapshot } = detail
  const focusedId = detail.orderItemId ?? snapshot.focusedOrderItemId
  const focusedItem = focusedId ? snapshot.items.find((i) => i.id === focusedId) : null
  const dropiItem =
    focusedItem?.dropiOrderId != null
      ? focusedItem
      : snapshot.items.find((i) => i.dropiOrderId != null) ?? null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Contexto al reportar</h2>
      <p className="text-sm text-gray-500 mb-5">
        Datos capturados el{' '}
        {new Date(snapshot.reportedAt).toLocaleString('es-CO', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Pedido Tanku</p>
          <p className="mt-1 font-mono text-sm text-gray-900 break-all">{snapshot.orderId}</p>
          <p className="mt-2 text-sm text-gray-600">{formatPayment(snapshot.paymentMethod, snapshot.paymentStatus)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Tipo de caso</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {CASE_TYPE_LABELS[detail.caseType]}
          </p>
        </div>
        {snapshot.address ? (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Envío</p>
            <p className="mt-1 text-sm text-gray-900">
              {snapshot.address.firstName} {snapshot.address.lastName}
            </p>
            <p className="text-sm text-gray-600">
              {snapshot.address.city}, {snapshot.address.state}
            </p>
            <p className="text-sm text-gray-600">{snapshot.address.phone}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Envío</p>
            <p className="mt-1 text-sm text-gray-500">Sin dirección en snapshot</p>
          </div>
        )}
      </div>

      <p className="text-xs font-medium uppercase text-gray-500 mb-3">Productos</p>
      <div className="space-y-3">
        {snapshot.items.map((item) => {
          const isFocused = focusedId === item.id
          return (
            <div
              key={item.id}
              className={`rounded-lg border p-4 ${
                isFocused ? 'border-blue-400 bg-blue-50/60 ring-1 ring-blue-200' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {isFocused && (
                    <span className="mb-2 inline-block rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Producto reportado
                    </span>
                  )}
                  <p className="font-medium text-gray-900">{item.productTitle}</p>
                  {item.variantTitle && item.variantTitle !== item.productTitle && (
                    <p className="text-sm text-gray-600">{item.variantTitle}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">Cantidad: {item.quantity}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${shipStatusClass(item.dropiStatus)}`}
                >
                  {item.dropiStatus?.replace(/_/g, ' ') ?? 'Sin estado envío'}
                </span>
              </div>

              {item.dropiOrderId != null && !isFocused && dropiItem?.id !== item.id && (
                <p className="mt-2 text-xs text-gray-500 font-mono">Dropi #{item.dropiOrderId}</p>
              )}

              {dropiItem?.id === item.id && item.dropiOrderId != null && (
                <div className="mt-4 border-t border-blue-200/80 pt-4">
                  <p className="text-sm font-medium text-gray-900">
                    Orden Dropi{' '}
                    <span className="font-mono text-[#0092c6]">#{item.dropiOrderId}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-600 mb-2">
                    Pega el ID en Buscar en Dropi y confirma con la lupa.
                  </p>
                  <DropiOrderActions dropiOrderId={item.dropiOrderId} compact />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <details className="mt-4 group">
        <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700">
          Ver datos técnicos (JSON)
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-300">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </details>
    </div>
  )
}
