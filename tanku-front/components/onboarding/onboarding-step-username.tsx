'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

interface OnboardingStepUsernameProps {
  onNext: (username: string) => void
  initialUsername?: string | null
  onUsernameChange?: (username: string) => void // Callback para notificar cambios al padre
}

export function OnboardingStepUsername({ onNext, initialUsername, onUsernameChange }: OnboardingStepUsernameProps) {
  const { user, checkAuth } = useAuthStore()
  const [username, setUsername] = useState(initialUsername || '')
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [suggestedUsername, setSuggestedUsername] = useState('')

  // Generar username sugerido basado en nombre y apellido
  useEffect(() => {
    if (user?.firstName && user?.lastName && !initialUsername) {
      const firstName = user.firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
      const lastName = user.lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
      const suggested = `${firstName}_${lastName}`.substring(0, 30)
      setSuggestedUsername(suggested)
      if (!username) {
        setUsername(suggested)
      }
    } else if (user?.email && !initialUsername && !username) {
      // Fallback a email sin dominio
      const emailUsername = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 30)
      setSuggestedUsername(emailUsername)
      setUsername(emailUsername)
    }
  }, [user, initialUsername])

  // Notificar al padre cuando el username cambia
  useEffect(() => {
    if (onUsernameChange) {
      onUsernameChange(username)
    }
  }, [username, onUsernameChange])

  const validateUsername = (value: string): string | null => {
    if (!value || value.trim().length === 0) {
      return 'El username es requerido'
    }
    if (value.length < 3) {
      return 'El username debe tener al menos 3 caracteres'
    }
    if (value.length > 30) {
      return 'El username no puede exceder 30 caracteres'
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'El username solo puede contener letras, números y guiones bajos'
    }
    return null
  }

  const handleCheckUsername = async (value: string) => {
    const validationError = validateUsername(value)
    if (validationError) {
      setError(validationError)
      return false
    }

    setIsChecking(true)
    setError(null)

    try {
      // Intentar actualizar el username para verificar si es único
      const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.ME, { username: value })
      
      if (response.success) {
        await checkAuth()
        setIsChecking(false)
        return true
      } else {
        setError(response.error?.message || 'Este username ya está en uso')
        setIsChecking(false)
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Error al verificar username')
      setIsChecking(false)
      return false
    }
  }

  const handleNext = async () => {
    if (await handleCheckUsername(username)) {
      onNext(username)
    }
  }

  const handleUseSuggested = () => {
    setUsername(suggestedUsername)
    setError(null)
  }

  return (
    <>
      <div className="space-y-6">
        <div className="pt-4">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>Elige tu Username</h2>
          <p className="text-base" style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}>
            Este será el nombre de tu perfil TANKU que podrán utilizar para conectar contigo. Tranqui, luego lo puedes cambiar.
          </p>
        </div>

        <div className="space-y-6">
          <div className="pt-8">
            <div className="flex items-center gap-2">
              <span style={{ color: '#73FFA2' }}>@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                  setUsername(value)
                  setError(null)
                }}
                className="flex-1 px-4 py-3 text-white focus:outline-none"
                style={{
                  backgroundColor: 'rgba(217, 217, 217, 0.2)',
                  borderRadius: '25px',
                  border: '1px solid #4A4A4A',
                  fontFamily: 'Poppins, sans-serif',
                }}
                placeholder="pepito_jimenez"
                maxLength={30}
                disabled={isChecking}
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          {/* Personaje */}
          <div className="flex justify-center pt-6">
            <img
              src="/icons_tanku/onboarding_personaje_tanku.png"
              alt="Personaje Tanku"
              className="w-56 h-56 object-contain"
            />
          </div>
        </div>
      </div>
    </>
  )
}

