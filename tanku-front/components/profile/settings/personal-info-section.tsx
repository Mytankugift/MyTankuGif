'use client'

import { useState, useEffect } from 'react'
import * as React from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline'

interface PersonalInfoSectionProps {
  onUpdate?: () => void
}

export function PersonalInfoSection({ onUpdate }: PersonalInfoSectionProps) {
  const { user, checkAuth } = useAuthStore()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  })

  // Cargar información completa del usuario para obtener el teléfono
  useEffect(() => {
    const loadUserData = async () => {
      if (user?.id) {
        try {
          const response = await apiClient.get(API_ENDPOINTS.USERS.ME)
          if (response.success && response.data) {
            const responseData = response.data as any
            // El endpoint devuelve { user: {...}, addresses: [...] }
            const userData = responseData.user || responseData
            setFormData({
              firstName: userData.firstName || user?.firstName || '',
              lastName: userData.lastName || user?.lastName || '',
              email: userData.email || user?.email || '',
              phone: userData.phone || user?.phone || '',
            })
          }
        } catch (err) {
          console.error('Error al cargar información del usuario:', err)
          // Si falla, usar datos del store
          setFormData({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phone || '',
          })
        }
      }
    }
    loadUserData()
  }, [user])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFieldEdit = (field: string) => {
    setEditingField(field)
    setError(null)
  }

  const handleFieldCancel = async () => {
    setEditingField(null)
    setError(null)
    
    // Recargar datos actuales del usuario
    if (user?.id) {
      try {
        const response = await apiClient.get(API_ENDPOINTS.USERS.ME)
        if (response.success && response.data) {
          const responseData = response.data as any
          const userData = responseData.user || responseData
          setFormData({
            firstName: userData.firstName || user?.firstName || '',
            lastName: userData.lastName || user?.lastName || '',
            email: userData.email || user?.email || '',
            phone: userData.phone || user?.phone || '',
          })
        }
      } catch (err) {
        // Si falla, usar datos del store
        setFormData({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          phone: user?.phone || '',
        })
      }
    }
  }

  const handleFieldSave = async (field: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const updateData: Record<string, string> = {}
      updateData[field] = formData[field as keyof typeof formData]

      const response = await apiClient.put(API_ENDPOINTS.USERS.ME, updateData)

      if (response.success) {
        // Actualizar el store de autenticación
        await checkAuth()
        setEditingField(null)
        if (onUpdate) {
          onUpdate()
        }
      } else {
        setError(response.error?.message || 'Error al actualizar')
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors space-y-4">
      <h3 className="text-lg font-semibold text-[#73FFA2] mb-4">Información Personal</h3>
      
      {error && (
        <div className="bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Nombre */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Nombre</label>
        <div className="flex items-center gap-2">
          {editingField === 'firstName' ? (
            <>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB]"
                disabled={isLoading}
                autoFocus
              />
              <button
                onClick={() => handleFieldSave('firstName')}
                disabled={isLoading || !formData.firstName.trim()}
                className="p-2 text-[#73FFA2] hover:text-[#66DEDB] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleFieldCancel}
                disabled={isLoading}
                className="p-2 text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-white">{formData.firstName || 'No especificado'}</span>
              <button
                onClick={() => handleFieldEdit('firstName')}
                className="p-2 text-gray-400 hover:text-[#73FFA2] transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Apellido */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Apellido</label>
        <div className="flex items-center gap-2">
          {editingField === 'lastName' ? (
            <>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB]"
                disabled={isLoading}
                autoFocus
              />
              <button
                onClick={() => handleFieldSave('lastName')}
                disabled={isLoading || !formData.lastName.trim()}
                className="p-2 text-[#73FFA2] hover:text-[#66DEDB] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleFieldCancel}
                disabled={isLoading}
                className="p-2 text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-white">{formData.lastName || 'No especificado'}</span>
              <button
                onClick={() => handleFieldEdit('lastName')}
                className="p-2 text-gray-400 hover:text-[#73FFA2] transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Email</label>
        <div className="flex items-center gap-2">
          {editingField === 'email' ? (
            <>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB]"
                disabled={isLoading}
                autoFocus
              />
              <button
                onClick={() => handleFieldSave('email')}
                disabled={isLoading || !formData.email.trim() || !formData.email.includes('@')}
                className="p-2 text-[#73FFA2] hover:text-[#66DEDB] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleFieldCancel}
                disabled={isLoading}
                className="p-2 text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-white">{formData.email || 'No especificado'}</span>
              <button
                onClick={() => handleFieldEdit('email')}
                className="p-2 text-gray-400 hover:text-[#73FFA2] transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Teléfono */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Teléfono</label>
        <div className="flex items-center gap-2">
          {editingField === 'phone' ? (
            <>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB]"
                placeholder="+57 300 123 4567"
                disabled={isLoading}
                autoFocus
              />
              <button
                onClick={() => handleFieldSave('phone')}
                disabled={isLoading}
                className="p-2 text-[#73FFA2] hover:text-[#66DEDB] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleFieldCancel}
                disabled={isLoading}
                className="p-2 text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-white">{formData.phone || 'No especificado'}</span>
              <button
                onClick={() => handleFieldEdit('phone')}
                className="p-2 text-gray-400 hover:text-[#73FFA2] transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

