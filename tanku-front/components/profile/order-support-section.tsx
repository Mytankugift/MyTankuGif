'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { NOTIFICATION_ROW_DIVIDER_STYLE } from '@/lib/notifications-display'
import { ReportSupportProblemModal } from '@/components/profile/report-support-problem-modal'
import { ProfileTabletOverlayModal } from '@/components/profile/profile-tablet-overlay-modal'
import { SupportCaseEvidenceModal } from '@/components/profile/support-case-evidence-modal'
import { displayCaseRef } from '@/lib/utils/entity-ref-display'
import { formatSupportCaseType } from '@/lib/support-case-type-labels'
import {
  eventsForUserTimeline,
  latestUserTimelineMessageId,
  renderSupportCaseEventBody,
  supportCaseEventTitle,
  TIMELINE_ROLE_LABELS,
  timelineMessageRole,
} from '@/lib/support-case-display'
import { dropiStatusChipClass, formatDropiStatus } from '@/lib/dropi-status'
import type { OrderDTO, SupportCaseDetailDTO, SupportCaseDTO } from '@/types/api'
import { formatColombiaPhoneDisplay, maskColombiaPhone } from '@/lib/utils/colombia-phone'
import {
  ChevronDownIcon,
  LifebuoyIcon,
  XMarkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import { tankuModalBtnClass } from '@/lib/ui/tanku-modal-buttons'

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Pendiente',
  IN_REVIEW: 'En revisión',
  WAITING_USER: 'En revisión',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

interface OrderSupportSectionProps {
  order: OrderDTO
  /** `footer`: barra fija discreta en el modal de detalle del pedido. */
  variant?: 'card' | 'footer'
  /** Deep link desde notificación: abre «Mi solicitud» al cargar casos. */
  initialOpenSupportCaseId?: string | null
  onSupportDeepLinkConsumed?: () => void
}

export function OrderSupportSection({
  order,
  variant = 'card',
  initialOpenSupportCaseId = null,
  onSupportDeepLinkConsumed,
}: OrderSupportSectionProps) {
  const [orderCases, setOrderCases] = useState<SupportCaseDTO[]>([])
  const [loadingCases, setLoadingCases] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewDetail, setViewDetail] = useState<SupportCaseDetailDTO | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [evidenceIndex, setEvidenceIndex] = useState(0)
  const [showCaseDetails, setShowCaseDetails] = useState(false)

  const orderItemById = new Map((order.items ?? []).map((i) => [i.id, i]))

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

  const deepLinkOpenedRef = useRef(false)

  useEffect(() => {
    deepLinkOpenedRef.current = false
  }, [initialOpenSupportCaseId])

  const handleViewCase = useCallback(async (caseId: string) => {
    setViewDetail(null)
    setReplyText('')
    setReplyError(null)
    setShowCaseDetails(false)
    setShowViewModal(true)
    try {
      const response = await apiClient.get<SupportCaseDetailDTO>(
        API_ENDPOINTS.SUPPORT_CASES.BY_ID(caseId)
      )
      if (response.success && response.data) {
        setViewDetail(response.data)
      }
    } catch {
      setShowViewModal(false)
    }
  }, [])

  useEffect(() => {
    if (deepLinkOpenedRef.current || !initialOpenSupportCaseId) return
    deepLinkOpenedRef.current = true
    void handleViewCase(initialOpenSupportCaseId)
    onSupportDeepLinkConsumed?.()
  }, [initialOpenSupportCaseId, onSupportDeepLinkConsumed, handleViewCase])

  const handleReportSuccess = async (created: SupportCaseDetailDTO) => {
    await loadOrderCases()
    handleViewCase(created.id)
  }

  const handleUserReply = async () => {
    if (!viewDetail) return
    const message = replyText.trim()
    if (message.length < 3) return
    setReplyBusy(true)
    setReplyError(null)
    try {
      const response = await apiClient.post<SupportCaseDetailDTO>(
        API_ENDPOINTS.SUPPORT_CASES.REPLY(viewDetail.id),
        { message }
      )
      if (response.success && response.data) {
        setViewDetail(response.data)
        setReplyText('')
        await loadOrderCases()
      }
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'No se pudo enviar la respuesta')
    } finally {
      setReplyBusy(false)
    }
  }

  const latestCase = orderCases[0]
  const attachments = viewDetail?.attachments ?? []
  const evidenceNotice = viewDetail?.evidenceNotice ?? null
  const isFooter = variant === 'footer'

  const reportButton = (
    <button
      type="button"
      onClick={() => setShowReportModal(true)}
      className={tankuModalBtnClass('primary', 'compact')}
    >
      {isFooter ? 'Tengo un problema' : 'Reportar problema'}
    </button>
  )

  const viewCaseButton =
    latestCase ? (
      <button
        type="button"
        onClick={() => handleViewCase(latestCase.id)}
        disabled={loadingCases}
        className={tankuModalBtnClass('accent', 'compact')}
      >
        Ver solicitud{orderCases.length > 1 ? ` (${orderCases.length})` : ''}
      </button>
    ) : null

  return (
    <>
      {isFooter ? (
        <footer
          className="shrink-0 border-t border-[#414141]/90 bg-[#14181c]/95 px-4 py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
          style={NOTIFICATION_ROW_DIVIDER_STYLE}
        >
          <div className="flex flex-row items-center justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-[10px] leading-snug text-gray-600">
              {latestCase ? (
                <>
                  <span className="text-gray-500">Soporte · </span>
                  {displayCaseRef(latestCase)} ·{' '}
                  {STATUS_LABELS[latestCase.status] ?? latestCase.status}
                </>
              ) : (
                '¿Problemas con tu pedido?'
              )}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {viewCaseButton}
              {reportButton}
            </div>
          </div>
        </footer>
      ) : (
        <div
          className="rounded-lg border border-[#414141]/90 bg-black/20 p-3"
          style={NOTIFICATION_ROW_DIVIDER_STYLE}
        >
          <div className="mb-3 flex items-center gap-2">
            <LifebuoyIcon className="h-5 w-5 text-[#66DEDB]" />
            <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500">Soporte</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {reportButton}
            {viewCaseButton}
          </div>
          {latestCase && (
            <p className="mt-2 text-[11px] text-gray-500">
              Última solicitud: {displayCaseRef(latestCase)} ·{' '}
              {STATUS_LABELS[latestCase.status] ?? latestCase.status}
            </p>
          )}
        </div>
      )}

      <ReportSupportProblemModal
        order={order}
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSuccess={handleReportSuccess}
      />

      <ProfileTabletOverlayModal
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        titleId="support-case-view-title"
        mobileLayout="dialog"
        mobileBackdrop="blur"
        maxWidthClass="max-w-md"
        panelHeightClass="h-auto max-md:max-h-[min(46rem,93dvh)] md:max-h-[min(36rem,85vh)]"
        panelClassName="flex flex-col min-h-0"
      >
        <div
          className="flex shrink-0 flex-col gap-1 border-b px-4 py-3"
          style={NOTIFICATION_ROW_DIVIDER_STYLE}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Mi solicitud</p>
              {viewDetail ? (
                <>
                  <h3
                    id="support-case-view-title"
                    className="font-mono text-sm font-semibold text-[#73FFA2] break-all"
                  >
                    {viewDetail.ref ?? displayCaseRef(viewDetail)}
                  </h3>
                  <span className="mt-1 inline-flex rounded-full border border-[#66DEDB]/40 bg-[#66DEDB]/10 px-2 py-0.5 text-[11px] font-medium text-[#66DEDB]">
                    {STATUS_LABELS[viewDetail.status] ?? viewDetail.status}
                  </span>
                </>
              ) : (
                <h3 id="support-case-view-title" className="text-sm font-semibold text-white">
                  Cargando…
                </h3>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowViewModal(false)}
              className="shrink-0 text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {viewDetail?.status === 'WAITING_USER' ? (
          <div
            className="shrink-0 space-y-2 border-b px-4 py-3"
            style={NOTIFICATION_ROW_DIVIDER_STYLE}
          >
            <p className="text-xs text-amber-200">
              Soporte necesita más información. Responde aquí:
            </p>
            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full rounded-md border border-[#414141] bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="Escribe tu respuesta…"
            />
            {replyError ? <p className="text-xs text-red-400">{replyError}</p> : null}
            <div className="flex justify-center pt-0.5">
              <button
                type="button"
                disabled={replyBusy || replyText.trim().length < 3}
                onClick={handleUserReply}
                className={tankuModalBtnClass('primary', 'compact', 'min-w-[9.5rem] px-5')}
              >
                {replyBusy ? 'Enviando…' : 'Enviar respuesta'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {!viewDetail ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#73FFA2]" />
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <button
                type="button"
                onClick={() => setShowCaseDetails((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#414141] bg-black/30 px-3 py-2.5 text-left text-sm font-medium text-gray-200 hover:bg-white/[0.04]"
                aria-expanded={showCaseDetails}
              >
                <span>Detalle del reporte</span>
                <ChevronDownIcon
                  className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                    showCaseDetails ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showCaseDetails ? (
                <div className="space-y-3 rounded-lg border border-[#414141]/80 bg-black/20 p-3">
                  <p className="text-[11px] text-gray-500">
                    Motivo:{' '}
                    <span className="text-gray-300">
                      {formatSupportCaseType(viewDetail.caseType)}
                    </span>
                  </p>

                  {viewDetail.snapshot.contactPhone ? (
                    <p className="text-xs text-gray-500">
                      Contacto:{' '}
                      <span
                        className="text-gray-300"
                        title={formatColombiaPhoneDisplay(viewDetail.snapshot.contactPhone)}
                      >
                        {maskColombiaPhone(viewDetail.snapshot.contactPhone)}
                      </span>
                    </p>
                  ) : null}

                  {viewDetail.snapshot.items?.length > 0 ? (
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 mb-2">
                        Productos del pedido
                      </p>
                      <ul className="space-y-2">
                        {viewDetail.snapshot.items.map((item) => {
                          const live = orderItemById.get(item.id)
                          const imageUrl = item.productImageUrl ?? null
                          const liveDropi = live?.dropiStatus ?? null
                          const isFocused =
                            viewDetail.orderItemId === item.id ||
                            viewDetail.snapshot.focusedOrderItemId === item.id
                          return (
                            <li
                              key={item.id}
                              className={`flex gap-3 rounded-lg border p-2 ${
                                isFocused
                                  ? 'border-[#66DEDB]/50 bg-[#66DEDB]/5'
                                  : 'border-[#414141]/60 bg-black/20'
                              }`}
                            >
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-black/40">
                                {imageUrl ? (
                                  <Image
                                    src={imageUrl}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[10px] text-gray-600">
                                    —
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-200 line-clamp-2">
                                  {item.productTitle}
                                </p>
                                <p className="text-[10px] text-gray-500">Cant. {item.quantity}</p>
                                {item.dropiStatus || liveDropi ? (
                                  <span
                                    className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${dropiStatusChipClass(liveDropi ?? item.dropiStatus)}`}
                                  >
                                    {formatDropiStatus(liveDropi ?? item.dropiStatus)}
                                  </span>
                                ) : null}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {attachments.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEvidenceIndex(0)
                        setEvidenceOpen(true)
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#414141] bg-black/30 px-3 py-2 text-sm font-medium text-[#73FFA2] hover:bg-white/[0.06]"
                    >
                      <PhotoIcon className="h-5 w-5" />
                      Ver evidencias ({attachments.length})
                    </button>
                  ) : evidenceNotice ? (
                    <p className="rounded-lg border border-[#414141] bg-black/30 px-3 py-2 text-xs leading-relaxed text-gray-400">
                      Las evidencias se eliminaron tras{' '}
                      <span className="text-gray-300">{evidenceNotice.retentionDays} días</span>{' '}
                      por política de retención.
                    </p>
                  ) : null}
                </div>
              ) : null}

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
                        {displayCaseRef(c)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase text-gray-500 mb-3">Historial</p>
                <ol className="relative ml-1 space-y-0">
                  {(() => {
                    const timelineEvents = eventsForUserTimeline(viewDetail.events, {
                      caseId: viewDetail.id,
                      description: viewDetail.description,
                      createdAt: viewDetail.createdAt,
                    })
                    const latestMessageId = latestUserTimelineMessageId(viewDetail.events)
                    return timelineEvents.map((ev, idx) => {
                    const body = renderSupportCaseEventBody(ev)
                    const isOldest = idx === timelineEvents.length - 1
                    const isLatestMessage = ev.id === latestMessageId
                    const messageRole = timelineMessageRole(ev)
                    const roleLabel = messageRole ? TIMELINE_ROLE_LABELS[messageRole] : null
                    const isLatestUser = isLatestMessage && messageRole === 'user'
                    const isLatestSupport = isLatestMessage && messageRole === 'support'
                    const dotClass = isLatestUser
                      ? 'bg-[#66DEDB]'
                      : isLatestSupport
                        ? 'bg-[#73FFA2]'
                        : messageRole === 'user'
                          ? 'bg-[#66DEDB]'
                          : messageRole === 'support'
                            ? 'bg-[#73FFA2]/60'
                            : 'bg-gray-500'
                    const cardClass = isLatestUser
                      ? 'border-[#66DEDB]/50 bg-[#66DEDB]/10 shadow-[0_0_0_1px_rgba(102,222,219,0.12)] border-l-2 border-l-[#66DEDB]'
                      : isLatestSupport
                        ? 'border-[#73FFA2]/50 bg-[#73FFA2]/8 shadow-[0_0_0_1px_rgba(115,255,162,0.08)] border-l-2 border-l-[#73FFA2]'
                        : messageRole === 'user'
                          ? 'border-[#66DEDB]/25 bg-[#66DEDB]/5 border-l-2 border-l-[#66DEDB]'
                          : messageRole === 'support'
                            ? 'border-[#73FFA2]/20 bg-black/25 border-l-2 border-l-[#73FFA2]/45'
                            : 'border-[#414141]/60 bg-black/20'
                    const titleClass = isLatestUser
                      ? 'text-[#66DEDB]'
                      : isLatestSupport
                        ? 'text-[#73FFA2]'
                        : messageRole === 'user'
                          ? 'text-[#66DEDB]'
                          : messageRole === 'support'
                            ? 'text-[#73FFA2]/85'
                            : 'text-gray-400'
                    return (
                      <li key={ev.id} className="relative flex gap-3 pb-5 last:pb-0">
                        {!isOldest ? (
                          <span
                            className="absolute left-[7px] top-3 bottom-0 w-px bg-[#414141]"
                            aria-hidden
                          />
                        ) : null}
                        <span
                          className={`relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#1a1a1a] ${dotClass}`}
                        />
                        <div
                          className={`min-w-0 flex-1 rounded-lg border px-3 py-2 ${cardClass}`}
                        >
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            {roleLabel ? (
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                                  messageRole === 'user'
                                    ? 'bg-[#66DEDB]/15 text-[#66DEDB]'
                                    : 'bg-[#73FFA2]/10 text-[#73FFA2]/90'
                                }`}
                              >
                                {roleLabel}
                              </span>
                            ) : null}
                            <span className={`text-xs font-medium ${titleClass}`}>
                              {supportCaseEventTitle(ev.kind)}
                            </span>
                            {isLatestMessage ? (
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ${
                                  messageRole === 'user'
                                    ? 'bg-[#66DEDB]/20 text-[#66DEDB] ring-[#66DEDB]/35'
                                    : 'bg-[#73FFA2]/20 text-[#73FFA2] ring-[#73FFA2]/30'
                                }`}
                              >
                                Último
                              </span>
                            ) : null}
                            <span className="text-[10px] text-gray-500">
                              {new Date(ev.createdAt).toLocaleString('es-CO')}
                            </span>
                          </div>
                          {body ? (
                            <p className="mt-1.5 whitespace-pre-wrap text-xs text-gray-200">
                              {body}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    )
                  })
                  })()}
                </ol>
              </div>
            </div>
          )}
        </div>
      </ProfileTabletOverlayModal>

      <SupportCaseEvidenceModal
        open={evidenceOpen}
        attachments={attachments}
        index={evidenceIndex}
        onClose={() => setEvidenceOpen(false)}
        onIndexChange={setEvidenceIndex}
      />
    </>
  )
}
