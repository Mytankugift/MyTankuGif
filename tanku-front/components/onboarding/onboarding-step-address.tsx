/**
 * Paso 5: Dirección opcional para recibir regalos
 * Muestra direcciones existentes o permite crear una nueva
 */

'use client'

import { useState, useEffect } from 'react'
import { useAddresses } from '@/lib/hooks/use-addresses'
import { AddressFormModal } from '@/components/addresses/address-form-modal'
import type { AddressDTO, CreateAddressDTO, UpdateAddressDTO } from '@/types/api'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

interface OnboardingStepAddressProps {
  onSkip: () => void
  onComplete: () => void
}

export function OnboardingStepAddress({ onSkip, onComplete }: OnboardingStepAddressProps) {
  const { addresses, isLoading, fetchAddresses, createAddress, updateAddress } = useAddresses()
  const { checkAuth } = useAuthStore()
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressDTO | null>(null)

  // Cargar direcciones al montar
  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  const handleCreateAddress = () => {
    setEditingAddress(null)
    setIsFormModalOpen(true)
  }

  const handleFormSubmit = async (data: CreateAddressDTO | UpdateAddressDTO) => {
    try {
      const isNewAddress = !editingAddress
      const isFirstAddress = addresses.length === 0
      
      // Preparar datos de la dirección
      const addressData = {
        ...data,
        isGiftAddress: true, // Siempre true en onboarding
        isDefaultShipping: isFirstAddress || data.isDefaultShipping, // Primera dirección es default
      }
      
      let newAddress: AddressDTO | undefined
      if (editingAddress) {
        newAddress = await updateAddress(editingAddress.id, addressData as UpdateAddressDTO)
      } else {
        newAddress = await createAddress(addressData as CreateAddressDTO)
        
        // Si es nueva dirección, activar preferencias de regalos automáticamente
        await apiClient.put(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
          allowGiftShipping: true,
          useMainAddressForGifts: true,
        })
        // ✅ NO llamar checkAuth aquí para evitar que se cierre el modal
        // await checkAuth()
      }
      
      setIsFormModalOpen(false)
      setEditingAddress(null)
      await fetchAddresses()
      
      // ✅ NO llamar onComplete automáticamente - dejar que el usuario decida
      // El usuario puede agregar más direcciones o hacer clic en "Finalizar"
    } catch (error) {
      console.error('Error al guardar dirección:', error)
      throw error
    }
  }

  const formatAddress = (address: AddressDTO) => {
    return `${address.address1}${address.address2 ? `, ${address.address2}` : ''}, ${address.city}, ${address.state}`
  }

  const getAddressAlias = (address: AddressDTO) => {
    return address.metadata?.alias || `${address.firstName} ${address.lastName}`
  }

  return (
    <div className="space-y-4">
      <div className="pt-4">
        <h2 className="text-xl font-semibold mb-4" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
          📦 ¿Dónde quieres recibir regalos?
        </h2>
        <p className="text-base" style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}>
          Configura una dirección para que tus amigos puedan enviarte regalos. Nadie más tendrá acceso a estos datos.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
          <span className="ml-2 text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Cargando direcciones...</span>
        </div>
      ) : addresses.length === 0 ? (
        <div className="space-y-4">
          <div className="text-center py-8" style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}>
            <p className="mb-4">No tienes direcciones guardadas</p>
            <p className="text-sm mb-6">Agrega una dirección para recibir regalos de tus amigos</p>
          </div>
          <button
            onClick={handleCreateAddress}
            className="w-full px-4 py-3 font-semibold text-sm transition-all"
            style={{
              backgroundColor: '#73FFA2',
              color: '#262626',
              borderRadius: '25px',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            + Agregar Dirección
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Título Direcciones */}
          <h3 className="text-lg font-semibold" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
            Direcciones
          </h3>

          {/* Lista de direcciones */}
          <div className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="p-4 space-y-2"
                style={{
                  backgroundColor: 'rgba(217, 217, 217, 0.2)',
                  border: '1px solid #4A4A4A',
                  borderRadius: '25px',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="text-sm font-medium" style={{ color: '#ffffff', fontFamily: 'Poppins, sans-serif' }}>
                        {getAddressAlias(address)}
                      </p>
                      {address.isDefaultShipping && (
                        <span 
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: '#73FFA2',
                            color: '#262626',
                            fontFamily: 'Poppins, sans-serif',
                          }}
                        >
                          Por defecto
                        </span>
                      )}
                      {address.isGiftAddress && (
                        <span 
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: '#66DEDB',
                            color: '#262626',
                            fontFamily: 'Poppins, sans-serif',
                          }}
                        >
                          Dirección de regalos
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-tight mb-1" style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}>
                      {formatAddress(address)}
                    </p>
                    <p className="text-xs" style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}>
                      {address.postalCode} • {address.phone || 'Sin teléfono'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botón Agregar Dirección */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleCreateAddress}
              className="w-full px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                backgroundColor: '#73FFA2',
                color: '#262626',
                borderRadius: '25px',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              + Agregar Dirección
            </button>
          </div>
        </div>
      )}

      {/* Modal de formulario de dirección */}
      <AddressFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingAddress(null)
        }}
        address={editingAddress}
        onSubmit={handleFormSubmit}
        defaultGiftAddress={true}
      />
    </div>
  )
}
