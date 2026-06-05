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

  const requiresDataPolicyAcceptance =
    (user as { requiresDataPolicyAcceptance?: boolean } | null)?.requiresDataPolicyAcceptance === true

  useEffect(() => {
    const verifyOnboarding = async () => {
      // Validación más estricta: verificar que el usuario esté realmente autenticado
      // y tenga un ID válido antes de verificar el onboarding
      if (!isAuthenticated || !user || !user.id) {
        setShowModal(false)
        setIsChecking(false)
        return
      }

      // El consentimiento de datos personales tiene prioridad sobre el onboarding
      if (requiresDataPolicyAcceptance) {
        setShowModal(false)
        setIsChecking(false)
        return
      }

      // ✅ Esperar un delay para que feedInit tenga oportunidad de cargar primero
      // Esto evita llamadas duplicadas a /api/v1/users/me/onboarding-data
      const checkDelay = setTimeout(async () => {
        try {
          const currentBeforeCheck = useAuthStore.getState()
          if (
            currentBeforeCheck.user &&
            (currentBeforeCheck.user as { requiresDataPolicyAcceptance?: boolean }).requiresDataPolicyAcceptance === true
          ) {
            setShowModal(false)
            return
          }

          const isCompleted = await checkIsCompleted()
          
          // Mostrar modal solo si el onboarding no está completado
          // y el usuario está autenticado con un ID válido
          if (!isCompleted && isAuthenticated && user?.id) {
            // Esperar un poco antes de mostrar el modal para no interrumpir el flujo inicial
            setTimeout(() => {
              // Verificar nuevamente antes de mostrar (por si el estado cambió durante el timeout)
              const currentState = useAuthStore.getState()
              const stillNeedsConsent =
                (currentState.user as { requiresDataPolicyAcceptance?: boolean } | null)
                  ?.requiresDataPolicyAcceptance === true
              if (currentState.isAuthenticated && currentState.user?.id && !stillNeedsConsent) {
                setShowModal(true)
              } else {
                setShowModal(false)
              }
            }, 1000)
          } else {
            setShowModal(false)
          }
        } catch (error) {
          // Silenciar errores de conexión - no mostrar en consola si es un error esperado
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (!errorMessage.includes('No se pudo conectar al servidor') && 
              !errorMessage.includes('Failed to fetch') &&
              !errorMessage.includes('NetworkError')) {
            // Solo mostrar errores que no sean de conexión
            console.error('Error verificando onboarding:', error)
          }
          // En caso de error, no mostrar el modal para no bloquear al usuario
          setShowModal(false)
        } finally {
          setIsChecking(false)
        }
      }, 3500) // ✅ Esperar 3.5 segundos para que feedInit termine
      
      return () => {
        clearTimeout(checkDelay)
      }
    }

    verifyOnboarding()
  }, [isAuthenticated, user?.id, checkIsCompleted, requiresDataPolicyAcceptance])

  // Asegurarse de que el modal se oculte si el usuario se desautentica o falta consentimiento
  useEffect(() => {
    if (!isAuthenticated || !user || !user.id || requiresDataPolicyAcceptance) {
      setShowModal(false)
    }
  }, [isAuthenticated, user?.id, requiresDataPolicyAcceptance])

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

