'use client'

import { useState, useEffect } from 'react'
import { useAddresses } from '@/lib/hooks/use-addresses'
import { AddressSelector } from '@/components/addresses/address-selector'
import { AddressFormModal } from '@/components/addresses/address-form-modal'
import type { AddressDTO, CreateAddressDTO, UpdateAddressDTO } from '@/types/api'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth-store'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'

interface AddressesSectionProps {
  onUpdate?: () => void
  design?: 'default' | 'settings'
}

export function AddressesSection({ onUpdate, design = 'default' }: AddressesSectionProps) {
  const isSettings = design === 'settings'
  const { addresses, isLoading, fetchAddresses, createAddress, updateAddress, deleteAddress } = useAddresses()
  const { user } = useAuthStore()
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressDTO | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [useMainAddressForGifts, setUseMainAddressForGifts] = useState(false)

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  // Cargar preferencias de regalos del perfil
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return
      try {
        const response = await apiClient.get<import('@/types/api-responses').UserProfileResponse>(API_ENDPOINTS.USERS.PROFILE.GET)
        if (response.success && response.data) {
          setUseMainAddressForGifts(response.data.useMainAddressForGifts ?? false)
        }
      } catch (error) {
        console.error('Error cargando perfil:', error)
      }
    }
    loadProfile()
  }, [user?.id])

  const handleCreateAddress = () => {
    setEditingAddress(null)
    setIsFormModalOpen(true)
  }

  const handleEditAddress = (address: AddressDTO) => {
    setEditingAddress(address)
    setIsFormModalOpen(true)
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (confirm('¿Estás seguro de eliminar esta dirección?')) {
      try {
        await deleteAddress(addressId)
        if (onUpdate) {
          onUpdate()
        }
      } catch (error) {
        console.error('Error al eliminar dirección:', error)
      }
    }
  }

  const handleFormSubmit = async (data: CreateAddressDTO | UpdateAddressDTO) => {
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, data as UpdateAddressDTO)
      } else {
        await createAddress(data as CreateAddressDTO)
      }
      setIsFormModalOpen(false)
      setEditingAddress(null)
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error al guardar dirección:', error)
      throw error
    }
  }

  const shellClass = isSettings
    ? 'space-y-3 rounded-xl border border-[#73FFA2]/40 bg-[#0a0a0a] p-3 sm:p-4'
    : 'space-y-4 rounded-lg border-2 border-[#73FFA2] bg-transparent p-4 transition-colors hover:border-[#66DEDB]'

  return (
    <div className={shellClass}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={isSettings ? 'text-base font-semibold text-[#73FFA2]' : 'text-lg font-semibold text-[#73FFA2]'}>
            Mis direcciones
          </h3>
          {isSettings && (
            <p className="text-xs text-gray-500">Gestiona envíos y regalos</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleCreateAddress}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] px-3 py-2 text-sm font-medium text-gray-900 transition-all hover:from-[#73FFA2] hover:to-[#66DEDB] sm:px-4"
        >
          <PlusIcon className="w-5 h-5" />
          Agregar Dirección
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
          <span className="ml-2 text-white">Cargando direcciones...</span>
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No tienes direcciones guardadas</p>
          <p className="text-sm mt-2">Haz clic en "Agregar Dirección" para agregar una nueva</p>
        </div>
      ) : isSettings ? (
        <div className="rounded-xl bg-[#141414] p-2 sm:p-3">
          <AddressSelector
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelectAddress={(address) => setSelectedAddressId(address?.id || null)}
            onEdit={handleEditAddress}
            onDelete={handleDeleteAddress}
            useMainAddressForGifts={useMainAddressForGifts}
          />
        </div>
      ) : (
        <AddressSelector
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          onSelectAddress={(address) => setSelectedAddressId(address?.id || null)}
          onEdit={handleEditAddress}
          onDelete={handleDeleteAddress}
          useMainAddressForGifts={useMainAddressForGifts}
        />
      )}

      <AddressFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingAddress(null)
        }}
        address={editingAddress}
        onSubmit={handleFormSubmit}
        useMainAddressForGiftsFromProfile={useMainAddressForGifts}
      />
    </div>
  )
}

