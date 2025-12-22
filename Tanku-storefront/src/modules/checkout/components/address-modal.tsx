"use client"

import { useState, useEffect } from "react"
import { Button } from "@medusajs/ui"
import { XMark, PencilSquare } from "@medusajs/icons"
import Input from "@modules/common/components/input"
import { HttpTypes } from "@medusajs/types"
import { addCustomerAddress, updateCustomerAddress } from "@lib/data/customer"

interface AddressModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (address: HttpTypes.StoreCartAddress) => void
  customer: HttpTypes.StoreCustomer | null
  editingAddress?: HttpTypes.StoreCustomerAddress | null
  selectedAddressId?: string | null
  onSelectAsDefault?: (addressId: string) => void
}

export default function AddressModal({
  isOpen,
  onClose,
  onSave,
  customer,
  editingAddress,
  selectedAddressId,
  onSelectAsDefault,
}: AddressModalProps) {
  const [formData, setFormData] = useState({
    alias: "",
    first_name: "",
    last_name: "",
    address_1: "",
    address_2: "",
    company: "",
    postal_code: "",
    city: "",
    province: "",
    country_code: "co",
  })
  const [saving, setSaving] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; cities: Array<{ id: number; name: string }>; hasError?: boolean }>>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  const [availableCities, setAvailableCities] = useState<Array<{ id: number; name: string }>>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)

  // Cargar departamentos y ciudades desde API pública
  useEffect(() => {
    if (isOpen) {
      const fetchDepartments = async () => {
        setLoadingDepartments(true)
        try {
          const response = await fetch("/api/colombia/departments")
          if (response.ok) {
            const data = await response.json()
            setDepartments(data)
          } else {
            console.error("Error al cargar departamentos:", await response.text())
          }
        } catch (error) {
          console.error("Error al cargar departamentos:", error)
        } finally {
          setLoadingDepartments(false)
        }
      }
      fetchDepartments()
    }
  }, [isOpen])

  // Cuando se selecciona un departamento, cargar sus ciudades
  useEffect(() => {
    if (selectedDepartmentId && departments.length > 0) {
      const selectedDept = departments.find(d => d.id === selectedDepartmentId)
      if (selectedDept) {
        setAvailableCities(selectedDept.cities || [])
        // Actualizar el nombre del departamento en formData
        setFormData(prev => ({
          ...prev,
          province: selectedDept.name
        }))
      }
    } else {
      setAvailableCities([])
    }
  }, [selectedDepartmentId, departments])

  useEffect(() => {
    const parsePhone = (phone: string) => {
      if (!phone) return { code: "+57", number: "" }
      
      // Buscar código de país común (1-3 dígitos después del +)
      const match = phone.match(/^(\+?\d{1,3})(.*)$/)
      if (match) {
        return {
          code: match[1].startsWith("+") ? match[1] : `+${match[1]}`,
          number: match[2].trim()
        }
      }
      
      // Si no tiene código, asumir Colombia
      return { code: "+57", number: phone }
    }

    if (editingAddress && isOpen) {
      // Buscar el departamento por nombre
      const dept = departments.find(d => d.name === editingAddress.province)
      if (dept) {
        setSelectedDepartmentId(dept.id)
      }

      setFormData({
        alias: (editingAddress.metadata?.alias as string) || "",
        first_name: customer?.first_name || "",
        last_name: customer?.last_name || "",
        address_1: editingAddress.address_1 || "",
        address_2: editingAddress.address_2 || "",
        company: editingAddress.company || "",
        postal_code: editingAddress.postal_code || "",
        city: editingAddress.city || "",
        province: editingAddress.province || "",
        country_code: editingAddress.country_code || "co",
      })
      setIsDefault(editingAddress.is_default_shipping || false)
    } else if (isOpen) {
      setFormData({
        alias: "",
        first_name: customer?.first_name || "",
        last_name: customer?.last_name || "",
        address_1: "",
        address_2: "",
        company: "",
        postal_code: "",
        city: "",
        province: "",
        country_code: "co",
      })
      setIsDefault(false)
      setSelectedDepartmentId(null)
      setAvailableCities([])
    }
  }, [editingAddress, customer, isOpen, departments])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSave = async () => {
    if (!formData.address_1 || !formData.city || !formData.postal_code) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    if (!customer) {
      alert("Debes estar autenticado para guardar una dirección. Por favor inicia sesión.")
      return
    }

    setSaving(true)
    try {
      // Crear FormData sin el campo phone
      const formDataToSend = new FormData()
      
      // Datos básicos
      formDataToSend.append("first_name", customer?.first_name || "")
      formDataToSend.append("last_name", customer?.last_name || "")
      formDataToSend.append("address_1", formData.address_1)
      formDataToSend.append("address_2", formData.address_2 || "")
      formDataToSend.append("company", formData.company || "")
      formDataToSend.append("postal_code", formData.postal_code)
      formDataToSend.append("city", formData.city)
      formDataToSend.append("province", formData.province)
      formDataToSend.append("country_code", formData.country_code)
      
      // NO agregamos phone - esto debería evitar el error
      
      // Metadata
      if (formData.alias) {
        formDataToSend.append("metadata[alias]", formData.alias)
      }
      
      // Dirección predeterminada
      if (isDefault) {
        formDataToSend.append("is_default_shipping", "true")
      }

      let result
      if (editingAddress) {
        formDataToSend.append("addressId", editingAddress.id)
        result = await updateCustomerAddress({ addressId: editingAddress.id }, formDataToSend)
      } else {
        result = await addCustomerAddress({ isDefaultShipping: false, isDefaultBilling: false }, formDataToSend)
      }

      if (result.success) {
        // Si el servidor retornó la dirección creada, usarla; si no, usar formData
        const addressToSave = (result as any).address || formData
        const savedAddress = addressToSave as HttpTypes.StoreCartAddress
        
        // Si se marcó como predeterminada, seleccionarla automáticamente
        if (isDefault && onSelectAsDefault && (result as any).address?.id) {
          onSelectAsDefault((result as any).address.id)
        } else if (isDefault && editingAddress) {
          // Si se editó y se marcó como predeterminada, seleccionarla
          onSelectAsDefault?.(editingAddress.id)
        }
        
        onSave(savedAddress)
        onClose()
      } else {
        const errorMessage = result.error || "Error al guardar la dirección"
        if (errorMessage.includes("Unauthorized") || errorMessage.includes("401")) {
          alert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.")
        } else {
          alert(errorMessage)
        }
      }
    } catch (error: any) {
      console.error("Error saving address:", error)
      const errorMessage = error?.message || error?.toString() || "Error al guardar la dirección"
      if (errorMessage.includes("Unauthorized") || errorMessage.includes("401")) {
        alert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.")
      } else {
        alert("Error al guardar la dirección: " + errorMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-700/50 backdrop-blur-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#73FFA2]">
            {editingAddress ? "Editar dirección" : "Nueva dirección"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XMark className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <Input
              label="Alias"
              name="alias"
              value={formData.alias}
              onChange={handleChange}
              className="bg-gray-700/50 border-gray-600 text-white focus:border-[#73FFA2] focus:ring-[#73FFA2]"
            />
            <p className="text-xs text-gray-400 mt-1 ml-1">Ejemplos: Casa, Trabajo, Oficina, etc.</p>
          </div>
          <Input
            label="Dirección"
            name="address_1"
            value={formData.address_1}
            onChange={handleChange}
            required
            className="bg-gray-700/50 border-gray-600 text-white focus:border-[#73FFA2] focus:ring-[#73FFA2]"
          />
          <Input
            label="Detalles (opcional)"
            name="address_2"
            value={formData.address_2}
            onChange={handleChange}
            className="bg-gray-700/50 border-gray-600 text-white focus:border-[#73FFA2] focus:ring-[#73FFA2]"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Departamento <span className="text-red-400">*</span>
              </label>
              <select
                name="province"
                value={selectedDepartmentId || ""}
                onChange={(e) => {
                  const deptId = e.target.value ? parseInt(e.target.value) : null
                  setSelectedDepartmentId(deptId)
                  setFormData(prev => ({
                    ...prev,
                    city: "", // Limpiar ciudad al cambiar departamento
                    province: deptId ? departments.find(d => d.id === deptId)?.name || "" : ""
                  }))
                }}
                required
                disabled={loadingDepartments}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:border-[#73FFA2] focus:ring-1 focus:ring-[#73FFA2] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{loadingDepartments ? "Cargando..." : "Selecciona un departamento"}</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id} className="bg-gray-700">
                    {dept.name}{dept.hasError ? " (Sin ciudades disponibles)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Ciudad <span className="text-red-400">*</span>
              </label>
              <select
                name="city"
                value={formData.city}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    city: e.target.value
                  }))
                }}
                required
                disabled={!selectedDepartmentId || availableCities.length === 0}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:border-[#73FFA2] focus:ring-1 focus:ring-[#73FFA2] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedDepartmentId 
                    ? "Selecciona primero un departamento" 
                    : availableCities.length === 0 
                    ? (() => {
                        const selectedDept = departments.find(d => d.id === selectedDepartmentId)
                        return selectedDept?.hasError 
                          ? "No se pudieron cargar las ciudades" 
                          : "Cargando ciudades..."
                      })()
                    : "Selecciona una ciudad"}
                </option>
                {availableCities.map((city) => (
                  <option key={city.id} value={city.name} className="bg-gray-700">
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label="Código Postal"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            required
            className="bg-gray-700/50 border-gray-600 text-white focus:border-[#73FFA2] focus:ring-[#73FFA2]"
          />
          
          {/* Checkbox para dirección predeterminada */}
          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="is_default"
              name="is_default"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700/50 text-[#73FFA2] focus:ring-2 focus:ring-[#73FFA2] focus:ring-offset-0 focus:ring-offset-gray-800 cursor-pointer accent-[#73FFA2]"
            />
            <label
              htmlFor="is_default"
              className="text-gray-300 cursor-pointer"
            >
              Establecer como dirección pre-determinada
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium text-sm rounded-lg transition-all"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-[#73FFA2] to-[#66DEDB] hover:from-[#66e68f] hover:to-[#5accc9] text-black font-semibold text-sm rounded-lg transition-all"
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  )
}

