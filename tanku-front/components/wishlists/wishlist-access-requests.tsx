'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import Image from 'next/image'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface AccessRequest {
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

export function WishlistAccessRequests() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get<AccessRequest[]>(
        API_ENDPOINTS.WISHLISTS.ACCESS_REQUESTS
      )
      if (response.success && response.data) {
        setRequests(response.data)
      }
    } catch (error) {
      console.error('Error cargando solicitudes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.WISHLISTS.APPROVE_ACCESS_REQUEST(requestId)
      )
      if (response.success) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        // Disparar evento para refrescar wishlists guardadas Y perfil del usuario
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wishlist-access-approved', {
            detail: { requestId }
          }))
        }
        // Mostrar notificación de éxito
        alert('Solicitud aprobada')
      }
    } catch (error) {
      console.error('Error aprobando solicitud:', error)
      alert('Error al aprobar la solicitud')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.WISHLISTS.REJECT_ACCESS_REQUEST(requestId)
      )
      if (response.success) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        alert('Solicitud rechazada')
      }
    } catch (error) {
      console.error('Error rechazando solicitud:', error)
      alert('Error al rechazar la solicitud')
    } finally {
      setProcessingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
        <p className="text-gray-400">Cargando solicitudes...</p>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No hay solicitudes de acceso pendientes</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        Solicitudes de acceso a wishlists
      </h3>
      {requests.map((request) => {
        const isProcessing = processingId === request.id
        const requesterName = request.requester.username || 
          `${request.requester.firstName || ''} ${request.requester.lastName || ''}`.trim() ||
          'Usuario'

        return (
          <div
            key={request.id}
            className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {request.requester.avatar ? (
                <Image
                  src={request.requester.avatar}
                  alt={requesterName}
                  width={40}
                  height={40}
                  className="rounded-full flex-shrink-0"
                  unoptimized={request.requester.avatar.startsWith('http')}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-400 text-sm font-medium">
                    {(request.requester.firstName?.[0] || request.requester.username?.[0] || 'U').toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium truncate">
                  {requesterName}
                </p>
                <p className="text-sm text-gray-400 truncate">
                  Solicita acceso a "{request.wishlistName}"
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleApprove(request.id)}
                disabled={isProcessing}
                className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Aprobar"
              >
                <CheckIcon className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => handleReject(request.id)}
                disabled={isProcessing}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Rechazar"
              >
                <XMarkIcon className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

