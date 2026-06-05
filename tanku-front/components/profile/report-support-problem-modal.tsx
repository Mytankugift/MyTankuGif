'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { clsx } from 'clsx'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { NOTIFICATION_ROW_DIVIDER_STYLE } from '@/lib/notifications-display'
import {
  CATEGORY_CHIP_IDLE_CLASS,
  CATEGORY_CHIP_SELECTED_CLASS,
  CATEGORY_CHIP_TEXT_IDLE_CLASS,
  CATEGORY_CHIP_TEXT_SELECTED_CLASS,
} from '@/components/feed/category-palette'
import { ProfileTabletOverlayModal } from '@/components/profile/profile-tablet-overlay-modal'
import { ColombiaPhoneInput } from '@/components/ui/colombia-phone-input'
import {
  isValidColombiaPhone,
  maskColombiaPhone,
  normalizeColombiaPhone,
} from '@/lib/utils/colombia-phone'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import { tankuModalBtnClass } from '@/lib/ui/tanku-modal-buttons'
import type { OrderDTO, SupportCaseDetailDTO, SupportCaseType } from '@/types/api'
import { SUPPORT_CASE_TYPE_LABELS } from '@/lib/support-case-type-labels'
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  ClockIcon,
  ArrowPathRoundedSquareIcon,
  EllipsisHorizontalIcon,
  ChatBubbleLeftRightIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  PlusIcon,
  ShoppingBagIcon,
  FilmIcon,
} from '@heroicons/react/24/outline'

const MAX_DESCRIPTION = 1000
const MAX_FILES = 3
const MAX_IMAGE_PDF_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 25 * 1024 * 1024
const ACCEPT =
  'image/jpeg,image/png,application/pdf,video/mp4,video/webm,video/quicktime,.mov'

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
])

const REASON_OPTIONS: {
  value: SupportCaseType
  icon: typeof CubeIcon
}[] = [
  { value: 'NOT_RECEIVED', icon: CubeIcon },
  { value: 'DAMAGED', icon: ExclamationTriangleIcon },
  { value: 'DELAY', icon: ClockIcon },
  { value: 'WRONG_ITEM', icon: ArrowPathRoundedSquareIcon },
  { value: 'INCOMPLETE', icon: EllipsisHorizontalIcon },
]

const EVIDENCE_REQUIRED: SupportCaseType[] = ['DAMAGED', 'WRONG_ITEM', 'INCOMPLETE']

/** Misma altura visual que el textarea (rows=8) para alinear columnas. */
const EVIDENCE_FIELD_HEIGHT_CLASS = 'h-[13.5rem] min-h-[13.5rem] max-h-[13.5rem]'

function fileMaxBytes(file: File): number {
  return file.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_PDF_BYTES
}

function isAllowedFile(file: File): boolean {
  return ALLOWED_MIMES.has(file.type) || (file.type === '' && /\.(mov|mp4|webm)$/i.test(file.name))
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}

interface ReportSupportProblemModalProps {
  order: OrderDTO
  open: boolean
  onClose: () => void
  onSuccess: (created: SupportCaseDetailDTO) => void
}

export function ReportSupportProblemModal({
  order,
  open,
  onClose,
  onSuccess,
}: ReportSupportProblemModalProps) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [caseType, setCaseType] = useState<SupportCaseType>('NOT_RECEIVED')
  const [description, setDescription] = useState('')
  const [orderItemId, setOrderItemId] = useState(
    order.items.length === 1 ? order.items[0].id : ''
  )
  const [files, setFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contactPhone, setContactPhone] = useState('')
  const [editingContact, setEditingContact] = useState(true)

  useEffect(() => {
    if (!open) return
    const normalized = normalizeColombiaPhone(user?.phone)
    setContactPhone(normalized || '')
    setEditingContact(!normalized)
    setError(null)
  }, [open, user?.phone])

  useEffect(() => {
    const urls = files.map((f) =>
      isImageFile(f) || isVideoFile(f) ? URL.createObjectURL(f) : ''
    )
    setFilePreviews(urls)
    return () => {
      urls.forEach((u) => {
        if (u) URL.revokeObjectURL(u)
      })
    }
  }, [files])

  const hasValidContact = isValidColombiaPhone(contactPhone)
  const showContactConfirmed = hasValidContact && !editingContact
  const canAddMoreFiles = files.length < MAX_FILES

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming)
    const valid: File[] = []
    for (const file of list) {
      if (!isAllowedFile(file)) {
        setError('Formato no permitido. Usa JPG, PNG, PDF o video (MP4, WebM, MOV)')
        continue
      }
      const max = fileMaxBytes(file)
      if (file.size > max) {
        setError(
          isVideoFile(file)
            ? 'Cada video debe pesar máximo 25 MB'
            : 'Cada archivo debe pesar máximo 10 MB'
        )
        continue
      }
      valid.push(file)
    }
    if (valid.length === 0) return
    setError(null)
    setFiles((prev) => {
      const merged = [...prev, ...valid]
      if (merged.length > MAX_FILES) {
        setError(`Máximo ${MAX_FILES} archivos`)
        return merged.slice(0, MAX_FILES)
      }
      return merged
    })
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const openFilePicker = () => {
    if (!canAddMoreFiles) return
    fileInputRef.current?.click()
  }

  const handleSubmit = async () => {
    setError(null)
    const trimmed = description.trim()
    if (trimmed.length < 10) {
      setError('Describe el problema con al menos 10 caracteres')
      return
    }
    if (trimmed.length > MAX_DESCRIPTION) {
      setError(`Máximo ${MAX_DESCRIPTION} caracteres`)
      return
    }
    if (!hasValidContact) {
      setError('Indica un celular válido de Colombia (+57, 10 dígitos comenzando en 3)')
      return
    }
    if (order.items.length > 1 && !orderItemId) {
      setError('Selecciona el producto afectado')
      return
    }
    if (EVIDENCE_REQUIRED.includes(caseType) && files.length === 0) {
      setError('Para este motivo debes adjuntar al menos una evidencia')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('orderId', order.id)
      formData.append('caseType', caseType)
      formData.append('description', trimmed)
      formData.append('contactPhone', contactPhone)
      if (orderItemId) formData.append('orderItemId', orderItemId)
      files.forEach((f) => formData.append('files', f))

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
      const response = await fetch(`${API_URL}${API_ENDPOINTS.SUPPORT_CASES.CREATE}`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()
      if (response.ok && data.success && data.data) {
        await checkAuth()
        onSuccess(data.data as SupportCaseDetailDTO)
        onClose()
      } else {
        setError(data.error?.message || 'No se pudo enviar el reporte')
      }
    } catch {
      setError('Error de conexión al enviar el reporte')
    } finally {
      setSubmitting(false)
    }
  }

  const showProductPicker = order.items.length > 0

  return (
    <ProfileTabletOverlayModal
      open={open}
      onClose={onClose}
      dismissible={!submitting}
      titleId="report-support-problem-title"
      mobileLayout="dialog"
      mobileBackdrop="blur"
      maxWidthClass="max-w-lg md:max-w-3xl"
      panelHeightClass="h-auto max-md:max-h-[min(46rem,93dvh)] md:h-[min(44rem,min(92dvh,90vh))] md:min-h-[20rem]"
      panelClassName="flex min-h-0 flex-col"
    >
      <div
        className="flex shrink-0 items-center justify-between border-b border-[#414141] px-5 py-4"
        style={NOTIFICATION_ROW_DIVIDER_STYLE}
      >
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-[#73FFA2]" />
          <h2 id="report-support-problem-title" className="text-lg font-semibold text-[#73FFA2]">
            Reportar Problema
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
          aria-label="Cerrar"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
        <div>
          <p className="mb-3 text-sm text-gray-400">Selecciona el motivo</p>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {REASON_OPTIONS.map((opt, index) => {
              const Icon = opt.icon
              const selected = caseType === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCaseType(opt.value)}
                  className="group flex w-full min-w-0 cursor-pointer justify-stretch text-left transition active:scale-[0.98]"
                >
                  <div
                    className={clsx(
                      'flex min-h-[40px] w-full items-stretch overflow-hidden rounded-full border transition-colors duration-200 sm:min-h-[44px]',
                      selected ? CATEGORY_CHIP_SELECTED_CLASS : CATEGORY_CHIP_IDLE_CLASS
                    )}
                  >
                    <div className="flex w-8 shrink-0 items-center justify-center self-stretch sm:w-9">
                      <Icon
                        className={clsx(
                          'h-4 w-4 shrink-0 sm:h-5 sm:w-5',
                          selected ? 'text-[#73FFA2]' : 'text-white'
                        )}
                        aria-hidden
                      />
                    </div>
                    <div className="flex min-h-full min-w-0 flex-1 items-center self-stretch px-1.5 py-1 sm:px-2 sm:py-1.5">
                      <span
                        className={clsx(
                          'line-clamp-2 w-full text-[10px] font-semibold leading-snug sm:text-[11px]',
                          selected ? CATEGORY_CHIP_TEXT_SELECTED_CLASS : CATEGORY_CHIP_TEXT_IDLE_CLASS
                        )}
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                          {SUPPORT_CASE_TYPE_LABELS[opt.value]}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#414141]/80 bg-black/15 px-3 py-2">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">Contacto</span>
          {showContactConfirmed ? (
            <>
              <span className="text-xs text-gray-300">{maskColombiaPhone(contactPhone)}</span>
              <button
                type="button"
                onClick={() => setEditingContact(true)}
                className="text-[11px] font-medium text-[#66DEDB] hover:text-[#73FFA2]"
              >
                Cambiar
              </button>
            </>
          ) : (
            <div className="min-w-[12rem] flex-1">
              <ColombiaPhoneInput
                value={contactPhone}
                onChange={setContactPhone}
                disabled={submitting}
                aria-label="Teléfono de contacto"
              />
            </div>
          )}
        </div>

        {showProductPicker && (
          <div>
            <p className="mb-2 text-sm text-gray-400">Producto afectado</p>
            <div className="flex flex-wrap gap-2">
              {order.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setOrderItemId('')}
                  className={clsx(
                    'flex max-w-[140px] flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors',
                    orderItemId === ''
                      ? 'border-[#73FFA2] bg-[#73FFA2]/10'
                      : 'border-[#414141] bg-[#1e2429] hover:border-[#66DEDB]/40'
                  )}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-black/30">
                    <ShoppingBagIcon className="h-7 w-7 text-gray-400" />
                  </div>
                  <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-gray-300">
                    Todo el pedido
                  </span>
                </button>
              )}
              {order.items.map((item) => {
                const img = item.product.images?.[0]
                const selected = orderItemId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOrderItemId(item.id)}
                    className={clsx(
                      'flex max-w-[140px] flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors',
                      selected
                        ? 'border-[#73FFA2] bg-[#73FFA2]/10'
                        : 'border-[#414141] bg-[#1e2429] hover:border-[#66DEDB]/40'
                    )}
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-md bg-black/30 ring-1 ring-[#414141]/60">
                      {img ? (
                        <Image
                          src={img}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="56px"
                          unoptimized={isRemoteImageSrc(img) || img.includes('.gif')}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] text-gray-600">
                          —
                        </div>
                      )}
                    </div>
                    <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-gray-300">
                      {item.product.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
              <ChatBubbleLeftRightIcon className="h-4 w-4 text-[#66DEDB]" />
              Describe lo ocurrido
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              rows={8}
              placeholder="Cuéntanos qué pasó..."
              className={clsx(
                'w-full resize-none rounded-xl border border-[#414141] bg-[#1e2429] px-3 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#66DEDB]/50 focus:outline-none',
                EVIDENCE_FIELD_HEIGHT_CLASS
              )}
            />
            <p className="mt-1 text-right text-xs text-gray-500">
              {description.length} / {MAX_DESCRIPTION}
            </p>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
              <CloudArrowUpIcon className="h-4 w-4 text-[#66DEDB]" />
              Adjunta evidencia
              <span className="font-normal text-gray-500">
                ({files.length}/{MAX_FILES})
              </span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
              }}
              className={clsx(
                'flex flex-col overflow-hidden rounded-xl border-2 border-dashed transition-colors',
                EVIDENCE_FIELD_HEIGHT_CLASS,
                dragOver
                  ? 'border-[#66DEDB] bg-[#66DEDB]/10'
                  : 'border-[#414141] bg-[#1e2429]',
                files.length === 0 && 'cursor-pointer hover:border-[#66DEDB]/40'
              )}
              onClick={files.length === 0 ? openFilePicker : undefined}
              onKeyDown={
                files.length === 0
                  ? (e) => e.key === 'Enter' && openFilePicker()
                  : undefined
              }
              role={files.length === 0 ? 'button' : undefined}
              tabIndex={files.length === 0 ? 0 : undefined}
            >
              {files.length === 0 ? (
                <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center px-4 py-4 text-center">
                  <CloudArrowUpIcon className="mb-2 h-9 w-9 text-gray-500" />
                  <p className="text-sm text-gray-400">
                    Arrastra archivos o{' '}
                    <span className="font-medium text-[#73FFA2]">selecciona</span>
                  </p>
                  <p className="mt-2 text-[11px] text-gray-500">
                    JPG, PNG, PDF o video · máx. {MAX_FILES} · 10 MB / 25 MB video
                  </p>
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col p-3">
                  <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain">
                    {files.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-2 rounded-lg border border-[#414141]/80 bg-black/30 p-1.5"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black/40">
                          {isImageFile(file) && filePreviews[index] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={filePreviews[index]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : isVideoFile(file) && filePreviews[index] ? (
                            <video
                              src={filePreviews[index]}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                            />
                          ) : isVideoFile(file) ? (
                            <div className="flex h-full items-center justify-center">
                              <FilmIcon className="h-5 w-5 text-[#66DEDB]" />
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <DocumentIcon className="h-5 w-5 text-[#66DEDB]" />
                            </div>
                          )}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(index)
                          }}
                          className="shrink-0 text-[11px] text-red-400 hover:text-red-300"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                  {canAddMoreFiles ? (
                    <div className="flex shrink-0 items-center justify-center pt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openFilePicker()
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-[#414141] px-2.5 py-1 text-[11px] font-medium text-[#73FFA2] hover:border-[#66DEDB]/50 hover:bg-white/[0.04]"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        Agregar más
                      </button>
                    </div>
                  ) : (
                    <div className="shrink-0 pt-2" aria-hidden />
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
        </div>

      </div>

      <footer
        className="shrink-0 border-t border-[#414141]/90 bg-[#14181c] px-4 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),inset_0_6px_16px_rgba(0,0,0,0.45)] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
        style={NOTIFICATION_ROW_DIVIDER_STYLE}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {error ? (
            <p className="min-w-0 text-[11px] leading-snug text-red-400 sm:max-w-[60%]">{error}</p>
          ) : (
            <p className="min-w-0 text-[10px] leading-snug text-gray-600 sm:max-w-[60%]">
              Revisaremos tu caso en un plazo estimado de 24 a 48 horas.
            </p>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className={tankuModalBtnClass('primary', 'compact', 'w-full shrink-0 sm:w-auto sm:min-w-[7.5rem]')}
          >
            {submitting ? 'Enviando…' : 'Enviar reporte'}
          </button>
        </div>
      </footer>
      </div>
    </ProfileTabletOverlayModal>
  )
}
