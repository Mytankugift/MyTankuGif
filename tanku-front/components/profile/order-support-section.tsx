'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { NOTIFICATION_ROW_DIVIDER_STYLE } from '@/lib/notifications-display'
import type {
  CreateSupportCaseDTO,
  OrderDTO,
  SupportCaseDetailDTO,
  SupportCaseDTO,
  SupportCaseType,
} from '@/types/api'
import { LifebuoyIcon, XMarkIcon } from '@heroicons/react/24/outline'

const ORDER_SURFACE_CLASS =
  'rounded-xl border border-[#414141] shadow-xl bg-[#171B21]'

const CASE_TYPE_OPTIONS: { value: SupportCaseType; label: string }[] = [
  { value: 'NOT_RECEIVED', label: 'No recibí el producto' },
  { value: 'DAMAGED', label: 'Llegó dañado' },
  { value: 'DELAY', label: 'Demora en el envío' },
  { value: 'WRONG_ITEM', label: 'Producto incorrecto' },
  { value: 'OTHER', label: 'Otro' },
]

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  IN_REVIEW: 'En revisión',
  WAITING_USER: 'Esperando tu respuesta',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

interface OrderSupportSectionProps {
  order: OrderDTO
}

export function OrderSupportSection({ order }: OrderSupportSectionProps) {
  const [orderCases, setOrderCases] = useState<SupportCaseDTO[]>([])
  const [loadingCases, setLoadingCases] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewDetail, setViewDetail] = useState<SupportCaseDetailDTO | null>(null)
  const [createdCase, setCreatedCase] = useState<SupportCaseDetailDTO | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [caseType, setCaseType] = useState<SupportCaseType>('NOT_RECEIVED')
  const [description, setDescription] = useState('')
  const [orderItemId, setOrderItemId] = useState<string>(
    order.items.length === 1 ? order.items[0].id : ''
  )

  const loadOrderCases = useCallback(async () => {
    setLoadingCases(true)
    try {
      const response = await apiClient.get<SupportCaseDTO[]>(
        `${API_ENDPOINTS.SUPPORT_CASES.LIST}?orderId=${encodeURIComponent(order.id)}`
      )
      if (response.success && Array.isArray(response.data)) {
        setOrderCases(response.data)
      } else {
        setOrderCases([])
      }
    } catch {
      setOrderCases([])
    } finally {
      setLoadingCases(false)
    }
  }, [order.id])

  useEffect(() => {
    loadOrderCases()
  }, [loadOrderCases])

  const openReport = () => {
    setError(null)
    setCreatedCase(null)
    setCaseType('NOT_RECEIVED')
    setDescription('')
    setOrderItemId(order.items.length === 1 ? order.items[0].id : '')
    setShowReportModal(true)
  }

  const handleSubmitReport = async () => {
    setError(null)
    if (description.trim().length < 10) {
      setError('Describe el problema con al menos 10 caracteres')
      return
    }

    const payload: CreateSupportCaseDTO = {
      orderId: order.id,
      caseType,
      description: description.trim(),
      ...(orderItemId ? { orderItemId } : { orderItemId: null }),
    }

    setSubmitting(true)
    try {
      const response = await apiClient.post<SupportCaseDetailDTO>(
        API_ENDPOINTS.SUPPORT_CASES.CREATE,
        payload
      )
      if (response.success && response.data) {
        setCreatedCase(response.data)
        await loadOrderCases()
      } else {
        setError('No se pudo crear la solicitud')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Error al enviar la solicitud'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewCase = async (caseId: string) => {
    setError(null)
    setViewDetail(null)
    setShowViewModal(true)
    try {
      const response = await apiClient.get<SupportCaseDetailDTO>(
        API_ENDPOINTS.SUPPORT_CASES.BY_ID(caseId)
      )
      if (response.success && response.data) {
        setViewDetail(response.data)
      }
    } catch {
      setError('No se pudo cargar el detalle de la solicitud')
      setShowViewModal(false)
    }
  }

  const latestCase = orderCases[0]

  return (
    <>
      <div
        className="rounded-lg border border-[#414141]/90 bg-black/20 p-3"
        style={NOTIFICATION_ROW_DIVIDER_STYLE}
      >
        <div className="flex items-center gap-2 mb-3">
          <LifebuoyIcon className="h-5 w-5 text-[#66DEDB]" />
          <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500">Soporte</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openReport}
            className="rounded-lg border border-[#66DEDB]/40 bg-[#66DEDB]/10 px-3 py-2 text-sm font-medium text-[#73FFA2] hover:bg-[#66DEDB]/20"
          >
            Reportar problema
          </button>
          {latestCase && (
            <button
              type="button"
              onClick={() => handleViewCase(latestCase.id)}
              disabled={loadingCases}
              className="rounded-lg border border-[#414141] px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/[0.06] disabled:opacity-50"
            >
              Ver solicitud{orderCases.length > 1 ? ` (${orderCases.length})` : ''}
            </button>
          )}
        </div>
        {latestCase && (
          <p className="mt-2 text-[11px] text-gray-500">
            Última solicitud: #{latestCase.id.slice(-8).toUpperCase()} ·{' '}
            {STATUS_LABELS[latestCase.status] ?? latestCase.status}
          </p>
        )}
      </div>

      {showReportModal && (
        <div
          className="fixed inset-0 z-[1000040] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !submitting && setShowReportModal(false)}
        >
          <div
            className={`w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden ${ORDER_SURFACE_CLASS}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={NOTIFICATION_ROW_DIVIDER_STYLE}
            >
              <h3 className="text-sm font-semibold text-white">Reportar problema</h3>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Cerrar"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-4">
              {createdCase ? (
                <div className="space-y-3 text-sm">
                  <p className="text-[#73FFA2] font-medium">Solicitud registrada correctamente</p>
                  <dl className="space-y-2 text-gray-300">
                    <div>
                      <dt className="text-xs text-gray-500">ID caso</dt>
                      <dd className="font-mono text-white">{createdCase.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Estado</dt>
                      <dd>{STATUS_LABELS[createdCase.status] ?? createdCase.status}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Pedido</dt>
                      <dd className="font-mono">{createdCase.orderId}</dd>
                    </div>
                    {createdCase.orderItemId && (
                      <div>
                        <dt className="text-xs text-gray-500">Ítem</dt>
                        <dd className="font-mono text-xs break-all">{createdCase.orderItemId}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="rounded-lg border border-[#414141]/80 bg-black/30 p-3">
                    <p className="text-[10px] uppercase text-gray-500 mb-2">Snapshot enviado</p>
                    <ul className="space-y-2">
                      {createdCase.snapshot.items.map((item) => (
                        <li key={item.id} className="text-xs text-gray-400">
                          <span className="text-gray-200">{item.productTitle}</span>
                          <br />
                          Dropi #{item.dropiOrderId ?? '—'} · {item.dropiStatus ?? 'sin estado'}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportModal(false)
                      handleViewCase(createdCase.id)
                    }}
                    className="w-full rounded-lg bg-[#66DEDB]/20 py-2 text-sm text-[#73FFA2]"
                  >
                    Ver detalle completo
                  </button>
                </div>
              ) : (
                <>
                  {order.items.length > 1 && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Producto afectado</label>
                      <select
                        value={orderItemId}
                        onChange={(e) => setOrderItemId(e.target.value)}
                        className="w-full rounded-lg border border-[#414141] bg-black/30 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Todo el pedido</option>
                        {order.items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.product.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tipo de problema</label>
                    <select
                      value={caseType}
                      onChange={(e) => setCaseType(e.target.value as SupportCaseType)}
                      className="w-full rounded-lg border border-[#414141] bg-black/30 px-3 py-2 text-sm text-white"
                    >
                      {CASE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Descripción</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Cuéntanos qué ocurrió..."
                      className="w-full rounded-lg border border-[#414141] bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-600"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitReport}
                    className="w-full rounded-lg bg-[#66DEDB] py-2.5 text-sm font-semibold text-[#171B21] hover:bg-[#73FFA2] disabled:opacity-50"
                  >
                    {submitting ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showViewModal && (
        <div
          className="fixed inset-0 z-[1000040] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className={`w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden ${ORDER_SURFACE_CLASS}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={NOTIFICATION_ROW_DIVIDER_STYLE}
            >
              <h3 className="text-sm font-semibold text-white">Mi solicitud</h3>
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
              {!viewDetail ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#73FFA2]" />
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <dl className="space-y-2 text-gray-300">
                    <div>
                      <dt className="text-xs text-gray-500">ID</dt>
                      <dd className="font-mono text-white break-all">{viewDetail.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Estado</dt>
                      <dd>{STATUS_LABELS[viewDetail.status] ?? viewDetail.status}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Descripción</dt>
                      <dd className="text-gray-200">{viewDetail.description}</dd>
                    </div>
                  </dl>
                  {orderCases.length > 1 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Otras solicitudes de este pedido</p>
                      <div className="flex flex-wrap gap-2">
                        {orderCases.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleViewCase(c.id)}
                            className={`rounded px-2 py-1 text-xs font-mono ${
                              c.id === viewDetail.id
                                ? 'bg-[#66DEDB]/20 text-[#73FFA2]'
                                : 'bg-black/40 text-gray-400 hover:text-white'
                            }`}
                          >
                            #{c.id.slice(-8).toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 mb-2">Timeline</p>
                    <ul className="space-y-2">
                      {viewDetail.events.map((ev) => (
                        <li
                          key={ev.id}
                          className="rounded border border-[#414141]/60 bg-black/20 px-3 py-2 text-xs"
                        >
                          <span className="text-[#66DEDB]">{ev.kind}</span>
                          <span className="text-gray-500 ml-2">
                            {new Date(ev.createdAt).toLocaleString('es-CO')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
