'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

/** Bloque colapsable anidado (formularios largos). */
export function AdminFormSection({
  title,
  summary,
  defaultOpen = true,
  children,
}: {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-100/80 transition-colors"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {summary && !open ? (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{summary}</p>
          ) : null}
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <div className="px-4 pb-4 pt-0 space-y-3 border-t border-gray-200 bg-white">{children}</div> : null}
    </div>
  )
}
