'use client'

import { useState } from 'react'
import type { AddressDTO } from '@/types/api'
import { Button } from '@/components/ui/button'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface AddressCardProps {
  address: AddressDTO
  onEdit: (address: AddressDTO) => void
  onDelete: (addressId: string) => void
  isDeleting?: boolean
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  isDeleting = false,
}: AddressCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const getAddressAlias = () => {
    return address.metadata?.alias || `${address.firstName} ${address.lastName}`
  }

  const formatAddress = () => {
    return `${address.address1}${address.address2 ? `, ${address.address2}` : ''}, ${address.city}, ${address.state}`
  }

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(address.id)
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
      // Auto-cancelar después de 3 segundos
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white">{getAddressAlias()}</h3>
            {address.isDefaultShipping && (
              <span className="text-xs bg-[#66DEDB]/20 text-[#66DEDB] px-2 py-1 rounded">
                Por defecto
              </span>
            )}
          </div>
          <p className="text-sm text-gray-300 mb-1">{formatAddress()}</p>
          <p className="text-xs text-gray-400">
            {address.postalCode} • {address.phone || 'Sin teléfono'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(address)}
            className="p-2 text-gray-400 hover:text-[#66DEDB] transition-colors"
            title="Editar"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`p-2 transition-colors ${
              confirmDelete
                ? 'text-red-400 hover:text-red-300'
                : 'text-gray-400 hover:text-red-400'
            }`}
            title={confirmDelete ? 'Confirmar eliminación' : 'Eliminar'}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      {confirmDelete && (
        <div className="mt-2 p-2 bg-red-900/20 border border-red-700 rounded text-sm text-red-300">
          ¿Eliminar esta dirección? Haz clic nuevamente para confirmar
        </div>
      )}
    </div>
  )
}

