/**
 * Provider para manejar el estado global del onboarding
 * Verifica si el usuario necesita completar el onboarding y muestra el modal
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { OnboardingModal } from './onboarding-modal'

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  const { checkIsCompleted } = useOnboarding()
  const [showModal, setShowModal] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const verifyOnboarding = async () => {
      if (!isAuthenticated || !user) {
        setIsChecking(false)
        return
      }

      try {
        const isCompleted = await checkIsCompleted()
        
        // Mostrar modal solo si el onboarding no está completado
        if (!isCompleted) {
          // Esperar un poco antes de mostrar el modal para no interrumpir el flujo inicial
          setTimeout(() => {
            setShowModal(true)
          }, 1000)
        }
      } catch (error) {
        console.error('Error verificando onboarding:', error)
        // En caso de error, no mostrar el modal para no bloquear al usuario
      } finally {
        setIsChecking(false)
      }
    }

    verifyOnboarding()
  }, [isAuthenticated, user, checkIsCompleted])

  const handleComplete = () => {
    setShowModal(false)
    // Opcional: recargar datos del usuario o mostrar mensaje de éxito
  }

  const handleClose = () => {
    // No permitir cerrar si el onboarding no está completo
    // El modal solo se puede cerrar cuando el usuario completa todos los pasos obligatorios
    // Esto se maneja dentro del OnboardingModal
  }

  return (
    <>
      {children}
      {!isChecking && (
        <OnboardingModal
          isOpen={showModal}
          onClose={handleClose}
          onComplete={handleComplete}
        />
      )}
    </>
  )
}

