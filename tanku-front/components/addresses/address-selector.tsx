'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { AddressDTO } from '@/types/api'
import { PencilIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface AddressSelectorProps {
  addresses: AddressDTO[]
  isLoading?: boolean
  selectedAddressId: string | null
  onSelectAddress: (address: AddressDTO | null) => void
  onEdit: (address: AddressDTO) => void
  onDelete: (addressId: string) => void
  useMainAddressForGifts?: boolean // Si el usuario usa su dirección principal para regalos
  /** Superficies translúcidas alineadas con checkout Tanku (gift-direct / carrito) */
  variant?: 'default' | 'tanku'
}

export function AddressSelector({
  addresses,
  isLoading = false,
  selectedAddressId,
  onSelectAddress,
  onEdit,
  onDelete,
  useMainAddressForGifts = false,
  variant = 'default',
}: AddressSelectorProps) {
  const isTanku = variant === 'tanku'
  const [mounted, setMounted] = useState(false)
  const [addressToDelete, setAddressToDelete] = useState<AddressDTO | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getAddressAlias = (address: AddressDTO) => {
    return address.metadata?.alias || `${address.firstName} ${address.lastName}`
  }

  const formatAddress = (address: AddressDTO) => {
    return `${address.address1}${address.address2 ? `, ${address.address2}` : ''}, ${address.city}, ${address.state}`
  }

  const handleConfirmDelete = async () => {
    if (!addressToDelete) return
    setIsDeleting(true)
    try {
      await Promise.resolve(onDelete(addressToDelete.id))
      setAddressToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const deleteModal =
    mounted && addressToDelete
      ? createPortal(
          <div
            className="fixed inset-0 z-[2100000] flex items-center justify-center p-4"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
              onClick={() => !isDeleting && setAddressToDelete(null)}
              aria-label="Cerrar"
            />
            <div
              className="relative z-10 w-full max-w-md overflow-hidden rounded-[25px] border border-[#73FFA2]/50 bg-[#1a1a1a] shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-address-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-white/10 p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-amber-400" aria-hidden />
                  <div className="min-w-0">
                    <h2 id="delete-address-title" className="text-base font-semibold text-white">
                      Eliminar dirección
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                      Esta acción no se puede deshacer. ¿Quieres eliminar esta dirección?
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <p className="text-sm font-medium text-[#73FFA2]">{getAddressAlias(addressToDelete)}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{formatAddress(addressToDelete)}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-4">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setAddressToDelete(null)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                >
                  {isDeleting ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

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
    <>
      {deleteModal}
      <div className="space-y-2">
        {addresses.map((address) => (
          <div
            key={address.id}
            className={`
            flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition-colors
            ${
              isTanku
                ? selectedAddressId === address.id
                  ? 'border-[#66DEDB] bg-[#66DEDB]/10 ring-1 ring-inset ring-[#66DEDB]/15 backdrop-blur-sm'
                  : 'border-white/[0.08] bg-white/[0.04] ring-1 ring-inset ring-white/[0.04] backdrop-blur-sm hover:border-[#66DEDB]/30'
                : selectedAddressId === address.id
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
                <p className="text-sm font-medium text-white truncate">{getAddressAlias(address)}</p>
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
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setAddressToDelete(address)
                }}
                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                title="Eliminar"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
