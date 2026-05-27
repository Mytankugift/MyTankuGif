'use client'

import { useState } from 'react'
import { copyDropiOrderIdAndOpenDashboard } from '@/lib/admin/dropi-dashboard'
import { ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

interface DropiOrderActionsProps {
  dropiOrderId: number
  compact?: boolean
}

export function DropiOrderActions({ dropiOrderId, compact = false }: DropiOrderActionsProps) {
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

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <ClipboardDocumentIcon className="h-4 w-4" />
          {copied ? 'ID copiado' : 'Copiar ID Dropi'}
        </button>
        <button
          type="button"
          disabled={opening}
          onClick={handleCopyAndOpen}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0092c6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#007bb5] disabled:opacity-60"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          {opening ? 'Abriendo…' : 'Copiar y abrir Dropi'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 p-3">
      <p className="text-xs font-medium text-sky-900">Orden Dropi #{dropiOrderId}</p>
      <p className="mt-1 text-xs text-sky-800">
        En Dropi pega el ID en &quot;Buscar…&quot; y pulsa la lupa. Usa &quot;Copiar y abrir Dropi&quot; para
        llevar el ID al portapapeles y abrir el panel.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ClipboardDocumentIcon className="h-4 w-4" />
          {copied ? 'ID copiado' : 'Solo copiar ID'}
        </button>
        <button
          type="button"
          disabled={opening}
          onClick={handleCopyAndOpen}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#0092c6] bg-[#0092c6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#007bb5] disabled:opacity-60"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          {opening ? 'Abriendo Dropi…' : 'Copiar y abrir Dropi'}
        </button>
      </div>
    </div>
  )
}
