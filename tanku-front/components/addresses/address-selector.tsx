'use client'

import { useState, useRef, useEffect } from 'react'
import type { AddressDTO } from '@/types/api'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface AddressSelectorProps {
  addresses: AddressDTO[]
  isLoading?: boolean
  selectedAddressId: string | null
  onSelectAddress: (address: AddressDTO | null) => void
  onEdit: (address: AddressDTO) => void
  onDelete: (addressId: string) => void
  useMainAddressForGifts?: boolean // Si el usuario usa su dirección principal para regalos
}

export function AddressSelector({
  addresses,
  isLoading = false,
  selectedAddressId,
  onSelectAddress,
  onEdit,
  onDelete,
  useMainAddressForGifts = false,
}: AddressSelectorProps) {
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const confirmRef = useRef<HTMLDivElement>(null)

  const getAddressAlias = (address: AddressDTO) => {
    return address.metadata?.alias || `${address.firstName} ${address.lastName}`
  }

  const formatAddress = (address: AddressDTO) => {
    return `${address.address1}${address.address2 ? `, ${address.address2}` : ''}, ${address.city}, ${address.state}`
  }

  // Cerrar confirmación al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (confirmRef.current && !confirmRef.current.contains(event.target as Node)) {
        setConfirmingDelete(null)
      }
    }

    if (confirmingDelete) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [confirmingDelete])

  if (isLoading) {
    return (
      <div className="text-center text-gray-400 py-4 text-sm">Cargando...</div>
    )
  }

  if (addresses.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-400">No tienes direcciones guardadas</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {addresses.map((address) => (
        <div
          key={address.id}
          className={`
            flex items-start gap-2 p-3 rounded border cursor-pointer transition-colors
            ${
              selectedAddressId === address.id
                ? 'border-[#66DEDB] bg-[#66DEDB]/5'
                : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
            }
          `}
          onClick={() => onSelectAddress(address)}
        >
          <input
            type="radio"
            name="address"
            value={address.id}
            checked={selectedAddressId === address.id}
            onChange={() => onSelectAddress(address)}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 w-3.5 h-3.5 text-[#66DEDB] focus:ring-[#66DEDB] focus:ring-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="text-sm font-medium text-white truncate">
                {getAddressAlias(address)}
              </p>
              {address.isDefaultShipping && (
                <span className="text-xs bg-[#66DEDB]/20 text-[#66DEDB] px-1.5 py-0.5 rounded flex-shrink-0">
                  Por defecto
                </span>
              )}
              {(address.isGiftAddress || (useMainAddressForGifts && address.isDefaultShipping)) && (
                <span className="text-xs bg-[#73FFA2]/20 text-[#73FFA2] px-1.5 py-0.5 rounded flex-shrink-0">
                  Dirección de regalos
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 leading-tight">{formatAddress(address)}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {address.postalCode} • {address.phone || 'Sin teléfono'}
            </p>
          </div>
          <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onEdit(address)
              }}
              className="p-1.5 text-gray-400 hover:text-[#66DEDB] transition-colors"
              title="Editar"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setConfirmingDelete(confirmingDelete === address.id ? null : address.id)
                }}
                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                title="Eliminar"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
              
              {confirmingDelete === address.id && (
                <div
                  ref={confirmRef}
                  className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 min-w-[140px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs text-gray-300 mb-2 text-center">¿Eliminar?</p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onDelete(address.id)
                        setConfirmingDelete(null)
                      }}
                      className="flex-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setConfirmingDelete(null)
                      }}
                      className="flex-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                    >
                      No
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

