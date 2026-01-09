/**
 * Modal principal de onboarding
 * Wizard de 3 pasos con barra de progreso
 */

'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { OnboardingStepBirthday } from './onboarding-step-birthday'
import { OnboardingStepCategories } from './onboarding-step-categories'
import { OnboardingStepActivities } from './onboarding-step-activities'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { ONBOARDING_CATEGORIES, ONBOARDING_ACTIVITIES } from '@/lib/constants/onboarding'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { updateOnboardingData, isLoading } = useOnboarding()
  const [currentStep, setCurrentStep] = useState(1)
  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [day, setDay] = useState<number | null>(null)
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>([])
  const [selectedActivitySlugs, setSelectedActivitySlugs] = useState<string[]>([])
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map()) // slug -> id

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
      setCurrentStep(1)
      setYear(null)
      setMonth(null)
      setDay(null)
      setSelectedCategorySlugs([])
      setSelectedActivitySlugs([])
    }
  }, [isOpen])

  // Validar si se puede avanzar al siguiente paso
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return year !== null && month !== null && day !== null
      case 2:
        return selectedCategorySlugs.length >= 1
      case 3:
        return selectedActivitySlugs.length >= 1
      default:
        return false
    }
  }

  // Guardar datos incrementales después de cada paso
  const handleNext = async () => {
    if (currentStep < 3) {
      // Guardar datos del paso actual antes de avanzar
      await saveCurrentStep()
      setCurrentStep(currentStep + 1)
    } else {
      // Último paso: guardar y completar
      await handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
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

  const progress = (currentStep / 3) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-[#73FFA2]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-[#66DEDB]">Bienvenido</h1>
            <span className="text-xs text-gray-400">Paso {currentStep}/3</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
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
        </div>

        {/* Footer con botones */}
        <div className="flex items-center justify-between p-3 border-t border-gray-700 bg-gray-800">
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={currentStep === 1 || isLoading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 text-sm px-4 py-2 h-8"
          >
            Atrás
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
            className="bg-[#73FFA2] hover:bg-[#66DEDB] text-gray-900 font-semibold px-6 py-2 h-8 text-sm"
          >
            {isLoading ? 'Guardando...' : currentStep === 3 ? 'Listo' : 'Continuar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

