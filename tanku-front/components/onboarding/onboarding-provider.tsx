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
      // Validación más estricta: verificar que el usuario esté realmente autenticado
      // y tenga un ID válido antes de verificar el onboarding
      if (!isAuthenticated || !user || !user.id) {
        setShowModal(false)
        setIsChecking(false)
        return
      }

      try {
        const isCompleted = await checkIsCompleted()
        
        // Mostrar modal solo si el onboarding no está completado
        // y el usuario está autenticado con un ID válido
        if (!isCompleted && isAuthenticated && user?.id) {
          // Esperar un poco antes de mostrar el modal para no interrumpir el flujo inicial
          setTimeout(() => {
            // Verificar nuevamente antes de mostrar (por si el estado cambió durante el timeout)
            const currentState = useAuthStore.getState()
            if (currentState.isAuthenticated && currentState.user?.id) {
              setShowModal(true)
            } else {
              setShowModal(false)
            }
          }, 1000)
        } else {
          setShowModal(false)
        }
      } catch (error) {
        console.error('Error verificando onboarding:', error)
        // En caso de error, no mostrar el modal para no bloquear al usuario
        setShowModal(false)
      } finally {
        setIsChecking(false)
      }
    }

    verifyOnboarding()
  }, [isAuthenticated, user?.id, checkIsCompleted]) // Cambiar user a user?.id para evitar re-renders innecesarios

  // Asegurarse de que el modal se oculte si el usuario se desautentica
  useEffect(() => {
    if (!isAuthenticated || !user || !user.id) {
      setShowModal(false)
    }
  }, [isAuthenticated, user?.id])

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

