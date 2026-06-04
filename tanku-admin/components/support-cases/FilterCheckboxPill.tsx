'use client'

import { CheckIcon } from '@heroicons/react/24/solid'

interface FilterCheckboxPillProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function FilterCheckboxPill({ id, label, checked, onChange }: FilterCheckboxPillProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer select-none items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        checked
          ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-sm ring-1 ring-teal-200'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked ? 'border-teal-600 bg-teal-600' : 'border-gray-300 bg-white'
        }`}
        aria-hidden
      >
        {checked ? <CheckIcon className="h-3 w-3 text-white" /> : null}
      </span>
      {label}
    </label>
  )
}
