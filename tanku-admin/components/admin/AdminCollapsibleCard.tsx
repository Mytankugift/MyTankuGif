'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface AdminCollapsibleCardProps {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function AdminCollapsibleCard({
  title,
  summary,
  defaultOpen = true,
  children,
  className = '',
}: AdminCollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {summary && !open ? (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{summary}</p>
          ) : null}
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <div className="px-6 pb-6 border-t border-gray-100 pt-4">{children}</div> : null}
    </div>
  )
}
