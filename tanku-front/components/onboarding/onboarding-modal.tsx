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
  const [categoryIdToSlugMap, setCategoryIdToSlugMap] = useState<Map<string, string>>(new Map()) // id -> slug
  const [addressData, setAddressData] = useState<any>(null) // Datos de dirección si se completa
  const [giftPreferences, setGiftPreferences] = useState<{ allowGiftShipping: boolean; useMainAddressForGifts: boolean } | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false) // Flag para evitar resetear cuando ya estaba abierto

  // Cargar categorías del backend para mapear slugs a IDs
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiClient.get<Array<{ id: string; name: string; handle: string }>>(
          API_ENDPOINTS.CATEGORIES.LIST
        )

        if (response.success && Array.isArray(response.data)) {
          const slugToIdMap = new Map<string, string>()
          const idToSlugMap = new Map<string, string>()
          
          // Mapear por handle (que debería coincidir con nuestros slugs)
          response.data.forEach((cat) => {
            // Normalizar handle para comparar con nuestros slugs
            const normalizedHandle = cat.handle.toLowerCase().replace(/\s+/g, '-')
            slugToIdMap.set(normalizedHandle, cat.id)
            idToSlugMap.set(cat.id, normalizedHandle)
            
            // También mapear por nombre normalizado como fallback
            const normalizedName = cat.name.toLowerCase().replace(/\s+/g, '-')
            slugToIdMap.set(normalizedName, cat.id)
            idToSlugMap.set(cat.id, normalizedName)
          })

          setCategoryMap(slugToIdMap)
          setCategoryIdToSlugMap(idToSlugMap)
        }
      } catch (error) {
        console.error('Error cargando categorías:', error)
      }
    }

    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  // Cargar datos guardados del onboarding al abrir el modal
  useEffect(() => {
    const loadSavedData = async () => {
      if (isOpen && categoryIdToSlugMap.size > 0) {
        try {
          const savedData = await getOnboardingData()
          if (savedData) {
            // Restaurar fecha de nacimiento
            if (savedData.birthDate) {
              if (typeof savedData.birthDate === 'string') {
                const parts = savedData.birthDate.split('-')
                if (parts.length === 3) {
                  const [y, m, d] = parts.map(Number)
                  setYear(y)
                  setMonth(m)
                  setDay(d)
                } else if (parts.length === 2) {
                  // Formato legacy "MM-DD"
                  const [m, d] = parts.map(Number)
                  setYear(2000) // Año por defecto para formato legacy
                  setMonth(m)
                  setDay(d)
                }
              } else {
                const date = new Date(savedData.birthDate)
                setYear(date.getFullYear())
                setMonth(date.getMonth() + 1)
                setDay(date.getDate())
              }
            }

            // Restaurar categorías seleccionadas - mapear IDs a slugs
            if (savedData.categoryIds && savedData.categoryIds.length > 0) {
              const slugs: string[] = []
              savedData.categoryIds.forEach((categoryId) => {
                const slug = categoryIdToSlugMap.get(categoryId)
                if (slug) {
                  slugs.push(slug)
                }
              })
              setSelectedCategorySlugs(slugs)
            }

            // Restaurar actividades seleccionadas
            if (savedData.activities && savedData.activities.length > 0) {
              setSelectedActivitySlugs(savedData.activities)
            }

            // Determinar en qué paso debería estar el usuario
            // Si tiene username, birthday, categories y activities, ir al paso 4 (dirección)
            if (user?.username && savedData.birthDate && savedData.categoryIds && savedData.categoryIds.length > 0 && savedData.activities && savedData.activities.length > 0) {
              setCurrentStep(4) // Ir directamente al paso de dirección
            } else if (user?.username && savedData.birthDate && savedData.categoryIds && savedData.categoryIds.length > 0) {
              setCurrentStep(3) // Ir al paso de actividades
            } else if (user?.username && savedData.birthDate) {
              setCurrentStep(2) // Ir al paso de categorías
            } else if (user?.username) {
              setCurrentStep(1) // Ir al paso de birthday
            }
          }
        } catch (error) {
          console.error('Error cargando datos guardados:', error)
        }
      }
    }
    loadSavedData()
  }, [isOpen, categoryIdToSlugMap, getOnboardingData, user?.username])

  // Resetear estado solo cuando se abre por primera vez (no cuando ya estaba abierto)
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      setCurrentStep(0) // Empezar con username
      setUsername(user?.username || '')
      setYear(null)
      setMonth(null)
      setDay(null)
      setSelectedCategorySlugs([])
      setSelectedActivitySlugs([])
      setAddressData(null)
      setGiftPreferences(null)
      setHasInitialized(true)
    } else if (!isOpen) {
      setHasInitialized(false)
    }
  }, [isOpen, hasInitialized, user?.username])

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div 
        className="rounded-[25px] w-full overflow-hidden flex flex-col border-2"
        style={{ 
          backgroundColor: '#262626',
          borderColor: '#73FFA2',
          maxWidth: '600px',
          maxHeight: '720px',
          minHeight: '600px',
          width: '90%'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-semibold" style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}>Bienvenido</h1>
            <span className="text-sm" style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}>Paso {currentStep + 1}/5</span>
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

        {/* Barra de progreso - 5 bloques */}
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex-1 h-2 rounded transition-all duration-300"
                style={{
                  backgroundColor: index <= currentStep ? '#73FFA2' : '#66DEDB',
                }}
              />
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar" style={{ minHeight: '520px', maxHeight: '520px' }}>
          {currentStep === 0 && (
            <OnboardingStepUsername
              onNext={handleUsernameNext}
              initialUsername={user?.username || null}
              onUsernameChange={setUsername}
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

        {/* Footer con botones fijos */}
        <div className="flex items-center justify-between p-4">
          {currentStep === 0 ? (
            <div style={{ width: '120px' }} />
          ) : (
            <button
              onClick={handleBack}
              disabled={isLoading}
              className="font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
              style={{
                width: '120px',
                height: '40px',
                backgroundColor: !isLoading ? '#73FFA2' : '#4A4A4A',
                color: !isLoading ? '#262626' : '#666',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              Atrás
            </button>
          )}

          {currentStep === 0 ? (
            <button
              onClick={async () => {
                if (username && username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username)) {
                  try {
                    const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.ME, { username })
                    if (response.success) {
                      handleUsernameNext(username)
                    }
                  } catch (error) {
                    console.error('Error actualizando username:', error)
                  }
                }
              }}
              disabled={!username || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)}
              className="font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
              style={{
                width: '120px',
                height: '40px',
                backgroundColor: (username && username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username)) ? '#73FFA2' : '#4A4A4A',
                color: (username && username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username)) ? '#262626' : '#666',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              Continuar
            </button>
          ) : currentStep === 4 ? (
            <button
              onClick={handleAddressSkip}
              className="font-semibold transition-all rounded-full"
              style={{
                width: '120px',
                height: '40px',
                backgroundColor: '#73FFA2',
                color: '#262626',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              Finalizar
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              className="font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
              style={{
                width: '120px',
                height: '40px',
                backgroundColor: canProceed() && !isLoading ? '#73FFA2' : '#4A4A4A',
                color: canProceed() && !isLoading ? '#262626' : '#666',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              {isLoading ? 'Guardando...' : 'Continuar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

