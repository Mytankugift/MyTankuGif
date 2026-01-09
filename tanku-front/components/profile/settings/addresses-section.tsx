'use client'

import { useState, useEffect } from 'react'
import { useAddresses } from '@/lib/hooks/use-addresses'
import { AddressSelector } from '@/components/addresses/address-selector'
import { AddressFormModal } from '@/components/addresses/address-form-modal'
import type { AddressDTO, CreateAddressDTO, UpdateAddressDTO } from '@/types/api'
import { PlusIcon } from '@heroicons/react/24/outline'

interface AddressesSectionProps {
  onUpdate?: () => void
}

export function AddressesSection({ onUpdate }: AddressesSectionProps) {
  const { addresses, isLoading, fetchAddresses, createAddress, updateAddress, deleteAddress } = useAddresses()
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressDTO | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

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

  return (
    <div className="bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#73FFA2]">Direcciones</h3>
        <button
          onClick={handleCreateAddress}
          className="flex items-center gap-2 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 px-4 py-2 rounded-lg font-medium text-sm hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all"
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
      ) : (
        <AddressSelector
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          onSelectAddress={(address) => setSelectedAddressId(address?.id || null)}
          onEdit={handleEditAddress}
          onDelete={handleDeleteAddress}
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
      />
    </div>
  )
}

