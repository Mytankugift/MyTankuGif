'use client'

import { useState, useEffect, useRef } from 'react'
import type { AddressDTO, CreateAddressDTO, UpdateAddressDTO } from '@/types/api'
import { Button } from '@/components/ui/button'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { CHECKOUT_TANKU_PAGE_BG } from '@/lib/checkout-tanku-design'

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
  defaultGiftAddress?: boolean // Para pre-marcar el checkbox en onboarding
  /**
   * Si en perfil está activo “usar dirección principal para regalos”, la tarjeta muestra
   * regalos aunque `isGiftAddress` venga en false: al abrir edición, el switch debe reflejar eso.
   */
  useMainAddressForGiftsFromProfile?: boolean
}

function resolveIsGiftForForm(
  addr: AddressDTO,
  useMainForGifts?: boolean
): boolean {
  const snake = (addr as { is_gift_address?: boolean }).is_gift_address
  if (addr.isGiftAddress === true || snake === true) return true
  if (useMainForGifts && addr.isDefaultShipping) return true
  return false
}

export function AddressFormModal({
  isOpen,
  onClose,
  address,
  onSubmit,
  defaultGiftAddress = false,
  useMainAddressForGiftsFromProfile = false,
}: AddressFormModalProps) {
  const addressRef = useRef(address)
  addressRef.current = address
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

  // Sincronizar formulario al abrir o al cambiar de dirección. No depender de la referencia de
  // `address` (cambia en cada render del padre) o el switch de regalos se resetea al tocar.
  useEffect(() => {
    if (!isOpen) return
    const a = addressRef.current
    if (a) {
      setFormData({
        alias: a.metadata?.alias || '',
        firstName: a.firstName,
        lastName: a.lastName,
        phone: a.phone || '',
        address1: a.address1,
        address2: a.address2 || '',
        city: a.city,
        state: a.state,
        postalCode: a.postalCode,
        country: a.country,
        isDefaultShipping: a.isDefaultShipping,
        isGiftAddress: resolveIsGiftForForm(a, useMainAddressForGiftsFromProfile),
      })
    } else {
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
        isGiftAddress: defaultGiftAddress,
      })
      setSelectedDepartmentId(null)
    }
    setError(null)
  }, [isOpen, address?.id, defaultGiftAddress, useMainAddressForGiftsFromProfile])

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
        isGiftAddress: Boolean(formData.isGiftAddress),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
      <div
        className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-[25px] border border-white/[0.1] shadow-[0_8px_40px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.06] [width:88%] [max-height:min(640px,85dvh)] [min-height:min(520px,78dvh)]"
        style={CHECKOUT_TANKU_PAGE_BG}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-semibold" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
            {address ? 'Editar dirección' : 'Crear nueva dirección'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-4 pb-5 custom-scrollbar" style={{ minHeight: '400px', maxHeight: '460px' }}>
        <form id="address-form" onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Alias */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
              Alias (opcional)
            </label>
            <input
              type="text"
              value={formData.alias}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              className="w-full px-3 py-2 text-sm text-white focus:outline-none"
              style={{
                backgroundColor: 'rgba(217, 217, 217, 0.2)',
                borderRadius: '18px',
                border: '1px solid #4A4A4A',
                fontFamily: 'Poppins, sans-serif',
              }}
              placeholder="Ej: Casa, Oficina, etc."
            />
            <p className="text-xs mt-1" style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}>
              Un nombre para identificar esta dirección fácilmente
            </p>
          </div>

          {/* Nombre y Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                Nombre *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm text-white focus:outline-none"
                style={{
                  backgroundColor: 'rgba(217, 217, 217, 0.2)',
                  borderRadius: '18px',
                  border: '1px solid #4A4A4A',
                  fontFamily: 'Poppins, sans-serif',
                }}
                placeholder="Juan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                Apellido *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm text-white focus:outline-none"
                style={{
                  backgroundColor: 'rgba(217, 217, 217, 0.2)',
                  borderRadius: '18px',
                  border: '1px solid #4A4A4A',
                  fontFamily: 'Poppins, sans-serif',
                }}
                placeholder="Pérez"
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
              Dirección *
            </label>
            <input
              type="text"
              value={formData.address1}
              onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm text-white focus:outline-none"
              style={{
                backgroundColor: 'rgba(217, 217, 217, 0.2)',
                borderRadius: '18px',
                border: '1px solid #4A4A4A',
                fontFamily: 'Poppins, sans-serif',
              }}
              placeholder="Calle 123 #45-67"
            />
          </div>

          {/* Detalle de dirección */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
              Detalle adicional (opcional)
            </label>
            <input
              type="text"
              value={formData.address2}
              onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
              className="w-full px-3 py-2 text-sm text-white focus:outline-none"
              style={{
                backgroundColor: 'rgba(217, 217, 217, 0.2)',
                borderRadius: '18px',
                border: '1px solid #4A4A4A',
                fontFamily: 'Poppins, sans-serif',
              }}
              placeholder="Apartamento, piso, etc."
            />
          </div>

          {/* Departamento y Ciudad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                Departamento *
              </label>
              <select
                value={selectedDepartmentId || ''}
                onChange={handleDepartmentChange}
                required
                disabled={loadingDepartments}
                className="w-full px-3 py-2 text-sm text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'rgba(217, 217, 217, 0.2)',
                  borderRadius: '18px',
                  border: '1px solid #4A4A4A',
                  fontFamily: 'Poppins, sans-serif',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                }}
              >
                <option value="" style={{ backgroundColor: '#4A4A4A', color: '#ffffff' }}>Selecciona un departamento</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id} style={{ backgroundColor: '#4A4A4A', color: '#ffffff' }}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {loadingDepartments && (
                <p className="text-xs mt-1" style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}>Cargando departamentos...</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                Ciudad *
              </label>
              <select
                value={formData.city}
                onChange={handleCityChange}
                required
                disabled={loadingCities || !selectedDepartmentId}
                className="w-full px-3 py-2 text-sm text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'rgba(217, 217, 217, 0.2)',
                  borderRadius: '18px',
                  border: '1px solid #4A4A4A',
                  fontFamily: 'Poppins, sans-serif',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                }}
              >
                <option value="" style={{ backgroundColor: '#4A4A4A', color: '#ffffff' }}>{selectedDepartmentId ? 'Selecciona una ciudad' : 'Primero selecciona un departamento'}</option>
                {filteredCities.map((city) => (
                  <option key={city.id} value={city.name} style={{ backgroundColor: '#4A4A4A', color: '#ffffff' }}>
                    {city.name}
                  </option>
                ))}
              </select>
              {loadingCities && (
                <p className="text-xs mt-1" style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}>Cargando ciudades...</p>
              )}
              {!selectedDepartmentId && (
                <p className="text-xs mt-1" style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}>Selecciona un departamento primero</p>
              )}
            </div>
          </div>

          {/* Código postal y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                Código postal *
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm text-white focus:outline-none"
                style={{
                  backgroundColor: 'rgba(217, 217, 217, 0.2)',
                  borderRadius: '18px',
                  border: '1px solid #4A4A4A',
                  fontFamily: 'Poppins, sans-serif',
                }}
                placeholder="110111"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm text-white focus:outline-none"
                style={{
                  backgroundColor: 'rgba(217, 217, 217, 0.2)',
                  borderRadius: '18px',
                  border: '1px solid #4A4A4A',
                  fontFamily: 'Poppins, sans-serif',
                }}
                placeholder="3001234567"
              />
            </div>
          </div>

          {/* Por defecto — mismo patrón que privacidad (perfil público / privado) */}
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <label className="text-sm font-medium text-white">Dirección de envío por defecto</label>
              <p className="text-xs text-gray-400">Usar esta dirección al comprar si no eliges otra</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, isDefaultShipping: !prev.isDefaultShipping }))
              }
              className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${
                formData.isDefaultShipping ? 'bg-[#73FFA2]' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  formData.isDefaultShipping ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Dirección de regalos */}
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <label className="text-sm font-medium text-white">Usar para recibir regalos</label>
              <p className="text-xs text-gray-400">Nadie más tendrá acceso a estos datos</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, isGiftAddress: !prev.isGiftAddress }))
              }
              className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${
                formData.isGiftAddress ? 'bg-[#73FFA2]' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  formData.isGiftAddress ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </form>
        </div>

        {/* Footer con botones */}
        <div className="flex items-center justify-between p-4">
          <button
            type="button"
            onClick={onClose}
            className="font-semibold transition-all rounded-full"
            style={{
              width: '120px',
              height: '40px',
              backgroundColor: '#4A4A4A',
              color: '#B7B7B7',
              fontFamily: 'Poppins, sans-serif',
              boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25) inset',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="address-form"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
            style={{
              width: '120px',
              height: '40px',
              backgroundColor: isSubmitting ? '#4A4A4A' : '#73FFA2',
              color: isSubmitting ? '#666' : '#262626',
              fontFamily: 'Poppins, sans-serif',
              boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25) inset',
            }}
          >
            {isSubmitting ? 'Guardando...' : address ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

