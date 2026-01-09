'use client'

import { useState, useEffect } from 'react'
import type { AddressDTO, CreateAddressDTO, UpdateAddressDTO } from '@/types/api'
import { Button } from '@/components/ui/button'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface AddressFormModalProps {
  isOpen: boolean
  onClose: () => void
  address?: AddressDTO | null // Si se proporciona, es edición
  onSubmit: (data: CreateAddressDTO | UpdateAddressDTO) => Promise<void>
}

export function AddressFormModal({
  isOpen,
  onClose,
  address,
  onSubmit,
}: AddressFormModalProps) {
  const [formData, setFormData] = useState({
    alias: '',
    firstName: '',
    lastName: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'CO',
    isDefaultShipping: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos si es edición
  useEffect(() => {
    if (address) {
      setFormData({
        alias: address.metadata?.alias || '',
        firstName: address.firstName,
        lastName: address.lastName,
        phone: address.phone || '',
        address1: address.address1,
        address2: address.address2 || '',
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isDefaultShipping: address.isDefaultShipping,
      })
    } else {
      // Resetear formulario para nueva dirección
      setFormData({
        alias: '',
        firstName: '',
        lastName: '',
        phone: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'CO',
        isDefaultShipping: false,
      })
    }
    setError(null)
  }, [address, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validaciones
    if (!formData.firstName || !formData.lastName || !formData.address1 || 
        !formData.city || !formData.state || !formData.postalCode) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    setIsSubmitting(true)

    try {
      const submitData: CreateAddressDTO | UpdateAddressDTO = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        address1: formData.address1,
        address2: formData.address2 || undefined,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
        isDefaultShipping: formData.isDefaultShipping,
        metadata: formData.alias ? { alias: formData.alias } : undefined,
      }

      await onSubmit(submitData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al guardar la dirección')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-[#66DEDB]">
            {address ? 'Editar dirección' : 'Crear nueva dirección'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Alias */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Alias (opcional)
            </label>
            <input
              type="text"
              value={formData.alias}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
              placeholder="Ej: Casa, Oficina, etc."
            />
            <p className="text-xs text-gray-400 mt-1">
              Un nombre para identificar esta dirección fácilmente
            </p>
          </div>

          {/* Nombre y Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
                placeholder="Juan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Apellido *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
                placeholder="Pérez"
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dirección *
            </label>
            <input
              type="text"
              value={formData.address1}
              onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
              required
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
              placeholder="Calle 123 #45-67"
            />
          </div>

          {/* Detalle de dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Detalle adicional (opcional)
            </label>
            <input
              type="text"
              value={formData.address2}
              onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
              placeholder="Apartamento, piso, etc."
            />
          </div>

          {/* Ciudad y Departamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ciudad *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
                placeholder="Bogotá"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Departamento *
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
                placeholder="Cundinamarca"
              />
            </div>
          </div>

          {/* Código postal y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Código postal *
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
                placeholder="110111"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
                placeholder="3001234567"
              />
            </div>
          </div>

          {/* Por defecto */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefaultShipping"
              checked={formData.isDefaultShipping}
              onChange={(e) => setFormData({ ...formData, isDefaultShipping: e.target.checked })}
              className="w-4 h-4 text-[#66DEDB] focus:ring-[#66DEDB] focus:ring-2 rounded"
            />
            <label htmlFor="isDefaultShipping" className="text-sm text-gray-300">
              Usar como dirección de envío por defecto
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold"
            >
              {isSubmitting ? 'Guardando...' : address ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

