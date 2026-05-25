'use client'

import { useAdminDetailNavStore } from '@/lib/stores/admin-detail-nav-store'

const variantClasses: Record<string, string> = {
  default: 'text-sm text-blue-600 hover:text-blue-700',
  primary: 'px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium',
  danger: 'px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium',
  muted: 'px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm',
}

type Placement = 'nav' | 'inline'

export function DetailNavActions({ placement = 'nav' }: { placement?: Placement }) {
  const actions = useAdminDetailNavStore((s) => s.actions)

  if (actions.length === 0) return null

  const wrapperClass =
    placement === 'nav'
      ? 'hidden lg:flex items-center gap-2 flex-shrink-0'
      : 'lg:hidden flex flex-wrap items-center gap-2'

  return (
    <div className={wrapperClass}>
      {actions.map((action) => {
        const variant = action.variant ?? 'default'
        const isButton = variant === 'primary' || variant === 'danger' || variant === 'muted'

        if (isButton) {
          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={`${variantClasses[variant]} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              {action.label}
            </button>
          )
        }

        return (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={`text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
          >
            {action.label}
          </button>
        )
      })}
    </div>
  )
}
