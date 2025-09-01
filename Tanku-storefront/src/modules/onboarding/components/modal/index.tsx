"use client"

import React, { useState, useEffect } from "react"
import { Button, Heading, Text, clx } from "@medusajs/ui"
import { XMark, ChevronLeft, ChevronRight } from "@medusajs/icons"
import Modal from "@modules/common/components/modal"
import useToggleState from "@lib/hooks/use-toggle-state"
import { 
  getOnboardingStatus, 
  savePhaseOneData, 
  savePhaseTwoData, 
  completeOnboardingPhase,
  handleIncentivePopup 
} from "../../actions/onboarding-actions"

// Types for form data matching database models
export interface PhaseOneData {
  birth_date: string
  gender: string
  marital_status: string
  country: string
  city: string
  languages: string[]
  main_interests: string[]
  representative_colors: string[]
  favorite_activities: string[]
  important_celebrations: string[]
}

export interface PhaseTwoData {
  product_interests: string[]
  favorite_social_networks: string[]
  preferred_interaction: string[]
  purchase_frequency: string
  monthly_budget: string
  brand_preference: string
  purchase_motivation: string
  social_circles: string[]
  wants_connections: string
  connection_types: string[]
  lifestyle_style: string[]
  personal_values: string[]
  platform_expectations: string[]
  preferred_content_type: string[]
  connection_moments: string[]
  shopping_days: string
  ecommerce_experience: string
  social_activity_level: string
  notifications_preference: string
}

// Constants for form options
const GENDER_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "no_binario", label: "No binario" },
  { value: "prefiero_no_decir", label: "Prefiero no decir" }
]

const MARITAL_STATUS_OPTIONS = [
  { value: "soltero", label: "Soltero/a" },
  { value: "en_relacion", label: "En una relación" },
  { value: "casado", label: "Casado/a" },
  { value: "divorciado", label: "Divorciado/a" },
  { value: "viudo", label: "Viudo/a" },
  { value: "union_libre", label: "Unión libre" }
]

const LANGUAGES = [
  "Español", "Inglés", "Francés", "Alemán", "Portugués", "Italiano", 
  "Chino", "Árabe", "Japonés", "Coreano", "Ruso", "Otro"
]

const INTERESTS = [
  "Tecnología", "Viajes", "Música", "Deportes", "Cocina", "Lectura",
  "Cine y TV", "Fotografía", "Gaming", "Arte", "Fitness", "Moda",
  "Emprendimiento", "Salud y bienestar", "Educación", "Naturaleza", "Familia", "Otros"
]

const COLORS = [
  { value: "rojo", label: "Rojo", color: "#EF4444" },
  { value: "naranja", label: "Naranja", color: "#F97316" },
  { value: "amarillo", label: "Amarillo", color: "#EAB308" },
  { value: "verde", label: "Verde", color: "#22C55E" },
  { value: "azul", label: "Azul", color: "#3B82F6" },
  { value: "indigo", label: "Índigo", color: "#6366F1" },
  { value: "violeta", label: "Violeta", color: "#8B5CF6" },
  { value: "rosado", label: "Rosado", color: "#EC4899" },
  { value: "marron", label: "Marrón", color: "#A3A3A3" },
  { value: "negro", label: "Negro", color: "#000000" },
  { value: "blanco", label: "Blanco", color: "#FFFFFF" },
  { value: "gris", label: "Gris", color: "#6B7280" }
]

const ACTIVITIES = [
  "Leer", "Hacer ejercicio/deporte", "Arte/manualidades", "Escuchar música",
  "Ver series/películas", "Estudiar", "Cocinar", "Jugar videojuegos",
  "Fotografía", "Jardinería", "Viajar", "Otra"
]

const CELEBRATIONS = [
  "Navidad", "Año Nuevo", "Día de la Madre", "Día del Padre", "San Valentín",
  "Black Friday", "Cyber Monday", "Día de la Mujer", "Halloween", "Día del Amigo",
  "Día de las Mascotas", "Semana Santa", "Año Nuevo Chino", "Hanukkah", "Día de los Muertos"
]

// Phase 2 constants
const PRODUCT_INTERESTS = [
  "Ropa", "Zapatos", "Accesorios", "Libros", "Tecnología", "Cosméticos",
  "Salud y Bienestar", "Hogar", "Papelería", "Juguetes", "Fitness", "Mascotas",
  "Bebés", "Automóviles", "Manualidades"
]

const SOCIAL_NETWORKS = [
  "Instagram", "TikTok", "Facebook", "YouTube", "X", "Pinterest"
]

const INTERACTION_TYPES = [
  "Compartir contenido", "Ver publicaciones", "Comentar", "Comprar", "Buscar inspiración"
]

const PURCHASE_FREQUENCY_OPTIONS = [
  { value: "una_vez_semana", label: "Una vez por semana" },
  { value: "varias_veces_mes", label: "Varias veces al mes" },
  { value: "una_vez_mes", label: "Una vez al mes" },
  { value: "muy_ocasional", label: "Muy ocasional" }
]

const BUDGET_OPTIONS = [
  { value: "0-100000", label: "$0 - $100.000 COP" },
  { value: "100000-300000", label: "$100.000 - $300.000 COP" },
  { value: "300000-500000", label: "$300.000 - $500.000 COP" },
  { value: "500000-1000000", label: "$500.000 - $1.000.000 COP" },
  { value: "1000000-2000000", label: "$1.000.000 - $2.000.000 COP" },
  { value: "2000000+", label: "Más de $2.000.000 COP" }
]

const BRAND_PREFERENCE_OPTIONS = [
  { value: "reconocidas", label: "Marcas reconocidas" },
  { value: "independientes", label: "Marcas independientes" },
  { value: "ambas", label: "Ambas" }
]

const PURCHASE_MOTIVATION_OPTIONS = [
  { value: "para_mi", label: "Para mí" },
  { value: "para_regalar", label: "Para regalar" },
  { value: "ambos", label: "Ambos" }
]

const SOCIAL_CIRCLES = [
  "Familia", "Amigos", "Estudio", "Trabajo", "Socios", "Gym", "Iglesia", "Vecinos", "Otros"
]

const CONNECTION_OPTIONS = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "tal_vez", label: "Tal vez" }
]

const CONNECTION_TYPES = [
  "Amistades", "Networking", "Colaboraciones", "Relación", "Gustos similares", "Influencers"
]

const LIFESTYLE_STYLES = [
  "Creativo", "Minimalista", "Aventurero", "Analítico", "Espiritual", "Activo"
]

const PERSONAL_VALUES = [
  "Gratitud", "Resiliencia", "Bienestar", "Diversidad", "Colaboración", "Autenticidad", "Pasión", "Excelencia", "Empatía"
]

const PLATFORM_EXPECTATIONS = [
  "Inspiración", "Conocer personas", "Comprar", "Vender", "Aprender", "Comunidad"
]

const CONTENT_TYPES = [
  "Tips", "Opiniones", "Estilo de vida", "Novedades", "Educativo", "Humor"
]

const CONNECTION_MOMENTS = [
  "Mañana", "Tarde", "Noche"
]

const SHOPPING_DAYS_OPTIONS = [
  { value: "semana", label: "Entre semana" },
  { value: "fines_semana", label: "Fines de semana" },
  { value: "sin_preferencia", label: "Sin preferencia" }
]

const ECOMMERCE_EXPERIENCE_OPTIONS = [
  { value: "frecuente", label: "Frecuente" },
  { value: "a_veces", label: "A veces" },
  { value: "nunca", label: "Nunca" }
]

const SOCIAL_ACTIVITY_OPTIONS = [
  { value: "muy_activo", label: "Muy activo" },
  { value: "observador", label: "Observador" },
  { value: "poco_activo", label: "Poco activo" }
]

const NOTIFICATIONS_OPTIONS = [
  { value: "si", label: "Sí, todas" },
  { value: "no", label: "No" },
  { value: "solo_productos", label: "Solo de productos" },
  { value: "solo_amigos", label: "Solo de amigos" },
  { value: "solo_onboarding", label: "Solo de onboarding" }
]

const OnboardingModal = ({ customer_id }: { customer_id?: string }) => {
  const { state, open, close } = useToggleState()
  const [currentPhase, setCurrentPhase] = useState(1)
  const [currentStep, setCurrentStep] = useState(1)
  const [showIncentivePopup, setShowIncentivePopup] = useState(false)
  const [showFloatingBanner, setShowFloatingBanner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)
  
  // Form data state
  const [phaseOneData, setPhaseOneData] = useState<PhaseOneData>({
    birth_date: "",
    gender: "",
    marital_status: "",
    country: "",
    city: "",
    languages: [],
    main_interests: [],
    representative_colors: [],
    favorite_activities: [],
    important_celebrations: []
  })

  const [phaseTwoData, setPhaseTwoData] = useState<PhaseTwoData>({
    product_interests: [],
    favorite_social_networks: [],
    preferred_interaction: [],
    purchase_frequency: "",
    monthly_budget: "",
    brand_preference: "",
    purchase_motivation: "",
    social_circles: [],
    wants_connections: "",
    connection_types: [],
    lifestyle_style: [],
    personal_values: [],
    platform_expectations: [],
    preferred_content_type: [],
    connection_moments: [],
    shopping_days: "",
    ecommerce_experience: "",
    social_activity_level: "",
    notifications_preference: ""
  })

  // Check onboarding status on component mount
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!customer_id) {
        setIsLoading(false)
        return
      }

      try {
        const status = await getOnboardingStatus(customer_id)
        setOnboardingStatus(status)
        
        // Show banner only if onboarding is incomplete
        if (!status.phase_two_completed) {
          // If phase 1 is completed, start from phase 2
          if (status.phase_one_completed) {
            setCurrentPhase(2)
            setCurrentStep(status.phase_two_current_step || 1)
          } else {
            setCurrentPhase(1)
            setCurrentStep(status.phase_one_current_step || 1)
          }
          
          // Show banner after a delay
          setTimeout(() => {
            setShowFloatingBanner(true)
          }, 2000)
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error)
        // If no status exists, show onboarding from the beginning
        setTimeout(() => {
          setShowFloatingBanner(true)
        }, 2000)
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [customer_id])

  const handlePhaseOneComplete = async () => {
    if (!customer_id) return
    
    try {
      // Save Phase 1 data
      await savePhaseOneData(customer_id, phaseOneData)
      
      // Mark Phase 1 as completed
      await completeOnboardingPhase(customer_id, 'one')
      
      setShowIncentivePopup(true)
    } catch (error) {
      console.error("Error completing Phase 1:", error)
      // Handle error - could show a toast notification
    }
  }

  const handleContinueToPhaseTwo = () => {
    setShowIncentivePopup(false)
    setCurrentPhase(2)
    setCurrentStep(1)
  }

  const handlePhaseTwoComplete = async () => {
    if (!customer_id) return
    
    try {
      // Save Phase 2 data
      await savePhaseTwoData(customer_id, phaseTwoData)
      
      // Mark Phase 2 as completed
      await completeOnboardingPhase(customer_id, 'two')
      
      // Hide banner permanently
      setShowFloatingBanner(false)
      
      // Close modal
      close()
    } catch (error) {
      console.error("Error completing Phase 2:", error)
      // Handle error - could show a toast notification
    }
  }

  const handleSkipPhaseTwo = () => {
    setShowIncentivePopup(false)
    close()
  }

  const nextStep = () => {
    const maxSteps = currentPhase === 1 ? 6 : 8
    if (currentStep < maxSteps) {
      setCurrentStep(currentStep + 1)
    } else if (currentPhase === 1) {
      handlePhaseOneComplete()
    } else {
      handlePhaseTwoComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleArraySelection = (
    field: keyof PhaseOneData | keyof PhaseTwoData,
    value: string,
    phase: 1 | 2
  ) => {
    if (phase === 1) {
      const currentArray = (phaseOneData[field as keyof PhaseOneData] as string[]) || []
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      
      setPhaseOneData(prev => ({ ...prev, [field]: newArray }))
    } else {
      const currentArray = (phaseTwoData[field as keyof PhaseTwoData] as string[]) || []
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      
      setPhaseTwoData(prev => ({ ...prev, [field]: newArray }))
    }
  }

  const renderPhaseOneStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Datos Personales</Heading>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">Fecha de Nacimiento *</label>
              <input
                type="date"
                className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                value={phaseOneData.birth_date || ""}
                onChange={(e) => setPhaseOneData(prev => ({ ...prev, birth_date: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Género *</label>
              <select
                className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                value={phaseOneData.gender || ""}
                onChange={(e) => setPhaseOneData(prev => ({ ...prev, gender: e.target.value }))}
                required
              >
                <option value="">Selecciona una opción</option>
                {GENDER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Estado Civil *</label>
              <select
                className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                value={phaseOneData.marital_status || ""}
                onChange={(e) => setPhaseOneData(prev => ({ ...prev, marital_status: e.target.value }))}
                required
              >
                <option value="">Selecciona una opción</option>
                {MARITAL_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">País *</label>
                <input
                  type="text"
                  className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                  value={phaseOneData.country || ""}
                  onChange={(e) => setPhaseOneData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Escribe tu país"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Ciudad *</label>
                <input
                  type="text"
                  className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                  value={phaseOneData.city || ""}
                  onChange={(e) => setPhaseOneData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Escribe tu ciudad"
                  required
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Idiomas que Hablas</Heading>
            <Text className="text-sm text-gray-600">Selecciona al menos un idioma</Text>
            
            <div className="grid grid-cols-3 gap-3">
              {LANGUAGES.map(language => (
                <button
                  key={language}
                  type="button"
                  className={clx(
                    "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                    phaseOneData.languages?.includes(language)
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                  )}
                  onClick={() => handleArraySelection("languages", language, 1)}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Intereses Principales</Heading>
            <Text className="text-sm text-gray-600">Selecciona entre 3 y 8 intereses</Text>
            
            <div className="grid grid-cols-3 gap-3">
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  type="button"
                  className={clx(
                    "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                    phaseOneData.main_interests?.includes(interest)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                  )}
                  onClick={() => handleArraySelection("main_interests", interest, 1)}
                >
                  {interest}
                </button>
              ))}
            </div>
            
            <Text className="text-xs text-gray-500">
              Seleccionados: {phaseOneData.main_interests?.length || 0}/8
            </Text>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Colores que te Representan</Heading>
            <Text className="text-sm text-gray-600">Selecciona al menos 1 color</Text>
            
            <div className="grid grid-cols-4 gap-3">
              {COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  className={clx(
                    "p-4 rounded-lg border-4 text-sm font-medium transition-all flex flex-col items-center space-y-2",
                    phaseOneData.representative_colors?.includes(color.value)
                      ? "border-gray-800 shadow-lg"
                      : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                  )}
                  onClick={() => handleArraySelection("representative_colors", color.value, 1)}
                >
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-gray-300"
                    style={{ backgroundColor: color.color }}
                  />
                  <span className="text-xs">{color.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Actividades que Disfrutas</Heading>
            <Text className="text-sm text-gray-600">Selecciona entre 3 y 5 actividades</Text>
            
            <div className="grid grid-cols-3 gap-3">
              {ACTIVITIES.map(activity => (
                <button
                  key={activity}
                  type="button"
                  className={clx(
                    "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                    phaseOneData.favorite_activities?.includes(activity)
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                  )}
                  onClick={() => handleArraySelection("favorite_activities", activity, 1)}
                >
                  {activity}
                </button>
              ))}
            </div>
            
            <Text className="text-xs text-gray-500">
              Seleccionadas: {phaseOneData.favorite_activities?.length || 0}/5
            </Text>
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Celebraciones Importantes</Heading>
            <Text className="text-sm text-gray-600">Opcional - Ayuda a personalizar tu experiencia</Text>
            
            <div className="grid grid-cols-3 gap-3">
              {CELEBRATIONS.map(celebration => (
                <button
                  key={celebration}
                  type="button"
                  className={clx(
                    "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                    phaseOneData.important_celebrations?.includes(celebration)
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                  )}
                  onClick={() => handleArraySelection("important_celebrations", celebration, 1)}
                >
                  {celebration}
                </button>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const renderPhaseTwoStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Tipos de Productos que te Interesan</Heading>
            
            <div className="grid grid-cols-3 gap-3">
              {PRODUCT_INTERESTS.map(product => (
                <button
                  key={product}
                  type="button"
                  className={clx(
                    "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                    phaseTwoData.product_interests?.includes(product)
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                  )}
                  onClick={() => handleArraySelection("product_interests", product, 2)}
                >
                  {product}
                </button>
              ))}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Redes Sociales e Interacción</Heading>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">Redes Sociales Favoritas</label>
              <div className="grid grid-cols-3 gap-3">
                {SOCIAL_NETWORKS.map(network => (
                  <button
                    key={network}
                    type="button"
                    className={clx(
                      "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                      phaseTwoData.favorite_social_networks?.includes(network)
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                    )}
                    onClick={() => handleArraySelection("favorite_social_networks", network, 2)}
                  >
                    {network}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Interacción Preferida</label>
              <div className="grid grid-cols-2 gap-3">
                {INTERACTION_TYPES.map(interaction => (
                  <button
                    key={interaction}
                    type="button"
                    className={clx(
                      "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                      phaseTwoData.preferred_interaction?.includes(interaction)
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                    )}
                    onClick={() => handleArraySelection("preferred_interaction", interaction, 2)}
                  >
                    {interaction}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Compras y Presupuesto</Heading>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">Frecuencia de Compra *</label>
              <select
                className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                value={phaseTwoData.purchase_frequency || ""}
                onChange={(e) => setPhaseTwoData(prev => ({ ...prev, purchase_frequency: e.target.value }))}
                required
              >
                <option value="">Selecciona una opción</option>
                {PURCHASE_FREQUENCY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Presupuesto Mensual *</label>
              <select
                className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                value={phaseTwoData.monthly_budget || ""}
                onChange={(e) => setPhaseTwoData(prev => ({ ...prev, monthly_budget: e.target.value }))}
                required
              >
                <option value="">Selecciona tu rango</option>
                {BUDGET_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Preferencia de Marcas *</label>
              <select
                className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                value={phaseTwoData.brand_preference || ""}
                onChange={(e) => setPhaseTwoData(prev => ({ ...prev, brand_preference: e.target.value }))}
                required
              >
                <option value="">Selecciona una opción</option>
                {BRAND_PREFERENCE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Motivo de Compra *</label>
              <select
                className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                value={phaseTwoData.purchase_motivation || ""}
                onChange={(e) => setPhaseTwoData(prev => ({ ...prev, purchase_motivation: e.target.value }))}
                required
              >
                <option value="">Selecciona una opción</option>
                {PURCHASE_MOTIVATION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Círculo Social</Heading>
            
            <div className="grid grid-cols-3 gap-3">
              {SOCIAL_CIRCLES.map(circle => (
                <button
                  key={circle}
                  type="button"
                  className={clx(
                    "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                    phaseTwoData.social_circles?.includes(circle)
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                  )}
                  onClick={() => handleArraySelection("social_circles", circle, 2)}
                >
                  {circle}
                </button>
              ))}
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Conexiones</Heading>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">¿Te gustaría conectar con personas afines? *</label>
              <select
                className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                value={phaseTwoData.wants_connections || ""}
                onChange={(e) => setPhaseTwoData(prev => ({ ...prev, wants_connections: e.target.value }))}
                required
              >
                <option value="">Selecciona una opción</option>
                {CONNECTION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {phaseTwoData.wants_connections === "si" && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">¿Qué vínculos buscas?</label>
                <div className="grid grid-cols-3 gap-3">
                  {CONNECTION_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      className={clx(
                        "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                        phaseTwoData.connection_types?.includes(type)
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                      )}
                      onClick={() => handleArraySelection("connection_types", type, 2)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Estilo de Vida y Valores</Heading>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">Estilo de Vida</label>
              <div className="grid grid-cols-3 gap-3">
                {LIFESTYLE_STYLES.map(style => (
                  <button
                    key={style}
                    type="button"
                    className={clx(
                      "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                      phaseTwoData.lifestyle_style?.includes(style)
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                    )}
                    onClick={() => handleArraySelection("lifestyle_style", style, 2)}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Valores Personales</label>
              <div className="grid grid-cols-3 gap-3">
                {PERSONAL_VALUES.map(value => (
                  <button
                    key={value}
                    type="button"
                    className={clx(
                      "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                      phaseTwoData.personal_values?.includes(value)
                        ? "border-pink-500 bg-pink-50 text-pink-700"
                        : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                    )}
                    onClick={() => handleArraySelection("personal_values", value, 2)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Expectativas de la Plataforma</Heading>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">¿Qué esperas de la plataforma?</label>
              <div className="grid grid-cols-3 gap-3">
                {PLATFORM_EXPECTATIONS.map(expectation => (
                  <button
                    key={expectation}
                    type="button"
                    className={clx(
                      "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                      phaseTwoData.platform_expectations?.includes(expectation)
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                        : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                    )}
                    onClick={() => handleArraySelection("platform_expectations", expectation, 2)}
                  >
                    {expectation}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Tipo de Contenido Preferido</label>
              <div className="grid grid-cols-3 gap-3">
                {CONTENT_TYPES.map(content => (
                  <button
                    key={content}
                    type="button"
                    className={clx(
                      "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                      phaseTwoData.preferred_content_type?.includes(content)
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                    )}
                    onClick={() => handleArraySelection("preferred_content_type", content, 2)}
                  >
                    {content}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 8:
        return (
          <div className="space-y-4">
            <Heading level="h3" className="text-[#66DEDB]">Hábitos y Notificaciones</Heading>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">Momentos de Conexión</label>
              <div className="grid grid-cols-3 gap-3">
                {CONNECTION_MOMENTS.map(moment => (
                  <button
                    key={moment}
                    type="button"
                    className={clx(
                      "p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                      phaseTwoData.connection_moments?.includes(moment)
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-[#73FFA2] hover:border-[#66DEDB] bg-[#1e1e1e] text-white"
                    )}
                    onClick={() => handleArraySelection("connection_moments", moment, 2)}
                  >
                    {moment}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Días de Compra *</label>
                <select
                  className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                  value={phaseTwoData.shopping_days || ""}
                  onChange={(e) => setPhaseTwoData(prev => ({ ...prev, shopping_days: e.target.value }))}
                  required
                >
                  <option value="">Selecciona una opción</option>
                  {SHOPPING_DAYS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Experiencia E-commerce *</label>
                <select
                  className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                  value={phaseTwoData.ecommerce_experience || ""}
                  onChange={(e) => setPhaseTwoData(prev => ({ ...prev, ecommerce_experience: e.target.value }))}
                  required
                >
                  <option value="">Selecciona una opción</option>
                  {ECOMMERCE_EXPERIENCE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Nivel de Actividad Social *</label>
                <select
                  className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                  value={phaseTwoData.social_activity_level || ""}
                  onChange={(e) => setPhaseTwoData(prev => ({ ...prev, social_activity_level: e.target.value }))}
                  required
                >
                  <option value="">Selecciona una opción</option>
                  {SOCIAL_ACTIVITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Preferencia de Notificaciones *</label>
                <select
                  className="w-full p-3 border border-[#73FFA2] rounded-lg bg-[#1e1e1e] text-white"
                  value={phaseTwoData.notifications_preference || ""}
                  onChange={(e) => setPhaseTwoData(prev => ({ ...prev, notifications_preference: e.target.value }))}
                  required
                >
                  <option value="">Selecciona una opción</option>
                  {NOTIFICATIONS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    if (currentPhase === 1) {
      switch (currentStep) {
        case 1:
          return phaseOneData.birth_date && phaseOneData.gender && 
                 phaseOneData.marital_status && phaseOneData.country && phaseOneData.city
        case 2:
          return (phaseOneData.languages?.length || 0) >= 1
        case 3:
          const interests = phaseOneData.main_interests?.length || 0
          return interests >= 3 && interests <= 8
        case 4:
          return (phaseOneData.representative_colors?.length || 0) >= 1
        case 5:
          const activities = phaseOneData.favorite_activities?.length || 0
          return activities >= 3 && activities <= 5
        case 6:
          return true // Optional step
        default:
          return false
      }
    } else {
      // Phase 2 validation
      switch (currentStep) {
        case 1:
          return true // Product interests are optional
        case 2:
          return true // Social networks are optional
        case 3:
          return phaseTwoData.purchase_frequency && phaseTwoData.monthly_budget && 
                 phaseTwoData.brand_preference && phaseTwoData.purchase_motivation
        case 4:
          return true // Social circles are optional
        case 5:
          return phaseTwoData.wants_connections
        case 6:
          return true // Lifestyle and values are optional
        case 7:
          return true // Platform expectations are optional
        case 8:
          return phaseTwoData.shopping_days && phaseTwoData.ecommerce_experience && 
                 phaseTwoData.social_activity_level && phaseTwoData.notifications_preference
        default:
          return false
      }
    }
  }

  return (
    <>
      {/* Floating dismissible notification */}
      {showFloatingBanner && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs animate-in slide-in-from-right-5 duration-300">
          <div className="bg-white/80 backdrop-blur-sm border border-[#73FFA2]/30 rounded-lg shadow-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-gradient-to-r from-[#73FFA2] to-[#66DEDB] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✨</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-medium text-gray-900 mb-1">
                    ¡Completa tu perfil!
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    Personaliza tu experiencia
                  </p>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => {
                        setShowFloatingBanner(false)
                        open()
                      }}
                      className="bg-gradient-to-r from-[#73FFA2] to-[#66DEDB] hover:from-[#66DEDB] hover:to-[#73FFA2] text-gray-600 px-2 py-1 rounded text-xs font-medium transition-all"
                    >
                      Empezar
                    </button>
                    <button
                      onClick={() => setShowFloatingBanner(false)}
                      className="text-gray-500 hover:text-gray-700 px-2 py-1 rounded text-xs transition-colors"
                    >
                      Después
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowFloatingBanner(false)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors ml-2"
              >
                <XMark />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Onboarding Modal */}
      <Modal isOpen={state && !showIncentivePopup} close={close} size="large" className="p-0">
        <Modal.Title className="bg-[#1e1e1e] text-white p-4 border-b border-[#73FFA2]">
          <div className="flex items-center justify-between w-full">
            <Heading className="text-[#66DEDB]">
              {currentPhase === 1 ? "🟩 Fase 1: Datos Personales" : "🟦 Fase 2: Perfil Completo"}
            </Heading>
            <Text className="text-sm text-white">
              Paso {currentStep} de {currentPhase === 1 ? 6 : 8}
            </Text>
          </div>
        </Modal.Title>
        

        <Modal.Body className="bg-[#1e1e1e] text-white">
          <div className="w-full max-w-2xl mx-auto">
            {/* Progress bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-[#73FFA2] h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(currentStep / (currentPhase === 1 ? 6 : 8)) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Form content */}
            <div className="min-h-[400px]">
              {currentPhase === 1 ? renderPhaseOneStep() : renderPhaseTwoStep()}
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className="bg-[#1e1e1e] border-t border-[#73FFA2] p-4">
          <div className="flex justify-between w-full">
            <Button
              variant="secondary"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2 border-[#73FFA2] text-[#73FFA2] hover:bg-[#73FFA2]/20"
            >
              <ChevronLeft />
              Anterior
            </Button>
            
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-[#73FFA2] text-[#1e1e1e] hover:bg-[#66DEDB]"
            >
              {currentStep === (currentPhase === 1 ? 6 : 8) ? "Finalizar" : "Siguiente"}
              <ChevronRight />
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Incentive Popup */}
      <Modal isOpen={showIncentivePopup} close={() => setShowIncentivePopup(false)} size="large" className="bg-[#1e1e1e] p-0">
        <Modal.Title className="bg-[#1e1e1e] text-white p-4 border-b border-[#73FFA2]">
          <Heading className="text-[#66DEDB]">¡Completa tu perfil!</Heading>
        </Modal.Title>
        
        <Modal.Body className="bg-[#1e1e1e] text-white p-6">
          <div className="space-y-4">
            <Text>Completa tu perfil para personalizar tu experiencia en Tanku</Text>
            <div className="p-4 border border-[#73FFA2] rounded-lg">
              <Text className="font-medium">¡Obtén beneficios exclusivos!</Text>
            </div>
          </div>
        </Modal.Body>
        
        <Modal.Footer className="bg-[#1e1e1e] border-t border-[#73FFA2] p-4">
          <div className="flex gap-4">
            <Button
              onClick={() => setShowIncentivePopup(false)}
              variant="secondary"
              className="flex-1 border-[#73FFA2] text-[#73FFA2] hover:bg-[#73FFA2]/20"
            >
              Hacerlo después
            </Button>
            <Button
              onClick={handleContinueToPhaseTwo}
              className="flex-1 bg-[#73FFA2] text-[#1e1e1e] hover:bg-[#66DEDB]"
            >
              Continuar
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default OnboardingModal