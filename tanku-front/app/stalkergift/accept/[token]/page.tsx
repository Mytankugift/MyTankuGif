'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAddresses } from '@/lib/hooks/use-addresses'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { AddressFormModal } from '@/components/addresses/address-form-modal'
import { AddressSelector } from '@/components/addresses/address-selector'
import { Button } from '@/components/ui/button'
import type { StalkerGiftDTO, AddressDTO, CreateAddressDTO } from '@/types/api'
import { GiftIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function StalkerGiftAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const { addresses, createAddress, updateAddress, deleteAddress, fetchAddresses, isLoading: addressesLoading } = useAddresses()

  const [stalkerGift, setStalkerGift] = useState<StalkerGiftDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canComplete, setCanComplete] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<AddressDTO | null>(null)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressDTO | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)

  // Cargar regalo por token (público)
  useEffect(() => {
    const loadStalkerGift = async () => {
      if (!token) {
        setError('Token no válido')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await apiClient.get<StalkerGiftDTO>(
          API_ENDPOINTS.STALKER_GIFT.BY_TOKEN(token)
        )

        if (response.success && response.data) {
          setStalkerGift(response.data)
        } else {
          setError(response.error?.message || 'Regalo no encontrado')
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar el regalo')
      } finally {
        setIsLoading(false)
      }
    }

    loadStalkerGift()
  }, [token])

  // Verificar si puede completar aceptación
  const checkCanComplete = useCallback(async () => {
    if (!stalkerGift || !isAuthenticated) return

    try {
      const response = await apiClient.get<{
        canComplete: boolean
        hasAddress: boolean
        addresses: AddressDTO[]
        stalkerGift: StalkerGiftDTO
        reason?: string
      }>(API_ENDPOINTS.STALKER_GIFT.CAN_COMPLETE_ACCEPTANCE(stalkerGift.id))

      if (response.success && response.data) {
        setCanComplete(response.data.canComplete)
        
        // Si tiene direcciones, seleccionar la primera o la por defecto
        if (response.data.addresses.length > 0) {
          const defaultAddress = response.data.addresses.find(addr => addr.isDefaultShipping) 
            || response.data.addresses[0]
          setSelectedAddress(defaultAddress)
        } else {
          setSelectedAddress(null)
        }
      }
    } catch (err: any) {
      console.error('Error verificando aceptación:', err)
      setCanComplete(false)
    }
  }, [stalkerGift, isAuthenticated])

  // Verificar autenticación y cargar direcciones si está autenticado
  useEffect(() => {
    if (isAuthenticated && stalkerGift) {
      checkAuth()
        .then(() => {
          fetchAddresses()
          checkCanComplete()
        })
        .catch(() => {
          // Error de autenticación, ignorar
        })
    }
  }, [isAuthenticated, stalkerGift, checkAuth, fetchAddresses, checkCanComplete])

  // Manejar click en "Aceptar regalo"
  const handleAcceptClick = () => {
    if (!isAuthenticated) {
      // Guardar URL actual para redirigir después del login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirect-after-login', `/stalkergift/accept/${token}`)
      }
      
      // Redirigir a OAuth con return_url
      const returnUrl = encodeURIComponent(`/stalkergift/accept/${token}`)
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/v1/auth/google?return_url=${returnUrl}`
      return
    }

    // Si está autenticado pero no tiene dirección, mostrar formulario
    if (!canComplete) {
      setIsAddressModalOpen(true)
      return
    }

    // Si tiene dirección, proceder con aceptación
    if (selectedAddress) {
      handleAcceptGift(selectedAddress.id)
    }
  }

  // Aceptar regalo
  const handleAcceptGift = async (addressId: string) => {
    if (!stalkerGift) return

    try {
      setIsAccepting(true)
      setError(null)

      const response = await apiClient.post<StalkerGiftDTO>(
        API_ENDPOINTS.STALKER_GIFT.ACCEPT(stalkerGift.id),
        { addressId }
      )

      if (response.success && response.data) {
        setIsAccepted(true)
        setStalkerGift(response.data)
        
        // Redirigir al chat después de 2 segundos
        setTimeout(() => {
          if (response.data.conversationId) {
            router.push(`/messages?conversation=${response.data.conversationId}`)
          } else {
            router.push('/feed')
          }
        }, 2000)
      } else {
        setError(response.error?.message || 'Error al aceptar el regalo')
      }
    } catch (err: any) {
      setError(err.message || 'Error al aceptar el regalo')
    } finally {
      setIsAccepting(false)
    }
  }

  // Rechazar regalo
  const handleRejectGift = async () => {
    if (!stalkerGift || !isAuthenticated) return

    if (!confirm('¿Estás seguro de que quieres rechazar este regalo?')) {
      return
    }

    try {
      setIsAccepting(true)
      setError(null)

      const response = await apiClient.post<StalkerGiftDTO>(
        API_ENDPOINTS.STALKER_GIFT.REJECT(stalkerGift.id)
      )

      if (response.success) {
        router.push('/feed')
      } else {
        setError(response.error?.message || 'Error al rechazar el regalo')
      }
    } catch (err: any) {
      setError(err.message || 'Error al rechazar el regalo')
    } finally {
      setIsAccepting(false)
    }
  }

  // Crear dirección
  const handleCreateAddress = async (data: CreateAddressDTO) => {
    try {
      const newAddress = await createAddress(data)
      setSelectedAddress(newAddress)
      setIsAddressModalOpen(false)
      await checkCanComplete()
    } catch (err: any) {
      throw err
    }
  }

  // Actualizar dirección
  const handleUpdateAddress = async (data: CreateAddressDTO) => {
    if (!editingAddress) return

    try {
      await updateAddress(editingAddress.id, data)
      setIsAddressModalOpen(false)
      setEditingAddress(null)
      await fetchAddresses()
      await checkCanComplete()
    } catch (err: any) {
      throw err
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
          <p className="text-white">Cargando regalo...</p>
        </div>
      </div>
    )
  }

  if (error && !stalkerGift) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
          <XMarkIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Regalo no encontrado</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button onClick={() => router.push('/feed')} className="bg-[#66DEDB] hover:bg-[#5accc9] text-black">
            Ir al inicio
          </Button>
        </div>
      </div>
    )
  }

  if (!stalkerGift) return null

  // Si ya fue aceptado
  if (stalkerGift.estado === 'ACCEPTED' || isAccepted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
          <CheckCircleIcon className="w-16 h-16 text-[#73FFA2] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">¡Regalo aceptado!</h1>
          <p className="text-gray-400 mb-6">
            Tu regalo ha sido aceptado. Serás redirigido al chat en breve...
          </p>
        </div>
      </div>
    )
  }

  // Validar estado
  if (stalkerGift.estado !== 'WAITING_ACCEPTANCE' && stalkerGift.estado !== 'PAID') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
          <XMarkIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Regalo no disponible</h1>
          <p className="text-gray-400 mb-6">
            Este regalo no está disponible para aceptación en este momento.
          </p>
          <Button onClick={() => router.push('/feed')} className="bg-[#66DEDB] hover:bg-[#5accc9] text-black">
            Ir al inicio
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <GiftIcon className="w-20 h-20 text-[#73FFA2] mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">¡Tienes un regalo!</h1>
          <p className="text-gray-400">
            {stalkerGift.senderAlias} te ha enviado un regalo
          </p>
        </div>

        {/* Producto */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex gap-6">
            {stalkerGift.product?.images && stalkerGift.product.images.length > 0 && (
              <img
                src={stalkerGift.product.images[0]}
                alt={stalkerGift.product.title}
                className="w-32 h-32 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">
                {stalkerGift.product?.title || 'Producto'}
              </h2>
              {stalkerGift.variant && (
                <p className="text-gray-400 mb-2">Variante: {stalkerGift.variant.title}</p>
              )}
              <p className="text-gray-400">Cantidad: {stalkerGift.quantity}</p>
            </div>
          </div>
        </div>

        {/* Mensaje del sender */}
        {stalkerGift.senderMessage && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Mensaje de {stalkerGift.senderAlias}</h3>
            <p className="text-gray-300">{stalkerGift.senderMessage}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6 text-red-200">
            {error}
          </div>
        )}

        {/* Si está autenticado pero no tiene dirección */}
        {isAuthenticated && !canComplete && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Necesitas una dirección</h3>
            <p className="text-gray-400 mb-4">
              Para aceptar el regalo, necesitas crear una dirección de envío.
            </p>
            <Button
              onClick={() => setIsAddressModalOpen(true)}
              className="bg-[#66DEDB] hover:bg-[#5accc9] text-black"
            >
              Crear dirección
            </Button>
          </div>
        )}

        {/* Si está autenticado y tiene direcciones */}
        {isAuthenticated && canComplete && addresses.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Selecciona una dirección</h3>
            <AddressSelector
              addresses={addresses}
              isLoading={addressesLoading}
              selectedAddressId={selectedAddress?.id || null}
              onSelectAddress={setSelectedAddress}
              onEdit={(addr) => {
                setEditingAddress(addr)
                setIsAddressModalOpen(true)
              }}
              onDelete={deleteAddress}
            />
            <Button
              onClick={() => setIsAddressModalOpen(true)}
              variant="secondary"
              className="mt-4 w-full"
            >
              Crear nueva dirección
            </Button>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-4">
          <Button
            onClick={handleRejectGift}
            variant="secondary"
            disabled={!isAuthenticated || isAccepting}
            className="flex-1"
          >
            Rechazar
          </Button>
          <Button
            onClick={handleAcceptClick}
            disabled={isAccepting || (isAuthenticated && canComplete && !selectedAddress)}
            className="flex-1 bg-[#73FFA2] hover:bg-[#66DEDB] text-black font-semibold"
          >
            {isAccepting
              ? 'Aceptando...'
              : !isAuthenticated
              ? 'Iniciar sesión para aceptar'
              : !canComplete
              ? 'Crear dirección primero'
              : 'Aceptar regalo'}
          </Button>
        </div>

        {/* Modal de dirección */}
        <AddressFormModal
          isOpen={isAddressModalOpen}
          onClose={() => {
            setIsAddressModalOpen(false)
            setEditingAddress(null)
          }}
          address={editingAddress}
          onSubmit={editingAddress ? handleUpdateAddress : handleCreateAddress}
        />
      </div>
    </div>
  )
}

