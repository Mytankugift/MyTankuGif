'use client'

import { useState, useEffect } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'

interface PrivacySectionProps {
  onUpdate?: () => void
}

export function PrivacySection({ onUpdate }: PrivacySectionProps) {
  const { user, checkAuth, logout } = useAuthStore()
  const router = useRouter()
  const [profilePublic, setProfilePublic] = useState(true)
  const [allowGiftShipping, setAllowGiftShipping] = useState(false)
  const [useMainAddressForGifts, setUseMainAddressForGifts] = useState(false)
  const [hasAddress, setHasAddress] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)

  // Cargar configuración actual del perfil y direcciones
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return
      setIsLoading(true)
      try {
        // Cargar perfil
        const profileResponse = await apiClient.get<import('@/types/api-responses').UserProfileResponse>(API_ENDPOINTS.USERS.PROFILE.GET)
        
        // Cargar direcciones para verificar si hay alguna configurada
        const addressesResponse = await apiClient.get<Array<{ id: string; isGiftAddress: boolean; isDefaultShipping: boolean }>>(
          API_ENDPOINTS.USERS.ADDRESSES.LIST
        )
        
        const hasAnyAddress = addressesResponse.success && addressesResponse.data && addressesResponse.data.length > 0
        setHasAddress(hasAnyAddress || false)
        
        if (profileResponse.success && profileResponse.data) {
          // isPublic: true por defecto
          setProfilePublic(profileResponse.data.isPublic ?? true)
          
          // allowGiftShipping: true por defecto solo si hay dirección, sino usar el valor del perfil
          // Si no hay dirección, no puede estar activado
          if (hasAnyAddress) {
            setAllowGiftShipping(profileResponse.data.allowGiftShipping ?? true)
          } else {
            setAllowGiftShipping(false)
          }
          
          // useMainAddressForGifts: true por defecto si se configuró en el onboarding
          setUseMainAddressForGifts(profileResponse.data.useMainAddressForGifts ?? false)
        }
      } catch (error) {
        console.error('Error cargando perfil:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id) return
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
        isPublic: profilePublic,
        allowGiftShipping,
        useMainAddressForGifts,
      })

      if (response.success) {
        setSuccess(true)
        // Actualizar el estado del usuario
        await checkAuth()
        if (onUpdate) {
          onUpdate()
        }
        // Ocultar mensaje de éxito después de 3 segundos
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError('Error al guardar configuración de privacidad')
      }
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

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando configuración...</p>
        </div>
      ) : (
        <>
          {/* Perfil público */}
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm font-medium text-white">Perfil Público</label>
              <p className="text-xs text-gray-400">Permitir que otros usuarios vean tu perfil</p>
            </div>
            <button
              onClick={async () => {
                const newValue = !profilePublic
                setProfilePublic(newValue)
                // Guardar automáticamente
                setIsSaving(true)
                setError(null)
                try {
                  const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
                    isPublic: newValue,
                    allowGiftShipping,
                    useMainAddressForGifts,
                  })
                  if (response.success) {
                    await checkAuth()
                    if (onUpdate) {
                      onUpdate()
                    }
                  } else {
                    setError('Error al guardar configuración')
                    setProfilePublic(profilePublic) // Revertir
                  }
                } catch (err: any) {
                  setError(err.message || 'Error al guardar configuración')
                  setProfilePublic(profilePublic) // Revertir
                } finally {
                  setIsSaving(false)
                }
              }}
              disabled={isSaving}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                profilePublic ? 'bg-[#73FFA2]' : 'bg-gray-600'
              } disabled:opacity-50`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                profilePublic ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Preferencias de regalos */}
          <div className="pt-4 border-t border-gray-600 space-y-4">
            <h4 className="text-sm font-semibold text-[#66DEDB]">Preferencias de Regalos</h4>
            
            {/* Permitir recibir regalos */}
            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-white">Permitir recibir regalos</label>
                <p className="text-xs text-gray-400">Permite que tus amigos te envíen regalos desde tus wishlists</p>
                {!hasAddress && (
                  <p className="text-xs text-yellow-400 mt-1">⚠️ Necesitas configurar una dirección primero</p>
                )}
              </div>
              <button
                onClick={async () => {
                  if (!hasAddress) {
                    setError('Necesitas configurar una dirección antes de permitir recibir regalos')
                    return
                  }
                  const newValue = !allowGiftShipping
                  setAllowGiftShipping(newValue)
                  setIsSaving(true)
                  setError(null)
                  try {
                    const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
                      isPublic: profilePublic,
                      allowGiftShipping: newValue,
                      useMainAddressForGifts: newValue ? useMainAddressForGifts : false, // Si se desactiva, también desactivar useMainAddressForGifts
                    })
                    if (response.success) {
                      if (!newValue) {
                        setUseMainAddressForGifts(false) // Si se desactiva allowGiftShipping, también desactivar useMainAddressForGifts
                      }
                      await checkAuth()
                      if (onUpdate) {
                        onUpdate()
                      }
                    } else {
                      setError('Error al guardar configuración')
                      setAllowGiftShipping(allowGiftShipping) // Revertir
                    }
                  } catch (err: any) {
                    setError(err.message || 'Error al guardar configuración')
                    setAllowGiftShipping(allowGiftShipping) // Revertir
                  } finally {
                    setIsSaving(false)
                  }
                }}
                disabled={isSaving || !hasAddress}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  allowGiftShipping && hasAddress ? 'bg-[#73FFA2]' : 'bg-gray-600'
                } disabled:opacity-50`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  allowGiftShipping && hasAddress ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Usar dirección principal para regalos */}
            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-white">Usar dirección principal para regalos</label>
                <p className="text-xs text-gray-400">Usa tu dirección de envío principal para recibir regalos</p>
              </div>
              <button
                onClick={async () => {
                  const newValue = !useMainAddressForGifts
                  setUseMainAddressForGifts(newValue)
                  setIsSaving(true)
                  setError(null)
                  try {
                    const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
                      isPublic: profilePublic,
                      allowGiftShipping,
                      useMainAddressForGifts: newValue,
                    })
                    if (response.success) {
                      await checkAuth()
                      if (onUpdate) {
                        onUpdate()
                      }
                    } else {
                      setError('Error al guardar configuración')
                      setUseMainAddressForGifts(useMainAddressForGifts) // Revertir
                    }
                  } catch (err: any) {
                    setError(err.message || 'Error al guardar configuración')
                    setUseMainAddressForGifts(useMainAddressForGifts) // Revertir
                  } finally {
                    setIsSaving(false)
                  }
                }}
                disabled={isSaving || !allowGiftShipping}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  useMainAddressForGifts && allowGiftShipping ? 'bg-[#73FFA2]' : 'bg-gray-600'
                } disabled:opacity-50`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  useMainAddressForGifts && allowGiftShipping ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Enlace a términos y condiciones */}
          <div className="pt-4 border-t border-gray-600">
            <p className="text-xs text-gray-400 mb-2">
              Para más información sobre cómo manejamos tus datos, consulta nuestros:
            </p>
            <Link
              href="/terms"
              className="text-sm text-[#73FFA2] hover:text-[#66DEDB] transition-colors inline-flex items-center gap-1"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Términos y Condiciones
            </Link>
          </div>

          {/* Botón para relanzar onboarding */}
          <div className="pt-4 border-t border-gray-600">
            <button
              onClick={() => setShowOnboardingModal(true)}
              className="flex items-center gap-3 text-[#73FFA2] hover:text-[#66DEDB] transition-colors w-full text-left px-2 py-2 rounded-lg hover:bg-[#73FFA2]/10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M2 12h20" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span 
                className="font-medium"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Rehacer onboarding completo
              </span>
            </button>
            <p className="text-xs text-gray-400 mt-1 px-2">
              Completa los 5 pasos del onboarding nuevamente
            </p>
          </div>

          {/* Botón de cerrar sesión */}
          <div className="pt-4 border-t border-gray-600">
            <button
              onClick={() => {
                logout()
                router.push('/')
              }}
              className="flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors w-full text-left px-2 py-2 rounded-lg hover:bg-red-500/10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span 
                className="font-medium"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Cerrar sesión
              </span>
            </button>
          </div>
        </>
      )}

      {/* Modal de onboarding */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onComplete={() => {
          setShowOnboardingModal(false)
          if (onUpdate) {
            onUpdate()
          }
        }}
      />
    </div>
  )
}

