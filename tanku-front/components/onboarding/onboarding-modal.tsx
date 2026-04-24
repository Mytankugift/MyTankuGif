/**
 * Modal principal de onboarding
 * Wizard de 3 pasos con barra de progreso
 */

'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { OnboardingStepUsername } from './onboarding-step-username'
import { OnboardingStepBirthday } from './onboarding-step-birthday'
import { OnboardingStepCategories } from './onboarding-step-categories'
import { OnboardingStepActivities } from './onboarding-step-activities'
import { OnboardingStepAddress } from './onboarding-step-address'
import { OnboardingAdultConfirmMiniModal } from './onboarding-adult-confirm-mini-modal'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { isAdultFromBirthParts } from '@/lib/utils/age-policy'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ONBOARDING_CATEGORIES, ONBOARDING_ACTIVITIES } from '@/lib/constants/onboarding'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

type OnboardingContentStep =
  | 'username'
  | 'birthday'
  | 'categories'
  | 'activities'
  | 'address'

function getOnboardingContentStep(step: number): OnboardingContentStep {
  if (step === 0) return 'username'
  if (step === 1) return 'birthday'
  if (step === 2) return 'categories'
  if (step === 3) return 'activities'
  if (step === 4) return 'address'
  return 'username'
}

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
  /**
   * Índices internos del wizard (0 usuario … 4 dirección).
   * [2, 3] = categorías + actividades (pasos 3 y 4 del onboarding de 5 pasos).
   */
  onlySteps?: number[]
}

export function OnboardingModal({
  isOpen,
  onClose,
  onComplete,
  onlySteps,
}: OnboardingModalProps) {
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
  const [showAdultConfirmModal, setShowAdultConfirmModal] = useState(false)

  const isAdult = isAdultFromBirthParts(year, month, day)
  const totalStepsDisplay = 5

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
            let savedY: number | null = null
            let savedM: number | null = null
            let savedD: number | null = null

            // Restaurar fecha de nacimiento
            if (savedData.birthDate) {
              if (typeof savedData.birthDate === 'string') {
                const parts = savedData.birthDate.split('-')
                if (parts.length === 3) {
                  const [y, m, d] = parts.map(Number)
                  savedY = y
                  savedM = m
                  savedD = d
                  setYear(y)
                  setMonth(m)
                  setDay(d)
                } else if (parts.length === 2) {
                  // Formato legacy "MM-DD"
                  const [m, d] = parts.map(Number)
                  savedY = 2000
                  savedM = m
                  savedD = d
                  setYear(2000) // Año por defecto para formato legacy
                  setMonth(m)
                  setDay(d)
                }
              } else {
                const date = new Date(savedData.birthDate)
                savedY = date.getFullYear()
                savedM = date.getMonth() + 1
                savedD = date.getDate()
                setYear(savedY)
                setMonth(savedM)
                setDay(savedD)
              }
            }

            const savedAdult = isAdultFromBirthParts(savedY, savedM, savedD)

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

            // Determinar en qué paso debería estar el usuario (flujo completo únicamente)
            if (!onlySteps?.length) {
              if (user?.username && savedData.birthDate && savedData.categoryIds && savedData.categoryIds.length > 0 && savedData.activities && savedData.activities.length > 0) {
                setCurrentStep(4) // Dirección
              } else if (user?.username && savedData.birthDate && savedData.categoryIds && savedData.categoryIds.length > 0) {
                setCurrentStep(3) // Actividades
              } else if (user?.username && savedData.birthDate) {
                setCurrentStep(2) // Categorías
              } else if (user?.username) {
                setCurrentStep(1) // Cumpleaños
              }
            }
          }
        } catch (error) {
          console.error('Error cargando datos guardados:', error)
        }
      }
    }
    loadSavedData()
  }, [isOpen, categoryIdToSlugMap, getOnboardingData, user?.username, onlySteps])

  // Resetear estado solo cuando se abre por primera vez (no cuando ya estaba abierto)
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      if (onlySteps?.length) {
        setCurrentStep(onlySteps[0])
      } else {
        setCurrentStep(0)
      }
      setUsername(user?.username || '')
      if (!onlySteps?.length) {
        setYear(null)
        setMonth(null)
        setDay(null)
        setSelectedCategorySlugs([])
        setSelectedActivitySlugs([])
      }
      setAddressData(null)
      setGiftPreferences(null)
      setShowAdultConfirmModal(false)
      setHasInitialized(true)
    } else if (!isOpen) {
      setHasInitialized(false)
      setShowAdultConfirmModal(false)
    }
  }, [isOpen, hasInitialized, user?.username, onlySteps])

  // Validar si se puede avanzar al siguiente paso
  const canProceed = () => {
    const content = getOnboardingContentStep(currentStep)
    switch (content) {
      case 'username':
        return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username)
      case 'birthday':
        return year !== null && month !== null && day !== null
      case 'categories':
        return selectedCategorySlugs.length >= 1
      case 'activities':
        return selectedActivitySlugs.length >= 1
      case 'address':
        return true
      default:
        return false
    }
  }

  // Guardar datos incrementales después de cada paso
  const handleNext = async () => {
    if (onlySteps?.length) {
      const idx = onlySteps.indexOf(currentStep)
      if (idx === -1) return
      await saveCurrentStep()
      if (idx >= onlySteps.length - 1) {
        onComplete?.()
        onClose()
        return
      }
      setCurrentStep(onlySteps[idx + 1])
      return
    }

    if (currentStep === 0) {
      setCurrentStep(1)
      return
    }

    const content = getOnboardingContentStep(currentStep)

    if (currentStep === 1) {
      await saveCurrentStep()
      if (isAdult) {
        setShowAdultConfirmModal(true)
      } else {
        setCurrentStep(2)
      }
      return
    }

    if (content === 'address') {
      return
    }

    if (currentStep < 4) {
      await saveCurrentStep()
      setCurrentStep(currentStep + 1)
    }
  }

  const handleAdultMiniConfirm = async () => {
    try {
      await updateOnboardingData({ recordAgeConsent: true })
    } catch (e) {
      console.error('Error registrando consentimiento de edad:', e)
    }
    setShowAdultConfirmModal(false)
    setCurrentStep(2)
  }

  const handleAdultCorrectDate = () => {
    setShowAdultConfirmModal(false)
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
    if (showAdultConfirmModal) {
      handleAdultCorrectDate()
      return
    }
    if (onlySteps?.length) {
      const idx = onlySteps.indexOf(currentStep)
      if (idx <= 0) {
        onClose()
        return
      }
      setCurrentStep(onlySteps[idx - 1])
      return
    }
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
        ...(onlySteps?.length ? {} : { birthDate: birthDateString }),
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

  const contentStep = getOnboardingContentStep(currentStep)
  const isAddressStep = currentStep === 4 && !onlySteps?.length

  const progressSegmentCount = onlySteps?.length ?? totalStepsDisplay
  const progressFilledIndex = onlySteps?.length
    ? Math.max(0, onlySteps.indexOf(currentStep))
    : currentStep
  const displayStepIndex = onlySteps?.length ? onlySteps.indexOf(currentStep) + 1 : currentStep + 1
  const displayStepTotal = onlySteps?.length ?? totalStepsDisplay

  const isPreferencesOnly = Boolean(onlySteps?.length)

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-3 sm:p-4">
      <div
        className="flex w-full max-h-[min(90dvh,720px)] flex-col overflow-hidden rounded-[25px] border-2 sm:min-h-0"
        style={{
          backgroundColor: '#262626',
          borderColor: '#73FFA2',
          maxWidth: '600px',
          width: 'min(100%, 600px)',
          minHeight: isPreferencesOnly ? 'min(70dvh, 560px)' : 'min(90dvh, 600px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
          <div className="min-w-0 flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <h1
              className={
                isPreferencesOnly
                  ? 'text-lg font-semibold leading-tight sm:text-xl md:text-2xl'
                  : 'text-2xl font-semibold sm:text-3xl md:text-4xl'
              }
              style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}
            >
              {isPreferencesOnly ? 'Preferencias' : 'Bienvenido'}
            </h1>
            <span
              className="shrink-0 text-xs text-[#B7B7B7] sm:text-sm"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Paso {displayStepIndex}/{displayStepTotal}
            </span>
          </div>
          {/* Flujo parcial (preferencias): siempre cerrar; flujo completo: solo si ya completó obligatorios */}
          {onlySteps?.length || isOnboardingComplete() ? (
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
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="flex gap-2">
            {Array.from({ length: progressSegmentCount }).map((_, index) => (
              <div
                key={index}
                className="flex-1 h-2 rounded transition-all duration-300"
                style={{
                  backgroundColor: index <= progressFilledIndex ? '#73FFA2' : '#66DEDB',
                }}
              />
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div
          className="custom-scrollbar flex-1 overflow-y-auto overflow-y-visible px-3 pb-4 sm:px-4 sm:pb-6 md:overflow-y-auto"
          style={{
            minHeight: isPreferencesOnly ? 'min(40dvh, 360px)' : '320px',
            maxHeight: isPreferencesOnly ? 'min(50dvh, 440px)' : '520px',
          }}
        >
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

          {contentStep === 'categories' && (
            <OnboardingStepCategories
              selectedCategorySlugs={selectedCategorySlugs}
              onToggleCategory={toggleCategory}
            />
          )}

          {contentStep === 'activities' && (
            <OnboardingStepActivities
              selectedActivitySlugs={selectedActivitySlugs}
              onToggleActivity={toggleActivity}
            />
          )}

          {contentStep === 'address' && (
            <OnboardingStepAddress
              onSkip={handleAddressSkip}
              onComplete={handleAddressComplete}
            />
          )}
        </div>

        {/* Footer con botones fijos */}
        <div className="flex items-center justify-between p-4">
          {currentStep === 0 && !onlySteps?.length ? (
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

          {currentStep === 0 && !onlySteps?.length ? (
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
          ) : isAddressStep ? (
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

      <OnboardingAdultConfirmMiniModal
        open={showAdultConfirmModal}
        onConfirm={handleAdultMiniConfirm}
        onCorrectDate={handleAdultCorrectDate}
      />
    </div>
  )
}

