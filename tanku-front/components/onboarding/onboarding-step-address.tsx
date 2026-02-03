/**
 * Paso 5: Dirección opcional para recibir regalos
 */

'use client'

import { useState, useEffect } from 'react'
import type { CreateAddressDTO } from '@/types/api'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

interface Department {
  id: number
  name: string
  department_code?: string | null
}

interface City {
  id: number
  name: string
  department_id?: number
}

interface OnboardingStepAddressProps {
  onSkip: () => void
  onComplete: (addressData?: CreateAddressDTO, preferences?: { allowGiftShipping: boolean; useMainAddressForGifts: boolean }) => void
}

export function OnboardingStepAddress({ onSkip, onComplete }: OnboardingStepAddressProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'CO',
  })
  const [allowGiftShipping, setAllowGiftShipping] = useState(false)
  const [useMainAddressForGifts, setUseMainAddressForGifts] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cargar departamentos al montar
  useEffect(() => {
    loadDepartments()
  }, [])

  // Cargar ciudades cuando se selecciona un departamento
  useEffect(() => {
    if (selectedDepartmentId) {
      loadCities(selectedDepartmentId)
    } else {
      setCities([])
      setFormData(prev => ({ ...prev, city: '' }))
    }
  }, [selectedDepartmentId])

  const loadDepartments = async () => {
    setLoadingDepartments(true)
    try {
      const response = await apiClient.get<Department[]>(
        API_ENDPOINTS.DROPI.DEPARTMENTS
      )
      if (response.success && response.data) {
        setDepartments(response.data)
      }
    } catch (error) {
      console.error('Error cargando departamentos:', error)
    } finally {
      setLoadingDepartments(false)
    }
  }

  const loadCities = async (departmentId: number) => {
    setLoadingCities(true)
    try {
      const response = await apiClient.get<{ success: boolean; data: City[] | { cities?: City[] } }>(
        `${API_ENDPOINTS.DROPI.CITIES}?department_id=${departmentId}`
      )
      if (response.success && response.data) {
        let citiesArray: City[] = []
        if (Array.isArray(response.data)) {
          citiesArray = response.data
        } else if (typeof response.data === 'object' && (response.data as any).cities) {
          citiesArray = (response.data as any).cities || []
        }
        setCities(citiesArray)
      }
    } catch (error) {
      console.error('Error cargando ciudades:', error)
      setCities([])
    } finally {
      setLoadingCities(false)
    }
  }

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const departmentId = e.target.value ? parseInt(e.target.value) : null
    setSelectedDepartmentId(departmentId)
    const department = departments.find(d => d.id === departmentId)
    if (department) {
      setFormData({ ...formData, state: department.name, city: '' })
    } else {
      setFormData({ ...formData, state: '', city: '' })
    }
  }

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, city: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const addressData: CreateAddressDTO = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        address1: formData.address1,
        address2: formData.address2 || undefined,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
        isDefaultShipping: false,
        isGiftAddress: allowGiftShipping, // Marcar como dirección de regalos si se permite
      }

      const preferences = {
        allowGiftShipping,
        useMainAddressForGifts,
      }

      await onComplete(addressData, preferences)
    } catch (error) {
      console.error('Error guardando dirección:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredCities = selectedDepartmentId
    ? cities.filter(city => city.department_id === selectedDepartmentId)
    : []

  const isFormValid = formData.firstName && formData.lastName && formData.address1 && 
                      formData.city && formData.state && formData.postalCode

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-[#66DEDB]">
          📦 ¿Dónde quieres recibir regalos?
        </h2>
        <p className="text-sm text-gray-400">
          Opcional: Configura una dirección para que tus amigos puedan enviarte regalos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre y Apellido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#73FFA2] focus:outline-none text-sm"
              placeholder="Juan"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Apellido *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#73FFA2] focus:outline-none text-sm"
              placeholder="Pérez"
            />
          </div>
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Dirección *
          </label>
          <input
            type="text"
            value={formData.address1}
            onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
            required
            className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#73FFA2] focus:outline-none text-sm"
            placeholder="Calle 123 #45-67"
          />
        </div>

        {/* Detalle adicional */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Detalle adicional (opcional)
          </label>
          <input
            type="text"
            value={formData.address2}
            onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#73FFA2] focus:outline-none text-sm"
            placeholder="Apartamento, piso, etc."
          />
        </div>

        {/* Departamento y Ciudad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Departamento *
            </label>
            <select
              value={selectedDepartmentId || ''}
              onChange={handleDepartmentChange}
              required
              disabled={loadingDepartments}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#73FFA2] focus:outline-none text-sm disabled:opacity-50"
            >
              <option value="">Selecciona...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Ciudad *
            </label>
            <select
              value={formData.city}
              onChange={handleCityChange}
              required
              disabled={loadingCities || !selectedDepartmentId}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#73FFA2] focus:outline-none text-sm disabled:opacity-50"
            >
              <option value="">
                {selectedDepartmentId ? 'Selecciona...' : 'Primero selecciona departamento'}
              </option>
              {filteredCities.map((city) => (
                <option key={city.id} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Código postal y Teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Código postal *
            </label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              required
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#73FFA2] focus:outline-none text-sm"
              placeholder="110111"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#73FFA2] focus:outline-none text-sm"
              placeholder="3001234567"
            />
          </div>
        </div>

        {/* Checkboxes de preferencias */}
        <div className="space-y-2 pt-2 border-t border-gray-700">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="allowGiftShipping"
              checked={allowGiftShipping}
              onChange={(e) => setAllowGiftShipping(e.target.checked)}
              className="mt-1 w-4 h-4 text-[#73FFA2] focus:ring-[#73FFA2] rounded"
            />
            <label htmlFor="allowGiftShipping" className="text-sm text-gray-300 cursor-pointer">
              Usar esta dirección para recibir regalos de amigos
            </label>
          </div>
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="useMainAddressForGifts"
              checked={useMainAddressForGifts}
              onChange={(e) => setUseMainAddressForGifts(e.target.checked)}
              className="mt-1 w-4 h-4 text-[#73FFA2] focus:ring-[#73FFA2] rounded"
            />
            <label htmlFor="useMainAddressForGifts" className="text-sm text-gray-300 cursor-pointer">
              Usar mi dirección principal para regalos (si ya tengo una configurada)
            </label>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Omitir
          </button>
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="flex-1 px-4 py-2 bg-[#73FFA2] hover:bg-[#66DEDB] text-gray-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}

