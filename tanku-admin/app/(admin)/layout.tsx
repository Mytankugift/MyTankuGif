'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { NotificationContainer } from '@/components/notifications'
import { AdminMobileNav } from '@/components/admin/AdminMobileNav'
import { DetailNavActions } from '@/components/admin/DetailNavActions'
import { ProxyStatusNav } from '@/components/admin/ProxyStatusNav'
import { WorkerNavActions } from '@/components/workers/WorkerNavActions'
import {
  SupportCaseNavBackLink,
  SupportCaseNavViewToggle,
} from '@/components/support-cases/SupportCaseNavActions'
import { buildAdminNavDescription, buildAdminNavPath } from '@/lib/admin/nav-segments'
import { useAdminDetailNavStore } from '@/lib/stores/admin-detail-nav-store'
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, logout, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const navPath = buildAdminNavPath(pathname)
  const staticNavDescription = buildAdminNavDescription(pathname)
  const detailTitle = useAdminDetailNavStore((s) => s.title)
  const detailSubtitle = useAdminDetailNavStore((s) => s.subtitle)
  const caseCode = useAdminDetailNavStore((s) => s.caseCode)
  const statusBadge = useAdminDetailNavStore((s) => s.statusBadge)
  const patchDetailNav = useAdminDetailNavStore((s) => s.patchDetailNav)

  const isSupportCases = pathname?.startsWith('/support-cases') ?? false

  const displayNavPath =
    navPath && detailTitle && !isSupportCases
      ? navPath.map((seg, i) =>
          i === navPath.length - 1 && !seg.href ? { ...seg, label: detailTitle } : seg
        )
      : navPath

  const supportCaseTypeLabel = isSupportCases && caseCode ? detailSubtitle : null

  const mobileNavPath =
    displayNavPath && isSupportCases && caseCode
      ? [
          ...displayNavPath,
          {
            label: statusBadge ? `${caseCode} · ${statusBadge.label}` : caseCode,
          },
        ]
      : displayNavPath

  const navDescription =
    isSupportCases && caseCode ? null : detailSubtitle ?? staticNavDescription

  useEffect(() => {
    if (!pathname?.startsWith('/support-cases')) {
      patchDetailNav({ caseCode: null, statusBadge: null })
    }
  }, [pathname, patchDetailNav])

  useEffect(() => {
    if (!hasHydrated) return
    if (hasCheckedAuth) return
    setHasCheckedAuth(true)
    if (!isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [hasHydrated, isAuthenticated, router, hasCheckedAuth])

  if (!hasHydrated || (!hasCheckedAuth && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (hasCheckedAuth && !isAuthenticated) {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  const requestLogout = () => setLogoutConfirmOpen(true)

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <nav className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center min-h-14 lg:h-16 gap-2 py-2 lg:py-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Link
                href="/"
                className="text-lg lg:text-xl font-bold text-gray-900 hover:text-gray-700 shrink-0"
              >
                Tanku Admin
              </Link>
              {displayNavPath && (
                <>
                  <div className="hidden lg:block h-6 w-px bg-gray-300 shrink-0" />
                  <div className="hidden lg:flex flex-col min-w-0 max-w-md xl:max-w-xl">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
                      <SupportCaseNavBackLink />
                      {displayNavPath.map((segment, index) => (
                        <span key={index} className="flex items-center gap-2 shrink-0">
                          {index > 0 && <span className="text-gray-400">|</span>}
                          {segment.href ? (
                            <Link href={segment.href} className="hover:text-blue-600 truncate">
                              {segment.label}
                            </Link>
                          ) : (
                            <span className="truncate">{segment.label}</span>
                          )}
                        </span>
                      ))}
                      {isSupportCases && caseCode ? (
                        <span className="flex shrink-0 items-start gap-2 min-w-0">
                          <span className="text-gray-400 pt-0.5">|</span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-mono text-teal-700">{caseCode}</span>
                              {statusBadge ? (
                                <span
                                  className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}
                                >
                                  {statusBadge.label}
                                </span>
                              ) : null}
                            </span>
                            {supportCaseTypeLabel ? (
                              <span className="truncate text-xs font-normal text-gray-500">
                                {supportCaseTypeLabel}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      ) : null}
                    </div>
                    {navDescription && (
                      <span className="text-xs text-gray-500 truncate">{navDescription}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 lg:gap-3 xl:gap-4 flex-shrink-0">
              <div className="hidden lg:flex items-center gap-3 xl:gap-4">
                <SupportCaseNavViewToggle />
                <ProxyStatusNav />
                <DetailNavActions placement="nav" />
                <WorkerNavActions />
              </div>
              <AdminMobileNav
                userEmail={user?.email}
                userRole={user?.role}
                navPath={mobileNavPath}
                navDescription={navDescription}
                onLogout={requestLogout}
              />
              <div className="hidden xl:flex items-center gap-2 text-sm text-gray-600 max-w-[180px]">
                <UserCircleIcon className="w-5 h-5 shrink-0" />
                <span className="font-medium truncate">{user?.email}</span>
              </div>
              {user?.role && (
                <span
                  className={`hidden xl:inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'SUPER_ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Product Manager'}
                </span>
              )}
              <button
                onClick={requestLogout}
                className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="hidden xl:inline">Salir</span>
              </button>
            </div>
          </div>

          {displayNavPath && (
            <div className="lg:hidden pb-2 border-t border-gray-100 pt-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-900 leading-snug">
                <SupportCaseNavBackLink />
                {displayNavPath.map((segment, index) => (
                  <span key={index} className="flex items-center gap-1">
                    {index > 0 && <span className="text-gray-400">|</span>}
                    {segment.href ? (
                      <Link href={segment.href} className="text-blue-600">
                        {segment.label}
                      </Link>
                    ) : (
                      <span>{segment.label}</span>
                    )}
                  </span>
                ))}
                {isSupportCases && caseCode ? (
                  <span className="flex w-full min-w-0 items-start gap-1.5 basis-full sm:basis-auto">
                    <span className="text-gray-400">|</span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-teal-700">{caseCode}</span>
                        {statusBadge ? (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        ) : null}
                      </span>
                      {supportCaseTypeLabel ? (
                        <span className="text-[11px] font-normal text-gray-500">
                          {supportCaseTypeLabel}
                        </span>
                      ) : null}
                    </span>
                  </span>
                ) : null}
              </div>
              {navDescription && (
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{navDescription}</p>
              )}
            </div>
          )}
        </div>
      </nav>

      <main
        className={`flex-1 min-h-0 ${isSupportCases ? 'overflow-hidden' : 'overflow-y-auto'}`}
      >
        {children}
      </main>
      <NotificationContainer />

      <AdminConfirmModal
        open={logoutConfirmOpen}
        title="Cerrar sesión"
        message="¿Seguro que quieres salir del panel de administración?"
        confirmLabel="Salir"
        variant="danger"
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false)
          handleLogout()
        }}
      />
    </div>
  )
}
