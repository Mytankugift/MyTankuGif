'use client'

import { useState, useEffect } from 'react'
import type { AddressDTO, CreateAddressDTO, UpdateAddressDTO } from '@/types/api'
import { Button } from '@/components/ui/button'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

interface Department {
  id: number
  name: string
  department_code?: string | null
  country_id?: number
}

interface City {
  id: number
  name: string
  department_id?: number
  department_name?: string
  code?: string
  rate_type?: string // "[\"CON RECAUDO\"]" | "[\"SIN RECAUDO\"]" | "[\"CON RECAUDO\",\"SIN RECAUDO\"]"
  trajectory_type?: string
}

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
    isGiftAddress: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)

  // Cargar departamentos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadDepartments()
      // ❌ NO cargar ciudades aquí - se cargan cuando se selecciona un departamento
    }
  }, [isOpen])

  // Establecer departamento seleccionado cuando se cargan los departamentos y hay una dirección en edición
  useEffect(() => {
    if (address && address.state && departments.length > 0 && !selectedDepartmentId) {
      const department = departments.find(d => d.name === address.state)
      if (department) {
        setSelectedDepartmentId(department.id)
      }
    }
  }, [departments, address, selectedDepartmentId])

  // ✅ Cargar ciudades solo cuando se selecciona un departamento
  useEffect(() => {
    if (selectedDepartmentId) {
      loadCities(selectedDepartmentId)
    } else {
      // Limpiar ciudades si no hay departamento seleccionado
      setCities([])
      setFormData(prev => ({ ...prev, city: '' })) // Limpiar ciudad seleccionada
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartmentId]) // loadCities se define después, no incluirlo en deps

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
        isGiftAddress: address.isGiftAddress || false,
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
        isGiftAddress: false,
      })
      setSelectedDepartmentId(null)
    }
    setError(null)
  }, [address, isOpen])

  // Cargar departamentos
  const loadDepartments = async () => {
    setLoadingDepartments(true)
    setError(null) // Limpiar errores previos
    try {
      console.log('[ADDRESS FORM] Cargando departamentos desde:', API_ENDPOINTS.DROPI.DEPARTMENTS)
      const response = await apiClient.get<Department[]>(
        API_ENDPOINTS.DROPI.DEPARTMENTS
      )
      console.log('[ADDRESS FORM] Respuesta departamentos completa:', JSON.stringify(response, null, 2))
      
      if (response.success && response.data) {
        setDepartments(response.data)
        console.log('[ADDRESS FORM] Departamentos cargados:', response.data.length)
      } else {
        // ✅ Mejorar el manejo de errores
        console.error('[ADDRESS FORM] Error en respuesta - response.success:', response.success)
        console.error('[ADDRESS FORM] Error en respuesta - response.error:', response.error)
        console.error('[ADDRESS FORM] Error en respuesta - tipo de error:', typeof response.error)
        console.error('[ADDRESS FORM] Error en respuesta - keys de error:', response.error ? Object.keys(response.error) : 'null')
        
        const errorMessage = response.error?.message || 
                           (response.error && typeof response.error === 'object' && Object.keys(response.error).length > 0 
                             ? JSON.stringify(response.error) 
                             : 'Error al cargar departamentos')
        console.error('[ADDRESS FORM] Mensaje de error final:', errorMessage)
        setError(errorMessage)
      }
    } catch (err: any) {
      console.error('[ADDRESS FORM] Error cargando departamentos:', err)
      setError(err.message || 'Error al cargar departamentos. Por favor, intenta de nuevo.')
    } finally {
      setLoadingDepartments(false)
    }
  }

  // ✅ Cargar ciudades para un departamento específico
  const loadCities = async (departmentId: number) => {
    setLoadingCities(true)
    try {
      console.log('[ADDRESS FORM] Cargando ciudades para departamento:', departmentId)
      const response = await apiClient.get<{ success: boolean; data: City[] | { cities?: City[] } }>(
        `${API_ENDPOINTS.DROPI.CITIES}?department_id=${departmentId}`
      )
      console.log('[ADDRESS FORM] Respuesta ciudades:', response)
      
      if (response.success && response.data) {
        // ✅ Manejar diferentes estructuras de respuesta
        let citiesArray: City[] = []
        
        if (Array.isArray(response.data)) {
          // Estructura directa: { success: true, data: [...] }
          citiesArray = response.data
        } else if (typeof response.data === 'object' && (response.data as any).cities) {
          // Estructura anidada: { success: true, data: { cities: [...] } }
          citiesArray = (response.data as any).cities || []
        }
        
        setCities(citiesArray)
        console.log('[ADDRESS FORM] Ciudades cargadas:', citiesArray.length)
      } else {
        console.error('[ADDRESS FORM] Error en respuesta ciudades:', response.error)
        setCities([]) // ✅ Asegurar que cities sea un array vacío en caso de error
      }
    } catch (err: any) {
      console.error('[ADDRESS FORM] Error cargando ciudades:', err)
      setCities([]) // ✅ Asegurar que cities sea un array vacío en caso de error
      // No mostrar error para ciudades, solo log
    } finally {
      setLoadingCities(false)
    }
  }

  // Filtrar ciudades por departamento seleccionado
  // ✅ Asegurar que cities siempre sea un array antes de filtrar
  const filteredCities = Array.isArray(cities)
    ? (selectedDepartmentId
        ? cities.filter(city => city.department_id === selectedDepartmentId)
        : cities)
    : []

  // Manejar cambio de departamento
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const departmentId = e.target.value ? parseInt(e.target.value) : null
    setSelectedDepartmentId(departmentId)
    
    // Buscar el nombre del departamento
    const department = departments.find(d => d.id === departmentId)
    if (department) {
      setFormData({ ...formData, state: department.name, city: '' }) // Limpiar ciudad al cambiar departamento
    } else {
      setFormData({ ...formData, state: '', city: '' })
    }
  }

  // Manejar cambio de ciudad
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityName = e.target.value
    setFormData({ ...formData, city: cityName })
  }

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
        isGiftAddress: formData.isGiftAddress,
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

          {/* Departamento y Ciudad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Departamento *
              </label>
              <select
                value={selectedDepartmentId || ''}
                onChange={handleDepartmentChange}
                required
                disabled={loadingDepartments}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Selecciona un departamento</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {loadingDepartments && (
                <p className="text-xs text-gray-400 mt-1">Cargando departamentos...</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ciudad *
              </label>
              <select
                value={formData.city}
                onChange={handleCityChange}
                required
                disabled={loadingCities || !selectedDepartmentId}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{selectedDepartmentId ? 'Selecciona una ciudad' : 'Primero selecciona un departamento'}</option>
                {filteredCities.map((city) => (
                  <option key={city.id} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
              {loadingCities && (
                <p className="text-xs text-gray-400 mt-1">Cargando ciudades...</p>
              )}
              {!selectedDepartmentId && (
                <p className="text-xs text-gray-400 mt-1">Selecciona un departamento primero</p>
              )}
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

          {/* Dirección de regalos */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isGiftAddress"
              checked={formData.isGiftAddress || false}
              onChange={(e) => setFormData({ ...formData, isGiftAddress: e.target.checked })}
              className="w-4 h-4 text-[#73FFA2] focus:ring-[#73FFA2] focus:ring-2 rounded"
            />
            <label htmlFor="isGiftAddress" className="text-sm text-gray-300">
              Usar esta dirección para recibir regalos
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

