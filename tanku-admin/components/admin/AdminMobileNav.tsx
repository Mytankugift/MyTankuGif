'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { ADMIN_MAIN_NAV_LINKS } from '@/lib/admin/main-nav-links'
import type { NavSegment } from '@/lib/admin/nav-segments'
import { DetailNavActions } from '@/components/admin/DetailNavActions'
import { WorkerNavActions } from '@/components/workers/WorkerNavActions'
import { ProxyStatusNav } from '@/components/admin/ProxyStatusNav'
import { hideDetailActionsInMobileMenu } from '@/lib/admin/detail-routes'

interface AdminMobileNavProps {
  userEmail?: string | null
  userRole?: string | null
  navPath: NavSegment[] | null
  navDescription: string | null
  onLogout: () => void
}

export function AdminMobileNav({
  userEmail,
  userRole,
  navPath,
  navDescription,
  onLogout,
}: AdminMobileNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const showDetailActionsInMenu = !hideDetailActionsInMobileMenu(pathname)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
        aria-label="Abrir menú"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {open ? (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 bottom-0 w-[min(100%,20rem)] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200">
              <span className="font-bold text-gray-900">Tanku Admin</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                aria-label="Cerrar"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {ADMIN_MAIN_NAV_LINKS.map((link) => {
                const active =
                  link.href === '/'
                    ? pathname === '/' || pathname === ''
                    : pathname === link.href || pathname?.startsWith(`${link.href}/`)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}

              {navPath && navPath.length > 0 ? (
                <div className="pt-4 mt-4 border-t border-gray-100">
                  <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Ubicación
                  </p>
                  <div className="px-3 text-sm text-gray-800 space-y-1">
                    {navPath.map((seg, i) => (
                      <div key={i}>
                        {seg.href ? (
                          <Link href={seg.href} className="text-blue-600 hover:underline">
                            {seg.label}
                          </Link>
                        ) : (
                          <span className="font-semibold">{seg.label}</span>
                        )}
                      </div>
                    ))}
                    {navDescription ? (
                      <p className="text-xs text-gray-500 mt-1 break-words">{navDescription}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {showDetailActionsInMenu ? (
                <div className="pt-4 mt-2 border-t border-gray-100 space-y-3 px-1">
                  <ProxyStatusNav compact />
                  <DetailNavActions />
                  <WorkerNavActions />
                </div>
              ) : (
                <div className="pt-4 mt-2 border-t border-gray-100 px-1">
                  <ProxyStatusNav compact />
                  <WorkerNavActions />
                </div>
              )}
            </nav>

            <div className="border-t border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserCircleIcon className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{userEmail}</p>
                  {userRole ? (
                    <p className="text-xs text-gray-500">
                      {userRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Product Manager'}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onLogout()
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Salir
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}
