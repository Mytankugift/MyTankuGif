'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

interface OnboardingStepUsernameProps {
  onNext: (username: string) => void
  initialUsername?: string | null
}

export function OnboardingStepUsername({ onNext, initialUsername }: OnboardingStepUsernameProps) {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#73FFA2] mb-2">Elige tu username</h2>
        <p className="text-gray-400 text-sm">
          Tu username es único y se usará en tu perfil y para menciones. Puedes cambiarlo más tarde.
        </p>
      </div>

      <div className="space-y-4">
        {suggestedUsername && suggestedUsername !== username && (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-300 text-sm mb-2">Sugerencia basada en tu nombre:</p>
            <button
              onClick={handleUseSuggested}
              className="text-[#73FFA2] hover:text-[#66DEDB] font-medium text-sm"
            >
              Usar: @{suggestedUsername}
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Username
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                setUsername(value)
                setError(null)
              }}
              className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB]"
              placeholder="username"
              maxLength={30}
              disabled={isChecking}
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
          {!error && username && (
            <p className="mt-2 text-xs text-gray-400">
              {username.length}/30 caracteres. Solo letras, números y guiones bajos.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={handleNext}
          disabled={!username || isChecking || validateUsername(username) !== null}
          className="px-6 py-3 bg-[#73FFA2] hover:bg-[#66DEDB] text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isChecking ? 'Verificando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}

