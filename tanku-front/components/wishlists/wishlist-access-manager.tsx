'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import Image from 'next/image'
import { UserGroupIcon, XMarkIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/lib/contexts/toast-context'

interface AccessGrant {
  userId: string
  username: string | null
  firstName: string | null
  lastName: string | null
  avatar: string | null
  grantedAt: Date
}

interface AccessRequestRow {
  id: string
  wishlistId: string
  wishlistName: string
  requester: {
    id: string
    username: string | null
    firstName: string | null
    lastName: string | null
    avatar: string | null
  }
  createdAt: string
}

const pillBtn =
  'inline-flex shrink-0 items-center justify-center rounded-xl border border-[#66DEDB]/40 bg-black/35 px-3 py-2 text-[11px] font-medium text-[#66DEDB] transition-colors hover:border-[#73FFA2]/55 hover:bg-[#66DEDB]/10 sm:text-xs'

interface WishlistAccessManagerProps {
  wishlistId: string
  wishlistName?: string | null
  isPrivate: boolean
  triggerClassName?: string
  /**
   * `pill`: botón «Acceso» + modal propio (escritorio / por defecto).
   * `modalOnly`: solo el modal controlado desde fuera (`open`, `onModalClose`; p. ej. menú ⋯ en móvil).
   */
  variant?: 'pill' | 'modalOnly'
  open?: boolean
  onModalClose?: () => void
}

export function WishlistAccessManager({
  wishlistId,
  wishlistName,
  isPrivate,
  triggerClassName,
  variant = 'pill',
  open: controlledOpen,
  onModalClose,
}: WishlistAccessManagerProps) {
  const variantIsModalOnly = variant === 'modalOnly'
  const { success: toastSuccess, error: toastError } = useToast()
  const [grants, setGrants] = useState<AccessGrant[]>([])
  const [incomingRequests, setIncomingRequests] = useState<AccessRequestRow[]>([])
  const [loadingGrants, setLoadingGrants] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [pillOpen, setPillOpen] = useState(false)
  const modalOpen = variantIsModalOnly ? !!controlledOpen : pillOpen
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)

  const filteredPendingRequests = incomingRequests.filter((r) => r.wishlistId === wishlistId)

  const loadGrants = useCallback(async () => {
    if (!isPrivate) return
    setLoadingGrants(true)
    try {
      const response = await apiClient.get<AccessGrant[]>(API_ENDPOINTS.WISHLISTS.ACCESS_GRANTS(wishlistId))
      if (response.success && response.data) {
        setGrants(response.data)
      }
    } catch (error) {
      console.error('Error cargando accesos:', error)
    } finally {
      setLoadingGrants(false)
    }
  }, [isPrivate, wishlistId])

  const loadIncomingRequests = useCallback(async () => {
    if (!isPrivate) return
    setLoadingRequests(true)
    try {
      const response = await apiClient.get<AccessRequestRow[]>(API_ENDPOINTS.WISHLISTS.ACCESS_REQUESTS)
      if (response.success && response.data) {
        setIncomingRequests(Array.isArray(response.data) ? response.data : [])
      }
    } catch (error) {
      console.error('Error cargando solicitudes:', error)
    } finally {
      setLoadingRequests(false)
    }
  }, [isPrivate])

  useEffect(() => {
    if (modalOpen && isPrivate) {
      void loadGrants()
      void loadIncomingRequests()
    }
  }, [modalOpen, isPrivate, wishlistId, loadGrants, loadIncomingRequests])

  useEffect(() => {
    if (!isPrivate) return

    const handleAccessApproved = () => {
      if (modalOpen) {
        void loadGrants()
        void loadIncomingRequests()
      }
    }

    window.addEventListener('wishlist-access-approved', handleAccessApproved)
    return () => window.removeEventListener('wishlist-access-approved', handleAccessApproved)
  }, [modalOpen, isPrivate, loadGrants, loadIncomingRequests])

  const handleRevokeAccess = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas revocar el acceso a este usuario?')) {
      return
    }

    setRevokingId(userId)
    try {
      const response = await apiClient.delete(API_ENDPOINTS.WISHLISTS.REVOKE_ACCESS(wishlistId, userId))
      if (response.success) {
        setGrants((prev) => prev.filter((g) => g.userId !== userId))
        toastSuccess('Acceso revocado')
      }
    } catch (error) {
      console.error('Error revocando acceso:', error)
      toastError('Error al revocar el acceso')
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeAll = async () => {
    if (!confirm('¿Estás seguro de que deseas revocar todos los accesos a esta wishlist?')) {
      return
    }

    setRevokingId('all')
    try {
      const response = await apiClient.delete(API_ENDPOINTS.WISHLISTS.REVOKE_ALL_ACCESS(wishlistId))
      if (response.success) {
        setGrants([])
        toastSuccess('Se revocaron todos los accesos')
      }
    } catch (error) {
      console.error('Error revocando todos los accesos:', error)
      toastError('Error al revocar los accesos')
    } finally {
      setRevokingId(null)
    }
  }

  const handleApprove = async (requestId: string) => {
    setProcessingRequestId(requestId)
    try {
      const response = await apiClient.put(API_ENDPOINTS.WISHLISTS.APPROVE_ACCESS_REQUEST(requestId))
      if (response.success) {
        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId))
        toastSuccess('Solicitud aprobada')
        void loadGrants()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('wishlist-access-approved', {
              detail: { requestId },
            }),
          )
        }
      }
    } catch (error) {
      console.error('Error aprobando solicitud:', error)
      toastError('Error al aprobar la solicitud')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setProcessingRequestId(requestId)
    try {
      const response = await apiClient.put(API_ENDPOINTS.WISHLISTS.REJECT_ACCESS_REQUEST(requestId))
      if (response.success) {
        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId))
        toastSuccess('Solicitud rechazada')
      }
    } catch (error) {
      console.error('Error rechazando solicitud:', error)
      toastError('Error al rechazar la solicitud')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const closeModal = () => {
    if (variantIsModalOnly) {
      onModalClose?.()
    } else {
      setPillOpen(false)
    }
  }

  const triggerCn = clsx(pillBtn, triggerClassName)

  if (variantIsModalOnly && !isPrivate) {
    return null
  }

  if (!isPrivate && !variantIsModalOnly) {
    return (
      <button
        type="button"
        disabled
        className={clsx(triggerCn, 'cursor-not-allowed opacity-40 hover:border-[#66DEDB]/40 hover:bg-black/35')}
        title="Gestión de usuarios solo está disponible en wishlists privadas"
      >
        <UserGroupIcon className="-ml-0.5 mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        Acceso
      </button>
    )
  }

  const titleName = wishlistName?.trim() || 'Wishlist'

  return (
    <>
      {!variantIsModalOnly ? (
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={() => setPillOpen(true)}
          className={clsx(triggerCn, 'gap-1')}
          title="Gestionar acceso y solicitudes"
        >
          <UserGroupIcon className="-ml-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          Acceso
        </button>
      </div>
      ) : null}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent p-4"
          role="presentation"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wishlist-access-modal-title"
            className="flex max-h-[min(640px,calc(100vh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#66DEDB]/25 bg-[#1a1d24] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2 id="wishlist-access-modal-title" className="text-lg font-semibold text-white">
                  Acceso
                </h2>
                <p className="mt-0.5 truncate text-sm text-zinc-400" title={titleName}>
                  {titleName}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {/* Solicitudes pendientes (esta wishlist) */}
              <section className="border-b border-white/10 px-4 py-4 sm:px-5">
                <h3 className="mb-3 text-sm font-semibold text-[#66DEDB]">Solicitudes pendientes</h3>
                {loadingRequests ? (
                  <div className="py-6 text-center text-sm text-zinc-500">Cargando solicitudes…</div>
                ) : filteredPendingRequests.length === 0 ? (
                  <p className="text-sm text-zinc-500">No hay solicitudes pendientes para esta wishlist.</p>
                ) : (
                  <ul className="space-y-2">
                    {filteredPendingRequests.map((request) => {
                      const isProcessing = processingRequestId === request.id
                      const requesterName =
                        request.requester.username ||
                        `${request.requester.firstName || ''} ${request.requester.lastName || ''}`.trim() ||
                        'Usuario'

                      return (
                        <li
                          key={request.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {request.requester.avatar ? (
                              <Image
                                src={request.requester.avatar}
                                alt=""
                                width={40}
                                height={40}
                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                                unoptimized={request.requester.avatar.startsWith('http')}
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-300">
                                {(request.requester.firstName?.[0] || request.requester.username?.[0] || 'U').toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-white">{requesterName}</p>
                              <p className="truncate text-xs text-zinc-500">Quiere acceder</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <button
                              type="button"
                              disabled={isProcessing}
                              className="rounded-lg bg-green-600/85 p-2 text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Aprobar"
                              onClick={() => void handleApprove(request.id)}
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              className="rounded-lg bg-red-600/85 p-2 text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Rechazar"
                              onClick={() => void handleReject(request.id)}
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              {/* Personas con acceso */}
              <section className="px-4 py-4 sm:px-5">
                <h3 className="mb-3 text-sm font-semibold text-[#66DEDB]">Personas con acceso</h3>
                {loadingGrants ? (
                  <div className="py-6 text-center text-sm text-zinc-500">Cargando…</div>
                ) : grants.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Nadie tiene acceso aún. Cuando apruebes una solicitud, aparecerá aquí.
                  </p>
                ) : (
                  <>
                    {grants.length > 1 && (
                      <div className="mb-3">
                        <button
                          type="button"
                          onClick={() => void handleRevokeAll()}
                          disabled={revokingId === 'all'}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/15 px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Revocar todos los accesos
                        </button>
                      </div>
                    )}
                    <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-black/20">
                      {grants.map((grant) => {
                        const userName =
                          grant.username || `${grant.firstName || ''} ${grant.lastName || ''}`.trim() || 'Usuario'
                        const avatarUrl =
                          grant.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1E1E1E&color=73FFA2&size=64`

                        return (
                          <li
                            key={grant.userId}
                            className="flex items-center justify-between gap-3 p-3 first:rounded-t-xl last:rounded-b-xl hover:bg-white/[0.04]"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                                <Image
                                  src={avatarUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  unoptimized
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1E1E1E&color=73FFA2&size=64`
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-white">{userName}</p>
                                <p className="text-xs text-zinc-500">
                                  Desde {new Date(grant.grantedAt as unknown as string).toLocaleDateString('es-CO')}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleRevokeAccess(grant.userId)}
                              disabled={revokingId === grant.userId}
                              className="shrink-0 rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Revocar acceso"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
