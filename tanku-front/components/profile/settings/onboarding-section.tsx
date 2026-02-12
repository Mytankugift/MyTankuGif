'use client'

import { useState, useEffect } from 'react'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { ONBOARDING_CATEGORIES, ONBOARDING_ACTIVITIES, MONTHS } from '@/lib/constants/onboarding'
import { OnboardingStepBirthday } from '@/components/onboarding/onboarding-step-birthday'
import { OnboardingStepCategories } from '@/components/onboarding/onboarding-step-categories'
import { OnboardingStepActivities } from '@/components/onboarding/onboarding-step-activities'
import { Button } from '@/components/ui/button'
import type { OnboardingDataDTO, UpdateOnboardingDataDTO } from '@/types/api'

interface OnboardingSectionProps {
  onUpdate?: () => void
}

export function OnboardingSection({ onUpdate }: OnboardingSectionProps) {
  const { getOnboardingData, updateOnboardingData, isLoading } = useOnboarding()
  const [onboardingData, setOnboardingData] = useState<OnboardingDataDTO | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0) // 0: birthday, 1: categories, 2: activities
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map()) // slug -> id
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string; handle: string }>>([])

  // Estados para cada paso
  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [day, setDay] = useState<number | null>(null)
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>([])
  const [selectedActivitySlugs, setSelectedActivitySlugs] = useState<string[]>([])

  // Cargar datos de onboarding
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true)
      try {
        const data = await getOnboardingData()
        setOnboardingData(data)
      } catch (err) {
        console.error('Error al cargar datos de onboarding:', err)
      } finally {
        setIsLoadingData(false)
      }
    }
    loadData()
  }, [getOnboardingData])

  // Cargar categorías del backend
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiClient.get<Array<{ id: string; name: string; handle: string }>>(
          API_ENDPOINTS.CATEGORIES.LIST
        )

        if (response.success && Array.isArray(response.data)) {
          setAllCategories(response.data)
          const map = new Map<string, string>()
          response.data.forEach((cat) => {
            const normalizedHandle = cat.handle.toLowerCase().replace(/\s+/g, '-')
            map.set(normalizedHandle, cat.id)
            const normalizedName = cat.name.toLowerCase().replace(/\s+/g, '-')
            map.set(normalizedName, cat.id)
            map.set(cat.id, cat.id)
          })
          setCategoryMap(map)
        }
      } catch (error) {
        console.error('Error cargando categorías:', error)
      }
    }
    loadCategories()
  }, [])

  // Inicializar datos cuando se cargan
  useEffect(() => {
    if (onboardingData && allCategories.length > 0) {
      // Parsear fecha de nacimiento - evitar problemas de zona horaria
      if (onboardingData.birthDate) {
        // Si es un string en formato "YYYY-MM-DD", parsearlo manualmente
        if (typeof onboardingData.birthDate === 'string') {
          const parts = onboardingData.birthDate.split('-')
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
          } else {
            // Intentar parsear como Date
            const date = new Date(onboardingData.birthDate)
            setYear(date.getFullYear())
            setMonth(date.getMonth() + 1)
            setDay(date.getDate())
          }
        } else {
          // Si es un objeto Date o timestamp
          const date = new Date(onboardingData.birthDate)
          setYear(date.getFullYear())
          setMonth(date.getMonth() + 1)
          setDay(date.getDate())
        }
      }

      // Cargar categorías seleccionadas - mapear IDs a slugs
      if (onboardingData.categoryIds && onboardingData.categoryIds.length > 0) {
        const slugs: string[] = []
        onboardingData.categoryIds.forEach((id) => {
          const category = allCategories.find((c) => c.id === id)
          if (category) {
            // Intentar encontrar el slug correspondiente
            const normalizedHandle = category.handle.toLowerCase().replace(/\s+/g, '-')
            const normalizedName = category.name.toLowerCase().replace(/\s+/g, '-')
            // Buscar en las categorías de onboarding
            const onboardingCat = ONBOARDING_CATEGORIES.find(
              (cat) => cat.slug === normalizedHandle || cat.slug === normalizedName
            )
            if (onboardingCat) {
              slugs.push(onboardingCat.slug)
            }
          }
        })
        setSelectedCategorySlugs(slugs)
      }

      // Cargar actividades seleccionadas
      if (onboardingData.activities) {
        setSelectedActivitySlugs(onboardingData.activities)
      }
    }
  }, [onboardingData, allCategories])

  const saveOnboardingData = async () => {
    setIsSaving(true)
    setError(null)
    try {
      // Formatear fecha como "YYYY-MM-DD"
      let birthDate: string | null = null
      if (year && month && day) {
        birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }

      // Mapear slugs de categorías a IDs del backend
      const categoryIds: string[] = selectedCategorySlugs
        .map((slug) => categoryMap.get(slug))
        .filter((id): id is string => id !== undefined)

      const updateData: UpdateOnboardingDataDTO = {
        birthDate,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        activities: selectedActivitySlugs.length > 0 ? selectedActivitySlugs : undefined,
      }

      await updateOnboardingData(updateData)
      
      // Recargar datos
      const updatedData = await getOnboardingData()
      setOnboardingData(updatedData)
      
      if (onUpdate) {
        onUpdate()
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar datos')
    } finally {
      setIsSaving(false)
    }
  }

  const handleNext = async () => {
    if (currentStep < 2) {
      // Guardar antes de avanzar
      await saveOnboardingData()
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
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

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return year !== null && month !== null && day !== null
      case 1:
        return selectedCategorySlugs.length >= 1
      case 2:
        return selectedActivitySlugs.length >= 1
      default:
        return false
    }
  }

  if (isLoadingData) {
    return (
      <div className="bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
          <span className="ml-2 text-white">Cargando datos...</span>
        </div>
      </div>
    )
  }

  const totalSteps = 3
  const progress = ((currentStep + 1) / totalSteps) * 100

  // Formatear fecha para mostrar
  const formatBirthDate = () => {
    if (year && month && day) {
      const monthName = MONTHS.find(m => m.value === month)?.label || ''
      return `${day} de ${monthName} de ${year}`
    }
    return 'No configurada'
  }

  // Obtener nombres de categorías seleccionadas
  const getSelectedCategoryNames = () => {
    return selectedCategorySlugs
      .map(slug => {
        const cat = ONBOARDING_CATEGORIES.find(c => c.slug === slug)
        return cat?.label || slug
      })
      .join(', ')
  }

  // Obtener nombres de actividades seleccionadas
  const getSelectedActivityNames = () => {
    return selectedActivitySlugs
      .map(slug => {
        const act = ONBOARDING_ACTIVITIES.find(a => a.slug === slug)
        return act ? `${act.emoji} ${act.label}` : slug
      })
      .join(', ')
  }

  return (
    <div className="bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#73FFA2]">Datos del Onboarding</h3>
        <span className="text-xs text-gray-400">Paso {currentStep + 1}/{totalSteps}</span>
      </div>

      {/* Resumen de datos actuales */}
      <div className="bg-gray-800/30 rounded-lg p-4 space-y-3 border border-gray-700">
        <div>
          <h4 className="text-sm font-medium text-[#66DEDB] mb-2">Fecha de cumpleaños</h4>
          <p className="text-sm text-gray-300">{formatBirthDate()}</p>
        </div>
        
        {selectedCategorySlugs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[#66DEDB] mb-2">Categorías de interés</h4>
            <p className="text-sm text-gray-300">{getSelectedCategoryNames()}</p>
          </div>
        )}
        
        {selectedActivitySlugs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[#66DEDB] mb-2">Actividades favoritas</h4>
            <p className="text-sm text-gray-300">{getSelectedActivityNames()}</p>
          </div>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-700 rounded-full h-1">
        <div
          className="bg-[#73FFA2] h-1 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Contenido del paso actual */}
      <div className="min-h-[400px]">
        {currentStep === 0 && (
          <OnboardingStepBirthday
            year={year}
            month={month}
            day={day}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onDayChange={setDay}
          />
        )}

        {currentStep === 1 && (
          <OnboardingStepCategories
            selectedCategorySlugs={selectedCategorySlugs}
            onToggleCategory={toggleCategory}
          />
        )}

        {currentStep === 2 && (
          <OnboardingStepActivities
            selectedActivitySlugs={selectedActivitySlugs}
            onToggleActivity={toggleActivity}
          />
        )}
      </div>

      {/* Botones de navegación */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={currentStep === 0 || isLoading || isSaving}
          className="border-gray-600 text-gray-300 hover:bg-gray-700 text-sm px-4 py-2 h-8"
        >
          Atrás
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={saveOnboardingData}
            disabled={isLoading || isSaving || !canProceed()}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 h-8 text-sm disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
          
          {currentStep < 2 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isLoading || isSaving}
              className="bg-[#73FFA2] hover:bg-[#66DEDB] text-gray-900 font-semibold px-6 py-2 h-8 text-sm disabled:opacity-50"
            >
              Siguiente
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
