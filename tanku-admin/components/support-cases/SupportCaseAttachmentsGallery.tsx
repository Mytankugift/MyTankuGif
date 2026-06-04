'use client'

import { useState } from 'react'
import type { SupportCaseAttachment, SupportCaseEvidenceNotice } from '@/lib/types/support-cases'
import { DocumentIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { EvidenceViewerModal } from '@/components/support-cases/EvidenceViewerModal'
import { SupportCaseEvidenceNoticeBlock } from '@/components/support-cases/SupportCaseEvidenceNotice'

interface SupportCaseAttachmentsGalleryProps {
  attachments: SupportCaseAttachment[]
  evidenceNotice?: SupportCaseEvidenceNotice | null
  variant?: 'default' | 'compact'
}

function isImageMime(mime: string) {
  return mime.startsWith('image/')
}

function isVideoMime(mime: string) {
  return mime.startsWith('video/')
}

async function downloadAttachment(file: SupportCaseAttachment, e: React.MouseEvent) {
  e.stopPropagation()
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

export function SupportCaseAttachmentsGallery({
  attachments,
  evidenceNotice = null,
  variant = 'default',
}: SupportCaseAttachmentsGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  const compact = variant === 'compact'

  if (attachments.length === 0) {
    if (evidenceNotice) {
      return (
        <div
          className={`flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm ${
            compact ? 'h-full min-h-[12rem] p-4' : 'p-6'
          }`}
        >
          <h2 className={`font-semibold text-gray-900 ${compact ? 'text-sm mb-3' : 'text-lg mb-4'}`}>
            Evidencias
          </h2>
          <SupportCaseEvidenceNoticeBlock notice={evidenceNotice} variant={compact ? 'compact' : 'default'} />
        </div>
      )
    }
    if (compact) {
      return (
        <div className="flex h-full min-h-[12rem] flex-col rounded-lg border border-dashed border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Evidencias</h2>
          <p className="mt-auto text-sm text-gray-500">Sin archivos adjuntos en este reporte.</p>
        </div>
      )
    }
    return null
  }

  const openViewer = (index: number) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }

  return (
    <>
      <div
        className={`flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm ${
          compact ? 'h-full min-h-[12rem] p-4' : 'p-6'
        }`}
      >
        <h2 className={`font-semibold text-gray-900 ${compact ? 'text-sm mb-3' : 'text-lg mb-4'}`}>
          Evidencias ({attachments.length})
        </h2>
        <div
          className={`grid flex-1 gap-3 overflow-y-auto ${
            compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {attachments.map((file, idx) => (
            <div
              key={file.id}
              className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
            >
              <button
                type="button"
                onClick={() => openViewer(idx)}
                className="relative aspect-video bg-gray-100 flex items-center justify-center text-left hover:opacity-95"
              >
                {isImageMime(file.mimeType) ? (
                  <Image
                    src={file.url}
                    alt={file.fileName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : isVideoMime(file.mimeType) ? (
                  <video
                    src={file.url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <DocumentIcon className="h-12 w-12 text-gray-400" />
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
                  <MagnifyingGlassIcon className="h-8 w-8 text-white" />
                </span>
              </button>
              <div className="flex items-center justify-between gap-2 p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate" title={file.fileName}>
                    {file.fileName}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => downloadAttachment(file, e)}
                  className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                  aria-label="Descargar"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <EvidenceViewerModal
        open={viewerOpen}
        attachments={attachments}
        index={viewerIndex}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setViewerIndex}
      />
    </>
  )
}
