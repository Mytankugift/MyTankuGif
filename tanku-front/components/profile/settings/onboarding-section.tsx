'use client'

import { useState, useEffect } from 'react'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { ONBOARDING_CATEGORIES, ONBOARDING_ACTIVITIES } from '@/lib/constants/onboarding'
import { CheckIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
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
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map()) // slug -> id
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string; handle: string }>>([])
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const [showActivitySelector, setShowActivitySelector] = useState(false)

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
            // También mapear por ID directamente
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

  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [day, setDay] = useState<number | null>(null)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<Map<string, string>>(new Map()) // id -> name
  const [selectedActivitySlugs, setSelectedActivitySlugs] = useState<string[]>([])

  // Inicializar datos cuando se cargan
  useEffect(() => {
    if (onboardingData && allCategories.length > 0) {
      // Parsear fecha de nacimiento
      if (onboardingData.birthDate) {
        const date = new Date(onboardingData.birthDate)
        setYear(date.getFullYear())
        setMonth(date.getMonth() + 1)
        setDay(date.getDate())
      }

      // Cargar categorías seleccionadas
      if (onboardingData.categoryIds && onboardingData.categoryIds.length > 0) {
        setSelectedCategoryIds(onboardingData.categoryIds)
        const namesMap = new Map<string, string>()
        onboardingData.categoryIds.forEach((id) => {
          const category = allCategories.find((c) => c.id === id)
          if (category) {
            namesMap.set(id, category.name)
          }
        })
        setSelectedCategoryNames(namesMap)
      }

      // Cargar actividades seleccionadas
      if (onboardingData.activities) {
        setSelectedActivitySlugs(onboardingData.activities)
      }
    }
  }, [onboardingData, allCategories])

  const saveOnboardingData = async (newCategoryIds?: string[], newActivitySlugs?: string[]) => {
    setIsSaving(true)
    setError(null)
    try {
      let birthDate: string | null = null
      if (year && month && day) {
        birthDate = new Date(year, month - 1, day).toISOString()
      }

      const updateData: UpdateOnboardingDataDTO = {
        birthDate,
        categoryIds: (newCategoryIds ?? selectedCategoryIds).length > 0 ? (newCategoryIds ?? selectedCategoryIds) : undefined,
        activities: (newActivitySlugs ?? selectedActivitySlugs).length > 0 ? (newActivitySlugs ?? selectedActivitySlugs) : undefined,
      }

      await updateOnboardingData(updateData)
      if (onUpdate) {
        onUpdate()
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar datos')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddCategory = async (categoryId: string) => {
    if (!selectedCategoryIds.includes(categoryId)) {
      const category = allCategories.find((c) => c.id === categoryId)
      if (category) {
        const newCategoryIds = [...selectedCategoryIds, categoryId]
        setSelectedCategoryIds(newCategoryIds)
        const newNames = new Map(selectedCategoryNames).set(categoryId, category.name)
        setSelectedCategoryNames(newNames)
        setShowCategorySelector(false)
        // Guardar automáticamente
        await saveOnboardingData(newCategoryIds, undefined)
      }
    } else {
      setShowCategorySelector(false)
    }
  }

  const handleRemoveCategory = async (categoryId: string) => {
    const newCategoryIds = selectedCategoryIds.filter((id) => id !== categoryId)
    setSelectedCategoryIds(newCategoryIds)
    const newNames = new Map(selectedCategoryNames)
    newNames.delete(categoryId)
    setSelectedCategoryNames(newNames)
    // Guardar automáticamente
    await saveOnboardingData(newCategoryIds, undefined)
  }

  const handleAddActivity = async (activitySlug: string) => {
    if (!selectedActivitySlugs.includes(activitySlug)) {
      const newActivitySlugs = [...selectedActivitySlugs, activitySlug]
      setSelectedActivitySlugs(newActivitySlugs)
      setShowActivitySelector(false)
      // Guardar automáticamente
      await saveOnboardingData(undefined, newActivitySlugs)
    } else {
      setShowActivitySelector(false)
    }
  }

  const handleRemoveActivity = async (activitySlug: string) => {
    const newActivitySlugs = selectedActivitySlugs.filter((slug) => slug !== activitySlug)
    setSelectedActivitySlugs(newActivitySlugs)
    // Guardar automáticamente
    await saveOnboardingData(undefined, newActivitySlugs)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Construir fecha de nacimiento
      let birthDate: string | null = null
      if (year && month && day) {
        birthDate = new Date(year, month - 1, day).toISOString()
      }

      const updateData: UpdateOnboardingDataDTO = {
        birthDate,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
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
      setError(err.message || 'Error al actualizar datos de onboarding')
    } finally {
      setIsSaving(false)
    }
  }

  // Obtener actividades disponibles que no están seleccionadas
  const availableActivities = ONBOARDING_ACTIVITIES.filter(
    (activity) => !selectedActivitySlugs.includes(activity.slug)
  )

  // Obtener categorías disponibles que no están seleccionadas
  const availableCategories = allCategories.filter(
    (category) => !selectedCategoryIds.includes(category.id)
  )

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

  return (
    <div className="bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors space-y-6">
      <h3 className="text-lg font-semibold text-[#73FFA2] mb-4">Datos del Onboarding</h3>
      
      {error && (
        <div className="bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Fecha de nacimiento */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Fecha de Nacimiento</label>
        <div className="flex gap-2">
          <select
            value={day || ''}
            onChange={async (e) => {
              const newDay = e.target.value ? parseInt(e.target.value) : null
              setDay(newDay)
              if (newDay && month && year) {
                await saveOnboardingData()
              }
            }}
            className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-[#73FFA2]"
            disabled={isSaving}
          >
            <option value="">Día</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={month || ''}
            onChange={async (e) => {
              const newMonth = e.target.value ? parseInt(e.target.value) : null
              setMonth(newMonth)
              if (day && newMonth && year) {
                await saveOnboardingData()
              }
            }}
            className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-[#73FFA2]"
            disabled={isSaving}
          >
            <option value="">Mes</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleDateString('es-ES', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={year || ''}
            onChange={async (e) => {
              const newYear = e.target.value ? parseInt(e.target.value) : null
              setYear(newYear)
              if (day && month && newYear) {
                await saveOnboardingData()
              }
            }}
            className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-[#73FFA2]"
            disabled={isSaving}
          >
            <option value="">Año</option>
            {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Categorías - Solo mostrar las seleccionadas */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Categorías de Interés</label>
        {selectedCategoryIds.length === 0 ? (
          <p className="text-gray-400 text-sm">No has seleccionado categorías aún</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedCategoryIds.map((categoryId) => (
              <div
                key={categoryId}
                className="flex items-center gap-2 bg-[#73FFA2] text-gray-900 px-3 py-2 rounded-lg text-sm font-medium"
              >
                <span>{selectedCategoryNames.get(categoryId) || 'Categoría'}</span>
                <button
                  onClick={() => handleRemoveCategory(categoryId)}
                  disabled={isSaving}
                  className="hover:bg-gray-800/20 rounded p-0.5 disabled:opacity-50"
                  title="Eliminar categoría"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Botón para agregar categoría */}
        <button
          onClick={() => setShowCategorySelector(!showCategorySelector)}
          disabled={isSaving || availableCategories.length === 0}
          className="flex items-center gap-2 text-[#73FFA2] hover:text-[#66DEDB] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-4 h-4" />
          Agregar Categoría
        </button>

        {/* Selector de categorías */}
        {showCategorySelector && availableCategories.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 border border-gray-700">
            {availableCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleAddCategory(category.id)}
                className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actividades - Solo mostrar las seleccionadas */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Actividades Favoritas</label>
        {selectedActivitySlugs.length === 0 ? (
          <p className="text-gray-400 text-sm">No has seleccionado actividades aún</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedActivitySlugs.map((activitySlug) => {
              const activity = ONBOARDING_ACTIVITIES.find((a) => a.slug === activitySlug)
              if (!activity) return null
              return (
                <div
                  key={activitySlug}
                  className="flex items-center gap-2 bg-[#73FFA2] text-gray-900 px-3 py-2 rounded-lg text-sm font-medium"
                >
                  <span className="mr-1">{activity.emoji}</span>
                  <span>{activity.label}</span>
                  <button
                    onClick={() => handleRemoveActivity(activitySlug)}
                    disabled={isSaving}
                    className="hover:bg-gray-800/20 rounded p-0.5 disabled:opacity-50"
                    title="Eliminar actividad"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Botón para agregar actividad */}
        <button
          onClick={() => setShowActivitySelector(!showActivitySelector)}
          disabled={isSaving || availableActivities.length === 0}
          className="flex items-center gap-2 text-[#73FFA2] hover:text-[#66DEDB] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-4 h-4" />
          Agregar Actividad
        </button>

        {/* Selector de actividades */}
        {showActivitySelector && availableActivities.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 border border-gray-700">
            {availableActivities.map((activity) => (
              <button
                key={activity.slug}
                onClick={() => handleAddActivity(activity.slug)}
                className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors flex items-center gap-2"
              >
                <span>{activity.emoji}</span>
                <span>{activity.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
