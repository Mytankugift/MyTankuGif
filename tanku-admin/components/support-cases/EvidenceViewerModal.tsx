'use client'

import { useCallback, useEffect } from 'react'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import type { SupportCaseAttachment } from '@/lib/types/support-cases'
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock'

interface EvidenceViewerModalProps {
  open: boolean
  attachments: SupportCaseAttachment[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

function isImageMime(mime: string) {
  return mime.startsWith('image/')
}

function isVideoMime(mime: string) {
  return mime.startsWith('video/')
}

async function downloadAttachment(file: SupportCaseAttachment) {
  try {
    const res = await fetch(file.url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = file.fileName || 'evidencia'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(file.url, '_blank', 'noopener,noreferrer')
  }
}

export function EvidenceViewerModal({
  open,
  attachments,
  index,
  onClose,
  onIndexChange,
}: EvidenceViewerModalProps) {
  useBodyScrollLock(open)

  const file = attachments[index]
  const imageAttachments = attachments.filter((a) => isImageMime(a.mimeType))
  const imageIndex = file ? imageAttachments.findIndex((a) => a.id === file.id) : -1

  const goPrev = useCallback(() => {
    if (attachments.length <= 1) return
    onIndexChange((index - 1 + attachments.length) % attachments.length)
  }, [attachments.length, index, onIndexChange])

  const goNext = useCallback(() => {
    if (attachments.length <= 1) return
    onIndexChange((index + 1) % attachments.length)
  }, [attachments.length, index, onIndexChange])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, goPrev, goNext])

  if (!open || !file) return null

  const showImageNav = isImageMime(file.mimeType) && imageAttachments.length > 1

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Visor de evidencia"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <p className="min-w-0 truncate text-sm font-medium text-gray-900" title={file.fileName}>
            {file.fileName}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => downloadAttachment(file)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Descargar
            </button>
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

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain bg-gray-900 p-4">
          {showImageNav ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                aria-label="Anterior"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                aria-label="Siguiente"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>
            </>
          ) : null}

          {isImageMime(file.mimeType) ? (
            <div className="relative h-[min(70vh,32rem)] w-full max-w-3xl">
              <Image
                src={file.url}
                alt={file.fileName}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          ) : isVideoMime(file.mimeType) ? (
            <video
              src={file.url}
              controls
              playsInline
              className="max-h-[70vh] w-full max-w-3xl rounded-md bg-black"
            />
          ) : (
            <div className="flex w-full max-w-3xl flex-col items-center gap-4 py-8">
              <p className="text-sm text-gray-300">Vista previa de PDF</p>
              <iframe
                src={file.url}
                title={file.fileName}
                className="h-[min(60vh,28rem)] w-full rounded-md bg-white"
              />
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-sky-400 hover:underline"
              >
                Abrir PDF en nueva pestaña
              </a>
            </div>
          )}
        </div>

        {attachments.length > 1 ? (
          <p className="shrink-0 border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-500">
            {index + 1} de {attachments.length}
            {showImageNav && imageIndex >= 0
              ? ` · imagen ${imageIndex + 1} de ${imageAttachments.length}`
              : ''}
          </p>
        ) : null}
      </div>
    </div>
  )
}
