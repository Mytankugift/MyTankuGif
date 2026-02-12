/**
 * Modal principal de onboarding
 * Wizard de 3 pasos con barra de progreso
 */

'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { OnboardingStepUsername } from './onboarding-step-username'
import { OnboardingStepBirthday } from './onboarding-step-birthday'
import { OnboardingStepCategories } from './onboarding-step-categories'
import { OnboardingStepActivities } from './onboarding-step-activities'
import { OnboardingStepAddress } from './onboarding-step-address'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ONBOARDING_CATEGORIES, ONBOARDING_ACTIVITIES } from '@/lib/constants/onboarding'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { updateOnboardingData, getOnboardingData, isLoading } = useOnboarding()
  const { user } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(0) // Empezar en 0 para username
  const [username, setUsername] = useState<string>('')
  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [day, setDay] = useState<number | null>(null)
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>([])
  const [selectedActivitySlugs, setSelectedActivitySlugs] = useState<string[]>([])
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map()) // slug -> id
  const [addressData, setAddressData] = useState<any>(null) // Datos de dirección si se completa
  const [giftPreferences, setGiftPreferences] = useState<{ allowGiftShipping: boolean; useMainAddressForGifts: boolean } | null>(null)

  // Cargar categorías del backend para mapear slugs a IDs
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiClient.get<Array<{ id: string; name: string; handle: string }>>(
          API_ENDPOINTS.CATEGORIES.LIST
        )

        if (response.success && Array.isArray(response.data)) {
          const map = new Map<string, string>()
          
          // Mapear por handle (que debería coincidir con nuestros slugs)
          response.data.forEach((cat) => {
            // Normalizar handle para comparar con nuestros slugs
            const normalizedHandle = cat.handle.toLowerCase().replace(/\s+/g, '-')
            map.set(normalizedHandle, cat.id)
            
            // También mapear por nombre normalizado como fallback
            const normalizedName = cat.name.toLowerCase().replace(/\s+/g, '-')
            map.set(normalizedName, cat.id)
          })

          setCategoryMap(map)
        }
      } catch (error) {
        console.error('Error cargando categorías:', error)
      }
    }

    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0) // Empezar con username
      setUsername(user?.username || '')
      setYear(null)
      setMonth(null)
      setDay(null)
      setSelectedCategorySlugs([])
      setSelectedActivitySlugs([])
      setAddressData(null)
      setGiftPreferences(null)
    }
  }, [isOpen, user?.username])

  // Validar si se puede avanzar al siguiente paso
  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username)
      case 1:
        return year !== null && month !== null && day !== null
      case 2:
        return selectedCategorySlugs.length >= 1
      case 3:
        return selectedActivitySlugs.length >= 1
      case 4:
        // El paso de dirección es opcional, siempre se puede proceder
        return true
      default:
        return false
    }
  }

  // Guardar datos incrementales después de cada paso
  const handleNext = async () => {
    if (currentStep === 0) {
      // El username ya se guardó en OnboardingStepUsername
      setCurrentStep(1)
    } else if (currentStep < 4) {
      // Guardar datos del paso actual antes de avanzar
      await saveCurrentStep()
      setCurrentStep(currentStep + 1)
    } else if (currentStep === 4) {
      // Paso de dirección: guardar dirección y preferencias, luego completar
      await handleComplete()
    } else {
      // Último paso: guardar y completar
      await handleComplete()
    }
  }

  const handleAddressComplete = async () => {
    // El componente OnboardingStepAddress ya maneja todo
    // Solo completar el onboarding
    await handleComplete()
  }

  const handleAddressSkip = async () => {
    // Omitir dirección, completar onboarding
    await handleComplete()
  }

  const handleUsernameNext = (newUsername: string) => {
    setUsername(newUsername)
    setCurrentStep(1)
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Verificar si el onboarding está completo (todos los pasos obligatorios)
  const isOnboardingComplete = () => {
    const hasUsername = username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username)
    const hasBirthday = year !== null && month !== null && day !== null
    const hasCategories = selectedCategorySlugs.length >= 1
    const hasActivities = selectedActivitySlugs.length >= 1
    return hasUsername && hasBirthday && hasCategories && hasActivities
  }

  const saveCurrentStep = async () => {
    try {
      const completedSteps: string[] = []
      if (year && month && day) completedSteps.push('birthday')
      if (selectedCategorySlugs.length > 0) completedSteps.push('categories')
      if (selectedActivitySlugs.length > 0) completedSteps.push('activities')

      // Formatear fecha completa como "YYYY-MM-DD"
      const birthDateString = year && month && day 
        ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` 
        : null

      // Mapear slugs de categorías a IDs del backend
      const categoryIds: string[] = selectedCategorySlugs
        .map((slug) => categoryMap.get(slug))
        .filter((id): id is string => id !== undefined)

      await updateOnboardingData({
        birthDate: birthDateString, // Guardar como string "MM-DD"
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        activities: selectedActivitySlugs,
        completedSteps,
      })
    } catch (error) {
      console.error('Error guardando paso del onboarding:', error)
      // No bloquear el flujo, solo loguear el error
    }
  }

  const handleComplete = async () => {
    try {
      // Verificar que todos los pasos obligatorios estén completos antes de finalizar
      if (!isOnboardingComplete()) {
        console.error('No se puede completar el onboarding: faltan pasos obligatorios')
        return
      }
      
      await saveCurrentStep()
      onComplete?.()
      onClose()
    } catch (error) {
      console.error('Error completando onboarding:', error)
      // Mostrar error al usuario si es necesario
    }
  }

  const toggleCategory = (slug: string) => {
    setSelectedCategorySlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  const toggleActivity = (slug: string) => {
    setSelectedActivitySlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  if (!isOpen) return null

  const totalSteps = 5 // username, birthday, categories, activities, address
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-[#73FFA2]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-[#66DEDB]">Bienvenido</h1>
            <span className="text-xs text-gray-400">Paso {currentStep + 1}/5</span>
          </div>
          {/* Solo permitir cerrar si el onboarding está completo */}
          {isOnboardingComplete() ? (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
              aria-label="Cerrar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-5 h-5" /> // Espaciador para mantener el layout
          )}
        </div>

        {/* Barra de progreso */}
        <div className="px-4 py-2 bg-gray-800">
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div
              className="bg-[#73FFA2] h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {currentStep === 0 && (
            <OnboardingStepUsername
              onNext={handleUsernameNext}
              initialUsername={user?.username || null}
            />
          )}

          {currentStep === 1 && (
            <OnboardingStepBirthday
              year={year}
              month={month}
              day={day}
              onYearChange={setYear}
              onMonthChange={setMonth}
              onDayChange={setDay}
            />
          )}

          {currentStep === 2 && (
            <OnboardingStepCategories
              selectedCategorySlugs={selectedCategorySlugs}
              onToggleCategory={toggleCategory}
            />
          )}

          {currentStep === 3 && (
            <OnboardingStepActivities
              selectedActivitySlugs={selectedActivitySlugs}
              onToggleActivity={toggleActivity}
            />
          )}

          {currentStep === 4 && (
            <OnboardingStepAddress
              onSkip={handleAddressSkip}
              onComplete={handleAddressComplete}
            />
          )}
        </div>

        {/* Footer con botones */}
        <div className="flex items-center justify-between p-3 border-t border-gray-700 bg-gray-800">
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={currentStep === 0 || isLoading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 text-sm px-4 py-2 h-8"
          >
            Atrás
          </Button>

          {currentStep === 0 ? (
            // El botón de continuar está dentro de OnboardingStepUsername
            <div />
          ) : currentStep === 4 ? (
            // El paso de dirección maneja sus propios botones
            <div />
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              className="bg-[#73FFA2] hover:bg-[#66DEDB] text-gray-900 font-semibold px-6 py-2 h-8 text-sm"
            >
              {isLoading ? 'Guardando...' : currentStep === 3 ? 'Continuar' : 'Continuar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

