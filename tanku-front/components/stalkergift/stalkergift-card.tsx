'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { Button } from '@/components/ui/button'
import type { StalkerGiftDTO } from '@/types/api'
import { GiftIcon, CheckCircleIcon, XCircleIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'

interface StalkerGiftCardProps {
  gift: StalkerGiftDTO
  type: 'received' | 'sent'
  onUpdate?: () => void
}

export function StalkerGiftCard({ gift, type, onUpdate }: StalkerGiftCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getEstadoBadge = (estado: StalkerGiftDTO['estado']) => {
    switch (estado) {
      case 'CREATED':
        return { label: 'Creado', color: 'bg-gray-600' }
      case 'PAID':
        return { label: 'Pagado', color: 'bg-blue-600' }
      case 'WAITING_ACCEPTANCE':
        return { label: 'Pendiente', color: 'bg-yellow-600' }
      case 'ACCEPTED':
        return { label: 'Aceptado', color: 'bg-[#73FFA2] text-black' }
      case 'REJECTED':
        return { label: 'Rechazado', color: 'bg-red-600' }
      case 'CANCELLED':
        return { label: 'Cancelado', color: 'bg-gray-600' }
      default:
        return { label: estado, color: 'bg-gray-600' }
    }
  }

  const handleAccept = async () => {
    if (!gift.id) return

    setIsLoading(true)
    try {
      // Redirigir a la página de aceptación con el token
      if (gift.linkToken) {
        router.push(`/stalkergift/accept/${gift.linkToken}`)
      } else {
        // Si no hay token, usar ID (solo si el usuario está autenticado)
        router.push(`/stalkergift/accept/${gift.id}`)
      }
    } catch (err: any) {
      console.error('Error aceptando regalo:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    if (!gift.id || !confirm('¿Estás seguro de que quieres rechazar este regalo?')) return

    setIsLoading(true)
    try {
      const response = await apiClient.post<StalkerGiftDTO>(
        API_ENDPOINTS.STALKER_GIFT.REJECT(gift.id)
      )

      if (response.success) {
        onUpdate?.()
      }
    } catch (err: any) {
      console.error('Error rechazando regalo:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChat = () => {
    if (gift.conversationId) {
      router.push(`/messages?conversation=${gift.conversationId}`)
    }
  }

  const handleViewLink = () => {
    if (gift.uniqueLink) {
      window.open(gift.uniqueLink, '_blank')
    }
  }

  const estadoBadge = getEstadoBadge(gift.estado)

  return (
    <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
      {/* Imagen del producto */}
      {gift.product?.images && gift.product.images.length > 0 && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
          <Image
            src={gift.product.images[0]}
            alt={gift.product.title || 'Producto'}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Info del producto */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-1 truncate">
          {gift.product?.title || 'Producto'}
        </h3>
        {gift.variant && (
          <p className="text-sm text-gray-400 mb-2">Variante: {gift.variant.title}</p>
        )}
        <p className="text-sm text-gray-400">Cantidad: {gift.quantity}</p>
      </div>

      {/* Estado */}
      <div className="mb-4">
        <span className={`px-2 py-1 text-xs font-semibold rounded ${estadoBadge.color}`}>
          {estadoBadge.label}
        </span>
      </div>

      {/* Info del sender/receiver según tipo */}
      {type === 'received' && (
        <div className="mb-4">
          <p className="text-sm text-gray-300">
            De: <span className="font-semibold text-[#66DEDB]">{gift.senderAlias}</span>
          </p>
          {gift.senderMessage && (
            <p className="text-sm text-gray-400 mt-2 line-clamp-2">{gift.senderMessage}</p>
          )}
        </div>
      )}

      {type === 'sent' && (
        <div className="mb-4">
          {gift.receiver ? (
            <p className="text-sm text-gray-300">
              Para: <span className="font-semibold text-[#66DEDB]">
                {gift.receiver.firstName || gift.receiver.email}
              </span>
            </p>
          ) : gift.externalReceiverData ? (
            <p className="text-sm text-gray-300">
              Para: <span className="font-semibold text-[#66DEDB]">
                {gift.externalReceiverData.name || 
                 gift.externalReceiverData.instagram || 
                 gift.externalReceiverData.email || 
                 'Usuario externo'}
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-300">Usuario externo</p>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-col gap-2">
        {type === 'received' && gift.estado === 'WAITING_ACCEPTANCE' && (
          <>
            <Button
              onClick={handleAccept}
              disabled={isLoading}
              className="w-full bg-[#73FFA2] hover:bg-[#66DEDB] text-black font-semibold"
            >
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Aceptar
            </Button>
            <Button
              onClick={handleReject}
              disabled={isLoading}
              variant="secondary"
              className="w-full"
            >
              <XCircleIcon className="w-4 h-4 mr-2" />
              Rechazar
            </Button>
          </>
        )}

        {type === 'sent' && gift.estado === 'WAITING_ACCEPTANCE' && gift.uniqueLink && (
          <Button
            onClick={handleViewLink}
            variant="secondary"
            className="w-full"
          >
            Ver link
          </Button>
        )}

        {gift.chatEnabled && gift.conversationId && (
          <Button
            onClick={handleOpenChat}
            variant="secondary"
            className="w-full"
          >
            <ChatBubbleLeftIcon className="w-4 h-4 mr-2" />
            Abrir chat
          </Button>
        )}

        {gift.estado === 'ACCEPTED' && gift.orderId && (
          <Button
            onClick={() => router.push(`/orders/${gift.orderId}`)}
            variant="secondary"
            className="w-full"
          >
            Ver orden
          </Button>
        )}
      </div>
    </div>
  )
}

