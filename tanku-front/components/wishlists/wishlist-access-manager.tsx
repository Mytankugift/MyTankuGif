'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import Image from 'next/image'
import { UserGroupIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'

interface AccessGrant {
  userId: string
  username: string | null
  firstName: string | null
  lastName: string | null
  avatar: string | null
  grantedAt: Date
}

interface WishlistAccessManagerProps {
  wishlistId: string
  isPrivate: boolean
}

export function WishlistAccessManager({ wishlistId, isPrivate }: WishlistAccessManagerProps) {
  const [grants, setGrants] = useState<AccessGrant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadGrants = async () => {
    if (!isPrivate) return
    setIsLoading(true)
    try {
      const response = await apiClient.get<AccessGrant[]>(
        API_ENDPOINTS.WISHLISTS.ACCESS_GRANTS(wishlistId)
      )
      if (response.success && response.data) {
        setGrants(response.data)
      }
    } catch (error) {
      console.error('Error cargando accesos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && isPrivate) {
      loadGrants()
    }
  }, [isOpen, isPrivate, wishlistId])

  // Escuchar evento cuando se aprueba acceso desde otro lugar
  useEffect(() => {
    if (!isPrivate) return

    const handleAccessApproved = () => {
      if (isOpen) {
        // Refrescar si el panel está abierto
        loadGrants()
      }
    }

    window.addEventListener('wishlist-access-approved', handleAccessApproved)

    return () => {
      window.removeEventListener('wishlist-access-approved', handleAccessApproved)
    }
  }, [isOpen, isPrivate])

  const handleRevokeAccess = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas revocar el acceso a este usuario?')) {
      return
    }

    setRevokingId(userId)
    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.WISHLISTS.REVOKE_ACCESS(wishlistId, userId)
      )
      if (response.success) {
        setGrants((prev) => prev.filter((g) => g.userId !== userId))
      }
    } catch (error) {
      console.error('Error revocando acceso:', error)
      alert('Error al revocar el acceso')
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
      const response = await apiClient.delete(
        API_ENDPOINTS.WISHLISTS.REVOKE_ALL_ACCESS(wishlistId)
      )
      if (response.success) {
        setGrants([])
      }
    } catch (error) {
      console.error('Error revocando todos los accesos:', error)
      alert('Error al revocar los accesos')
    } finally {
      setRevokingId(null)
    }
  }

  if (!isPrivate) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-[#73FFA2] hover:text-[#66DEDB] transition-colors flex items-center gap-1"
        title="Gestionar accesos"
      >
        <UserGroupIcon className="w-4 h-4" />
        Accesos
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer click fuera */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel de gestión de accesos */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Usuarios con acceso</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#73FFA2] mx-auto mb-2"></div>
                  <p className="text-sm">Cargando...</p>
                </div>
              ) : grants.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  No hay usuarios con acceso
                </div>
              ) : (
                <>
                  {grants.length > 1 && (
                    <div className="p-3 border-b border-gray-700">
                      <button
                        onClick={handleRevokeAll}
                        disabled={revokingId === 'all'}
                        className="w-full py-2 px-3 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Revocar todos los accesos
                      </button>
                    </div>
                  )}
                  <div className="divide-y divide-gray-700">
                    {grants.map((grant) => {
                      const userName = grant.username ||
                        `${grant.firstName || ''} ${grant.lastName || ''}`.trim() ||
                        'Usuario'
                      const avatarUrl = grant.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1E1E1E&color=73FFA2&size=64`

                      return (
                        <div
                          key={grant.userId}
                          className="p-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                              <Image
                                src={avatarUrl}
                                alt={userName}
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
                              <p className="text-white font-medium truncate text-sm">
                                {userName}
                              </p>
                              <p className="text-xs text-gray-400">
                                Acceso desde {new Date(grant.grantedAt).toLocaleDateString('es-CO')}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeAccess(grant.userId)}
                            disabled={revokingId === grant.userId}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            title="Revocar acceso"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

