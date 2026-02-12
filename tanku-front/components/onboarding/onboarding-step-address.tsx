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
  const { user, checkAuth } = useAuthStore()
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressDTO | null>(null)
  const [giftAddressIds, setGiftAddressIds] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)

  // Cargar direcciones al montar
  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  // Cargar direcciones que ya están marcadas como de regalos
  useEffect(() => {
    const giftIds = addresses.filter(addr => addr.isGiftAddress).map(addr => addr.id)
    setGiftAddressIds(new Set(giftIds))
  }, [addresses])

  const handleCreateAddress = () => {
    setEditingAddress(null)
    setIsFormModalOpen(true)
  }

  const handleFormSubmit = async (data: CreateAddressDTO | UpdateAddressDTO) => {
    try {
      let newAddress: AddressDTO | undefined
      const isGiftAddress = 'isGiftAddress' in data ? data.isGiftAddress : false
      
      if (editingAddress) {
        newAddress = await updateAddress(editingAddress.id, data as UpdateAddressDTO)
      } else {
        newAddress = await createAddress(data as CreateAddressDTO)
        
        // Si se marcó como dirección de regalos al crear, habilitar "Permitir recibir regalos"
        if (isGiftAddress) {
          await apiClient.put(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
            allowGiftShipping: true,
          })
          await checkAuth()
        }
      }
      
      setIsFormModalOpen(false)
      setEditingAddress(null)
      await fetchAddresses()
    } catch (error) {
      console.error('Error al guardar dirección:', error)
      throw error
    }
  }

  const handleToggleGiftAddress = async (addressId: string, isGift: boolean) => {
    setIsUpdating(true)
    try {
      // Actualizar la dirección
      await updateAddress(addressId, { isGiftAddress: isGift })
      
      // Actualizar estado local
      const newGiftIds = new Set(giftAddressIds)
      if (isGift) {
        newGiftIds.add(addressId)
      } else {
        newGiftIds.delete(addressId)
      }
      setGiftAddressIds(newGiftIds)

      // Si se marca como dirección de regalos, habilitar "Permitir recibir regalos" en el perfil
      if (isGift) {
        await apiClient.put(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
          allowGiftShipping: true,
        })
        await checkAuth()
      }

      await fetchAddresses()
    } catch (error) {
      console.error('Error actualizando dirección:', error)
    } finally {
      setIsUpdating(false)
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
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-[#66DEDB]">
          📦 ¿Dónde quieres recibir regalos?
        </h2>
        <p className="text-sm text-gray-400">
          Configura una dirección para que tus amigos puedan enviarte regalos. Nadie más tendrá acceso a estos datos.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
          <span className="ml-2 text-white">Cargando direcciones...</span>
        </div>
      ) : addresses.length === 0 ? (
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-400">
            <p className="mb-4">No tienes direcciones guardadas</p>
            <p className="text-sm mb-6">Agrega una dirección para recibir regalos de tus amigos</p>
          </div>
          <button
            onClick={handleCreateAddress}
            className="w-full px-4 py-3 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 rounded-lg font-semibold text-sm hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all"
          >
            + Agregar Dirección
          </button>
          <button
            onClick={onSkip}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Omitir por ahora
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Lista de direcciones */}
          <div className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="p-4 border border-gray-700 rounded-lg bg-gray-800/30 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-white">
                        {getAddressAlias(address)}
                      </p>
                      {address.isDefaultShipping && (
                        <span className="text-xs bg-[#66DEDB]/20 text-[#66DEDB] px-2 py-0.5 rounded">
                          Por defecto
                        </span>
                      )}
                      {address.isGiftAddress && (
                        <span className="text-xs bg-[#73FFA2]/20 text-[#73FFA2] px-2 py-0.5 rounded">
                          Dirección de regalos
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-tight">{formatAddress(address)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {address.postalCode} • {address.phone || 'Sin teléfono'}
                    </p>
                  </div>
                </div>

                {/* Checkbox para usar como dirección de regalos */}
                <div className="flex items-start gap-2 pt-2 border-t border-gray-700">
                  <input
                    type="checkbox"
                    id={`gift-${address.id}`}
                    checked={address.isGiftAddress || false}
                    onChange={(e) => handleToggleGiftAddress(address.id, e.target.checked)}
                    disabled={isUpdating}
                    className="mt-1 w-4 h-4 text-[#73FFA2] focus:ring-[#73FFA2] rounded disabled:opacity-50"
                  />
                  <label htmlFor={`gift-${address.id}`} className="text-sm text-gray-300 cursor-pointer flex-1">
                    Usar esta dirección para recibir regalos
                    <span className="block text-xs text-gray-400 mt-0.5">
                      Nadie más tendrá acceso a estos datos
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreateAddress}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + Agregar otra dirección
            </button>
            <button
              onClick={onComplete}
              className="flex-1 px-4 py-2 bg-[#73FFA2] hover:bg-[#66DEDB] text-gray-900 rounded-lg text-sm font-semibold transition-colors"
            >
              Continuar
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
      />
    </div>
  )
}
