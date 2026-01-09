'use client'

import { useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'

interface PrivacySectionProps {
  onUpdate?: () => void
}

export function PrivacySection({ onUpdate }: PrivacySectionProps) {
  const [privacySettings, setPrivacySettings] = useState({
    profilePublic: true,
    showEmail: false,
    showPhone: false,
    allowFriendRequests: true,
    showActivity: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // TODO: Implementar endpoint de privacidad en el backend
      // Por ahora solo simulamos el guardado
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSuccess(true)
      if (onUpdate) {
        onUpdate()
      }
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuración de privacidad')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors space-y-4">
      <h3 className="text-lg font-semibold text-[#73FFA2] mb-4">Configuración de Privacidad</h3>
      
      {error && (
        <div className="bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-400/30 text-green-400 px-4 py-2 rounded text-sm">
          Configuración guardada exitosamente
        </div>
      )}

      {/* Perfil público */}
      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <div>
          <label className="text-sm font-medium text-white">Perfil Público</label>
          <p className="text-xs text-gray-400">Permitir que otros usuarios vean tu perfil</p>
        </div>
        <button
          onClick={() => setPrivacySettings(prev => ({ ...prev, profilePublic: !prev.profilePublic }))}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            privacySettings.profilePublic ? 'bg-[#73FFA2]' : 'bg-gray-600'
          } disabled:opacity-50`}
        >
          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            privacySettings.profilePublic ? 'translate-x-6' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Mostrar email */}
      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <div>
          <label className="text-sm font-medium text-white">Mostrar Email</label>
          <p className="text-xs text-gray-400">Permitir que otros usuarios vean tu email</p>
        </div>
        <button
          onClick={() => setPrivacySettings(prev => ({ ...prev, showEmail: !prev.showEmail }))}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            privacySettings.showEmail ? 'bg-[#73FFA2]' : 'bg-gray-600'
          } disabled:opacity-50`}
        >
          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            privacySettings.showEmail ? 'translate-x-6' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Mostrar teléfono */}
      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <div>
          <label className="text-sm font-medium text-white">Mostrar Teléfono</label>
          <p className="text-xs text-gray-400">Permitir que otros usuarios vean tu teléfono</p>
        </div>
        <button
          onClick={() => setPrivacySettings(prev => ({ ...prev, showPhone: !prev.showPhone }))}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            privacySettings.showPhone ? 'bg-[#73FFA2]' : 'bg-gray-600'
          } disabled:opacity-50`}
        >
          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            privacySettings.showPhone ? 'translate-x-6' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Permitir solicitudes de amistad */}
      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <div>
          <label className="text-sm font-medium text-white">Permitir Solicitudes de Amistad</label>
          <p className="text-xs text-gray-400">Permitir que otros usuarios te envíen solicitudes de amistad</p>
        </div>
        <button
          onClick={() => setPrivacySettings(prev => ({ ...prev, allowFriendRequests: !prev.allowFriendRequests }))}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            privacySettings.allowFriendRequests ? 'bg-[#73FFA2]' : 'bg-gray-600'
          } disabled:opacity-50`}
        >
          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            privacySettings.allowFriendRequests ? 'translate-x-6' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Mostrar actividad */}
      <div className="flex items-center justify-between py-2">
        <div>
          <label className="text-sm font-medium text-white">Mostrar Actividad</label>
          <p className="text-xs text-gray-400">Permitir que otros usuarios vean tu actividad</p>
        </div>
        <button
          onClick={() => setPrivacySettings(prev => ({ ...prev, showActivity: !prev.showActivity }))}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            privacySettings.showActivity ? 'bg-[#73FFA2]' : 'bg-gray-600'
          } disabled:opacity-50`}
        >
          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            privacySettings.showActivity ? 'translate-x-6' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Botón guardar */}
      <div className="flex justify-end pt-4 border-t border-gray-700">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 px-6 py-2 rounded-lg font-medium hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
              Guardando...
            </>
          ) : (
            <>
              <CheckIcon className="w-5 h-5" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  )
}

