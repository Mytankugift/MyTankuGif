'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronLeftIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/24/outline'
import {
  useSupportCasesNavStore,
  type SupportCasesViewMode,
} from '@/lib/stores/support-cases-nav-store'
import { useAdminDetailNavStore } from '@/lib/stores/admin-detail-nav-store'

function isSupportCasesRoute(pathname: string | null): boolean {
  return pathname === '/support-cases' || (pathname?.startsWith('/support-cases/') ?? false)
}

function NavViewButton({
  active,
  onClick,
  icon: Icon,
  label,
  variant = 'inline',
}: {
  active: boolean
  onClick: () => void
  icon: typeof TableCellsIcon
  label: string
  variant?: 'inline' | 'menu'
}) {
  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
        active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

/** Lista / Kanban en barra derecha del nav (solo desktop ≥ lg). */
export function SupportCaseNavViewToggle({ className = '' }: { className?: string }) {
  const pathname = usePathname()
  const viewMode = useSupportCasesNavStore((s) => s.viewMode)
  const setViewMode = useSupportCasesNavStore((s) => s.setViewMode)

  if (!isSupportCasesRoute(pathname)) return null

  return (
    <div
      className={`inline-flex shrink-0 items-center rounded-md border border-gray-200 bg-gray-50 p-0.5 ${className}`}
      role="group"
      aria-label="Vista de postventa"
    >
      <NavViewButton
        active={viewMode === 'table'}
        onClick={() => setViewMode('table')}
        icon={TableCellsIcon}
        label="Lista"
      />
      <NavViewButton
        active={viewMode === 'kanban'}
        onClick={() => setViewMode('kanban')}
        icon={Squares2X2Icon}
        label="Kanban"
      />
    </div>
  )
}

/** Lista / Kanban dentro del menú hamburguesa (móvil y tablet &lt; xl). */
export function SupportCaseNavMobileMenuActions() {
  const pathname = usePathname()
  const viewMode = useSupportCasesNavStore((s) => s.viewMode)
  const setViewMode = useSupportCasesNavStore((s) => s.setViewMode)

  if (!isSupportCasesRoute(pathname)) return null

  return (
    <div className="lg:hidden pt-4 mt-2 border-t border-gray-100 space-y-1">
      <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
        Postventa
      </p>
      <NavViewButton
        variant="menu"
        active={viewMode === 'table'}
        onClick={() => setViewMode('table')}
        icon={TableCellsIcon}
        label="Vista lista"
      />
      <NavViewButton
        variant="menu"
        active={viewMode === 'kanban'}
        onClick={() => setViewMode('kanban')}
        icon={Squares2X2Icon}
        label="Vista kanban"
      />
    </div>
  )
}

/** Volver al historial en móvil/tablet (&lt; xl) cuando hay un caso abierto. */
export function SupportCaseNavBackLink({ className = '' }: { className?: string }) {
  const pathname = usePathname()
  const caseCode = useAdminDetailNavStore((s) => s.caseCode)

  if (!isSupportCasesRoute(pathname) || !caseCode) return null

  return (
    <Link
      href="/support-cases"
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 xl:hidden ${className}`}
    >
      <ChevronLeftIcon className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only">Historial</span>
    </Link>
  )
}

/** @deprecated Usar SupportCaseNavViewToggle / SupportCaseNavMobileMenuActions. */
export function SupportCaseNavActions() {
  return <SupportCaseNavViewToggle />
}

/** @deprecated Usar SupportCaseNavMobileMenuActions. */
export function SupportCaseMobileViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: SupportCasesViewMode
  onChange: (mode: SupportCasesViewMode) => void
}) {
  const pathname = usePathname()
  if (!isSupportCasesRoute(pathname)) return null

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
      <NavViewButton
        active={viewMode === 'table'}
        onClick={() => onChange('table')}
        icon={TableCellsIcon}
        label="Lista"
      />
      <NavViewButton
        active={viewMode === 'kanban'}
        onClick={() => onChange('kanban')}
        icon={Squares2X2Icon}
        label="Kanban"
      />
    </div>
  )
}
