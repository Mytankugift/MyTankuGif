'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { StalkerGiftTabs } from '@/components/stalkergift/stalkergift-tabs'
import { StalkerGiftCard } from '@/components/stalkergift/stalkergift-card'
import { StalkerGiftModal } from '@/components/stalkergift/stalkergift-modal'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { StalkerGiftDTO } from '@/types/api'
import { GiftIcon } from '@heroicons/react/24/outline'

type StalkerGiftTab = 'received' | 'sent' | 'chats'

export default function StalkerGiftPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [activeTab, setActiveTab] = useState<StalkerGiftTab>('chats')
  const [receivedGifts, setReceivedGifts] = useState<StalkerGiftDTO[]>([])
  const [sentGifts, setSentGifts] = useState<StalkerGiftDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all')

  // Cargar regalos recibidos
  const loadReceivedGifts = async () => {
    if (!isAuthenticated || !user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.get<StalkerGiftDTO[]>(
        API_ENDPOINTS.STALKER_GIFT.RECEIVED
      )

      if (response.success && response.data) {
        setReceivedGifts(response.data)
      } else {
        setError(response.error?.message || 'Error al cargar regalos recibidos')
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar regalos recibidos')
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar regalos enviados
  const loadSentGifts = async () => {
    if (!isAuthenticated || !user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.get<StalkerGiftDTO[]>(
        API_ENDPOINTS.STALKER_GIFT.SENT
      )

      if (response.success && response.data) {
        setSentGifts(response.data)
      } else {
        setError(response.error?.message || 'Error al cargar regalos enviados')
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar regalos enviados')
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadReceivedGifts()
      loadSentGifts()
    }
  }, [isAuthenticated, user?.id])

  // Cargar datos según tab activo
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    if (activeTab === 'received') {
      loadReceivedGifts()
    } else if (activeTab === 'sent') {
      loadSentGifts()
    }
    // Chats no necesita carga adicional por ahora
  }, [activeTab])

  // Filtrar regalos recibidos
  const filteredReceivedGifts = receivedGifts.filter((gift) => {
    if (filter === 'all') return true
    if (filter === 'pending') return gift.estado === 'WAITING_ACCEPTANCE' || gift.estado === 'PAID'
    if (filter === 'accepted') return gift.estado === 'ACCEPTED'
    if (filter === 'rejected') return gift.estado === 'REJECTED'
    return true
  })

  // Redirigir si no está autenticado
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Debes iniciar sesión para ver tus regalos</p>
          <Button
            onClick={() => router.push('/feed')}
            className="bg-[#66DEDB] hover:bg-[#5accc9] text-black"
          >
            Ir al inicio
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 pt-20 sm:pt-24 md:pt-28" style={{ backgroundColor: '#1E1E1E' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#66DEDB] mb-2">StalkerGift</h1>
            <p className="text-gray-400">Envía y recibe regalos anónimos</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#73FFA2] hover:bg-[#66DEDB] text-black font-semibold flex items-center gap-2"
          >
            <GiftIcon className="w-5 h-5" />
            Enviar StalkerGift
          </Button>
        </div>

        {/* Tabs */}
        <StalkerGiftTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Filtros (solo para recibidos) */}
        {activeTab === 'received' && (
          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-[#66DEDB] text-black font-semibold'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                filter === 'pending'
                  ? 'bg-[#66DEDB] text-black font-semibold'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                filter === 'accepted'
                  ? 'bg-[#66DEDB] text-black font-semibold'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Aceptados
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                filter === 'rejected'
                  ? 'bg-[#66DEDB] text-black font-semibold'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Rechazados
            </button>
          </div>
        )}

        {/* Contenido según tab activo */}
        <div className="mt-6">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
              <p className="text-gray-400">Cargando regalos...</p>
            </div>
          ) : (
            <>
              {activeTab === 'received' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredReceivedGifts.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <GiftIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No tienes regalos recibidos</p>
                    </div>
                  ) : (
                    filteredReceivedGifts.map((gift) => (
                      <StalkerGiftCard
                        key={gift.id}
                        gift={gift}
                        type="received"
                        onUpdate={() => loadReceivedGifts()}
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'sent' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sentGifts.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <GiftIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No has enviado ningún regalo</p>
                    </div>
                  ) : (
                    sentGifts.map((gift) => (
                      <StalkerGiftCard
                        key={gift.id}
                        gift={gift}
                        type="sent"
                        onUpdate={() => loadSentGifts()}
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'chats' && (
                <div className="text-center py-12">
                  <p className="text-gray-400">Los chats de StalkerGift aparecerán aquí</p>
                  <Button
                    onClick={() => router.push('/messages?type=stalkergift')}
                    className="mt-4 bg-[#66DEDB] hover:bg-[#5accc9] text-black"
                  >
                    Ver todos los chats
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de creación */}
      {showCreateModal && (
        <StalkerGiftModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadSentGifts()
          }}
        />
      )}
    </div>
  )
}

