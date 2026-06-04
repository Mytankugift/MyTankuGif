'use client'

import { SupportCaseStatusStepper } from '@/components/support-cases/SupportCaseStatusStepper'
import { SupportCaseOrderLines } from '@/components/support-cases/SupportCaseOrderLines'
import { SupportCaseTimeline } from '@/components/support-cases/SupportCaseTimeline'
import { SupportCaseAttachmentsGallery } from '@/components/support-cases/SupportCaseAttachmentsGallery'
import { SupportCaseActionsPanel } from '@/components/support-cases/SupportCaseActionsPanel'
import {
  CASE_TYPE_LABELS,
  CASE_STATUS_LABELS,
  statusBadgeClass,
  supportCaseHasPublicReply,
  type SupportCaseDetail,
} from '@/lib/types/support-cases'
import { formatSupportCasePayment } from '@/lib/support-case-payment'
import { SupportCaseDropiProviderLinks } from '@/components/support-cases/SupportCaseDropiProviderLinks'
import { SupportCaseShippingCarrierLinks } from '@/components/support-cases/SupportCaseShippingCarrierLinks'
import { getSupportCaseClosedAt } from '@/lib/support-case-dates'

interface SupportCaseDetailPanelProps {
  detail: SupportCaseDetail | null
  loading: boolean
  error: string | null
  onDetailUpdated?: (detail: SupportCaseDetail) => void
}

export function SupportCaseDetailPanel({
  detail,
  loading,
  error,
  onDetailUpdated,
}: SupportCaseDetailPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50/80 p-8 text-center">
        <p className="text-sm font-medium text-gray-700">Selecciona un caso del historial</p>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          El detalle, evidencias y timeline aparecerán aquí.
        </p>
      </div>
    )
  }

  const { snapshot } = detail
  const openedAt = snapshot.reportedAt || detail.createdAt
  const showBothDates =
    Math.abs(
      new Date(snapshot.reportedAt).getTime() - new Date(detail.createdAt).getTime()
    ) > 60_000
  const closedAt = getSupportCaseClosedAt(detail)
  const hasPublicReply = supportCaseHasPublicReply(detail.events)
  const showNoReplyHint =
    !hasPublicReply &&
    detail.status !== 'CLOSED' &&
    detail.status !== 'RESOLVED' &&
    detail.status !== 'OPEN'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50/50">
      <div className="shrink-0 flex min-w-0 justify-end overflow-hidden border-b border-gray-100 bg-white px-4 py-2 sm:px-6">
        <SupportCaseStatusStepper status={detail.status} className="w-full min-w-0" />
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              {detail.ref ? (
                <p className="font-mono text-sm font-semibold text-teal-700">{detail.ref}</p>
              ) : null}
              <div className={`flex flex-wrap items-center gap-2 ${detail.ref ? 'mt-2' : ''}`}>
                <p className="text-sm font-medium text-gray-600">
                  {CASE_TYPE_LABELS[detail.caseType]}
                </p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(detail.status)}`}
                >
                  {CASE_STATUS_LABELS[detail.status]}
                </span>
                {showNoReplyHint ? (
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                    Sin respuesta al cliente
                  </span>
                ) : null}
              </div>
            </div>
            {onDetailUpdated ? (
              <SupportCaseActionsPanel
                detail={detail}
                onUpdated={onDetailUpdated}
                section="header"
              />
            ) : null}
          </div>

          <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
              Relato del cliente
            </p>
            <p className="mt-2 text-base text-gray-900 whitespace-pre-wrap leading-relaxed">
              {detail.description}
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-gray-500">Usuario</dt>
              <dd className="mt-1 text-sm text-gray-900 break-all">{detail.userEmail}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Pedido</dt>
              <dd className="mt-1 text-sm font-mono text-gray-900 break-all">
                {detail.orderRef ?? snapshot.orderRef ?? detail.orderId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Abierto</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(openedAt).toLocaleString('es-CO')}
              </dd>
              {showBothDates ? (
                <dd className="mt-0.5 text-xs text-gray-500">
                  Registro sistema:{' '}
                  {new Date(detail.createdAt).toLocaleString('es-CO')}
                </dd>
              ) : null}
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Contacto</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {snapshot.contactPhone ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Proveedores Dropi</dt>
              <dd className="mt-1">
                <SupportCaseDropiProviderLinks
                  dropiOrderItems={detail.dropiOrderItems ?? []}
                  variant="summary"
                />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Cerrado</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {closedAt ? new Date(closedAt).toLocaleString('es-CO') : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Envío</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {snapshot.address ? (
                  <>
                    {snapshot.address.firstName} {snapshot.address.lastName}
                    <span className="text-gray-600">
                      {' '}
                      · {snapshot.address.city}, {snapshot.address.state}
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Pago</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatSupportCasePayment(snapshot.paymentMethod, snapshot.paymentStatus)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Transportadoras</dt>
              <dd className="mt-1">
                <SupportCaseShippingCarrierLinks
                  dropiOrderItems={detail.dropiOrderItems ?? []}
                  variant="summary"
                />
              </dd>
            </div>
          </dl>
        </div>

        {onDetailUpdated ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <SupportCaseActionsPanel
                detail={detail}
                onUpdated={onDetailUpdated}
                section="response"
              />
            </div>
            <SupportCaseAttachmentsGallery
              attachments={detail.attachments ?? []}
              evidenceNotice={detail.evidenceNotice ?? null}
              variant="compact"
            />
          </div>
        ) : (
          <SupportCaseAttachmentsGallery
            attachments={detail.attachments ?? []}
            evidenceNotice={detail.evidenceNotice ?? null}
          />
        )}

        <SupportCaseOrderLines detail={detail} />

        {onDetailUpdated ? (
          <div className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
            <SupportCaseActionsPanel detail={detail} onUpdated={onDetailUpdated} section="note" />
          </div>
        ) : null}

        <SupportCaseTimeline events={detail.events} />
      </div>
    </div>
  )
}
