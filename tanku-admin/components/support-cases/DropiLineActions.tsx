'use client'

import { useState } from 'react'
import {
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { copyDropiOrderIdAndOpenDashboard } from '@/lib/admin/dropi-dashboard'

const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60'

interface DropiLineActionsProps {
  dropiOrderId: number
  onConsult: () => void
  consultLoading?: boolean
}

export function DropiLineActions({
  dropiOrderId,
  onConsult,
  consultLoading = false,
}: DropiLineActionsProps) {
  const [copied, setCopied] = useState(false)
  const [opening, setOpening] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(dropiOrderId))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleCopyAndOpen = async () => {
    setOpening(true)
    try {
      await copyDropiOrderIdAndOpenDashboard(dropiOrderId)
      setCopied(true)
      setTimeout(() => setCopied(false), 4000)
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="mt-4 border-t border-gray-200/80 pt-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Dropi · orden #{dropiOrderId}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={consultLoading}
          onClick={onConsult}
          className={`${btnBase} border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100`}
        >
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0" />
          {consultLoading ? 'Consultando…' : 'Consultar estado'}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className={`${btnBase} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
        >
          <ClipboardDocumentIcon className="h-4 w-4 shrink-0" />
          {copied ? 'ID copiado' : 'Copiar ID'}
        </button>
        <button
          type="button"
          disabled={opening}
          onClick={handleCopyAndOpen}
          className={`${btnBase} border-[#0092c6] bg-[#0092c6] text-white hover:bg-[#007bb5]`}
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
          {opening ? 'Abriendo…' : 'Copiar y abrir Dropi'}
        </button>
      </div>
    </div>
  )
}
