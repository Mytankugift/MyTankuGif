"use client"

import { useState, useEffect } from "react"
import { Button } from "@medusajs/ui"
import { XMark } from "@medusajs/icons"
import Input from "@modules/common/components/input"

interface BillingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (billingData: Record<string, any>) => void
  initialData?: Record<string, any>
}

export default function BillingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: BillingModalProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    address_1: "",
    address_2: "",
    postal_code: "",
    city: "",
    province: "",
    phone: "",
    country_code: "co",
  })

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        first_name: initialData["billing_address.first_name"] || "",
        last_name: initialData["billing_address.last_name"] || "",
        address_1: initialData["billing_address.address_1"] || "",
        address_2: initialData["billing_address.address_2"] || "",
        postal_code: initialData["billing_address.postal_code"] || "",
        city: initialData["billing_address.city"] || "",
        province: initialData["billing_address.province"] || "",
        phone: initialData["billing_address.phone"] || "",
        country_code: initialData["billing_address.country_code"] || "co",
      })
    } else if (isOpen) {
      setFormData({
        first_name: "",
        last_name: "",
        address_1: "",
        address_2: "",
        postal_code: "",
        city: "",
        province: "",
        phone: "",
        country_code: "co",
      })
    }
  }, [isOpen, initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSave = () => {
    if (!formData.first_name || !formData.last_name || !formData.address_1 || !formData.city || !formData.postal_code) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    const billingData: Record<string, any> = {}
    Object.keys(formData).forEach((key) => {
      billingData[`billing_address.${key}`] = formData[key as keyof typeof formData]
    })
    onSave(billingData)
    onClose()
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
          <h2 className="text-xl font-bold text-[#66DEDB]">
            Dirección de Facturación
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              className="bg-gray-700/50 border-gray-600 text-white focus:border-[#66DEDB] focus:ring-[#66DEDB]"
            />
            <Input
              label="Apellido"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              className="bg-gray-700/50 border-gray-600 text-white focus:border-[#66DEDB] focus:ring-[#66DEDB]"
            />
          </div>
          <Input
            label="Dirección"
            name="address_1"
            value={formData.address_1}
            onChange={handleChange}
            required
            className="bg-gray-700/50 border-gray-600 text-white focus:border-[#66DEDB] focus:ring-[#66DEDB]"
          />
          <Input
            label="Detalles (opcional)"
            name="address_2"
            value={formData.address_2}
            onChange={handleChange}
            className="bg-gray-700/50 border-gray-600 text-white focus:border-[#66DEDB] focus:ring-[#66DEDB]"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ciudad"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="bg-gray-700/50 border-gray-600 text-white focus:border-[#66DEDB] focus:ring-[#66DEDB]"
            />
            <Input
              label="Departamento"
              name="province"
              value={formData.province}
              onChange={handleChange}
              required
              className="bg-gray-700/50 border-gray-600 text-white focus:border-[#66DEDB] focus:ring-[#66DEDB]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Código Postal"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              required
              className="bg-gray-700/50 border-gray-600 text-white focus:border-[#66DEDB] focus:ring-[#66DEDB]"
            />
            <Input
              label="Teléfono"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="bg-gray-700/50 border-gray-600 text-white focus:border-[#66DEDB] focus:ring-[#66DEDB]"
            />
          </div>
          <Input
            label="País"
            name="country_code"
            value="Colombia"
            disabled
            className="bg-gray-700/30 border-gray-600 text-gray-400"
          />
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="secondary"
            className="px-6 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="px-6 py-2 text-sm bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] hover:from-[#5accc9] hover:to-[#66e68f] text-black font-semibold rounded-lg transition-all"
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}

