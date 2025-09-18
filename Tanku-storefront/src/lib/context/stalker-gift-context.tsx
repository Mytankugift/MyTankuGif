"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

// Interfaces para los datos del formulario
export interface ContactMethod {
  type: 'instagram' | 'messenger' | 'whatsapp' | 'email' | 'phone'
  value: string
}

export interface RecipientData {
  name: string
  contactMethods: ContactMethod[]
}

export interface Product {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  variants?: Array<{
    inventory?: {
      price: number
      currency_code: string
    }
  }>
}

export interface StalkerGiftData {
  alias: string // Alias del remitente para modo incógnito
  recipient: RecipientData
  selectedProducts: Product[] // Productos seleccionados
  message?: string // Mensaje opcional
}

// Contexto
interface StalkerGiftContextType {
  // Estado
  stalkerGiftData: StalkerGiftData
  isFormValid: boolean
  
  // Acciones
  setAlias: (alias: string) => void
  setRecipientName: (name: string) => void
  updateContactMethod: (type: ContactMethod['type'], value: string) => void
  toggleProductSelection: (product: Product) => void
  setMessage: (message: string) => void
  resetForm: () => void
  validateForm: () => boolean
  getFilledContactMethods: () => ContactMethod[]
  isProductSelected: (productId: string) => boolean
}

// Estado inicial
const initialContactMethods: ContactMethod[] = [
  { type: 'instagram', value: '' },
  { type: 'messenger', value: '' },
  { type: 'whatsapp', value: '' },
  { type: 'email', value: '' },
  { type: 'phone', value: '' },
]

const initialStalkerGiftData: StalkerGiftData = {
  alias: '',
  recipient: {
    name: '',
    contactMethods: initialContactMethods,
  },
  selectedProducts: [],
  message: '',
}

// Crear contexto
const StalkerGiftContext = createContext<StalkerGiftContextType | undefined>(undefined)

// Provider
interface StalkerGiftProviderProps {
  children: ReactNode
}

export const StalkerGiftProvider: React.FC<StalkerGiftProviderProps> = ({ children }) => {
  const [stalkerGiftData, setStalkerGiftData] = useState<StalkerGiftData>(initialStalkerGiftData)
  const [isFormValid, setIsFormValid] = useState<boolean>(false)

  // Función para validar el formulario
  const validateForm = (): boolean => {
    const { alias, recipient } = stalkerGiftData
    const filledMethods = recipient.contactMethods.filter(method => 
      method.value.trim() !== ''
    )
    
    const isValid = 
      alias.trim() !== '' && 
      recipient.name.trim() !== '' && 
      filledMethods.length >= 1

    setIsFormValid(isValid)
    return isValid
  }

  // Acciones
  const setAlias = (alias: string) => {
    setStalkerGiftData(prev => ({
      ...prev,
      alias
    }))
    // Validar después de actualizar
    setTimeout(validateForm, 0)
  }

  const setRecipientName = (name: string) => {
    setStalkerGiftData(prev => ({
      ...prev,
      recipient: {
        ...prev.recipient,
        name
      }
    }))
    setTimeout(validateForm, 0)
  }

  const updateContactMethod = (type: ContactMethod['type'], value: string) => {
    setStalkerGiftData(prev => ({
      ...prev,
      recipient: {
        ...prev.recipient,
        contactMethods: prev.recipient.contactMethods.map(method =>
          method.type === type 
            ? { ...method, value }
            : method
        )
      }
    }))
    setTimeout(validateForm, 0)
  }

  const toggleProductSelection = (product: Product) => {
    setStalkerGiftData(prev => {
      const isSelected = prev.selectedProducts.some(p => p.id === product.id)
      
      if (isSelected) {
        // Remover producto si ya está seleccionado
        return {
          ...prev,
          selectedProducts: prev.selectedProducts.filter(p => p.id !== product.id)
        }
      } else {
        // Agregar producto si no está seleccionado
        return {
          ...prev,
          selectedProducts: [...prev.selectedProducts, product]
        }
      }
    })
  }

  const isProductSelected = (productId: string): boolean => {
    return stalkerGiftData.selectedProducts.some(p => p.id === productId)
  }

  const setMessage = (message: string) => {
    setStalkerGiftData(prev => ({
      ...prev,
      message
    }))
  }

  const resetForm = () => {
    setStalkerGiftData(initialStalkerGiftData)
    setIsFormValid(false)
  }

  const getFilledContactMethods = (): ContactMethod[] => {
    return stalkerGiftData.recipient.contactMethods.filter(method => 
      method.value.trim() !== ''
    )
  }

  const contextValue: StalkerGiftContextType = {
    stalkerGiftData,
    isFormValid,
    setAlias,
    setRecipientName,
    updateContactMethod,
    toggleProductSelection,
    setMessage,
    resetForm,
    validateForm,
    getFilledContactMethods,
    isProductSelected,
  }

  return (
    <StalkerGiftContext.Provider value={contextValue}>
      {children}
    </StalkerGiftContext.Provider>
  )
}

// Hook personalizado
export const useStalkerGift = (): StalkerGiftContextType => {
  const context = useContext(StalkerGiftContext)
  if (context === undefined) {
    throw new Error('useStalkerGift must be used within a StalkerGiftProvider')
  }
  return context
}

// Utilidades adicionales
export const getContactMethodLabel = (type: ContactMethod['type']): string => {
  const labels = {
    instagram: 'Instagram',
    messenger: 'Messenger',
    whatsapp: 'WhatsApp',
    email: 'Correo Electrónico',
    phone: 'Teléfono'
  }
  return labels[type]
}

export const getContactMethodIcon = (type: ContactMethod['type']): string => {
  const icons = {
    instagram: '📷',
    messenger: '💬',
    whatsapp: '📱',
    email: '📧',
    phone: '☎️'
  }
  return icons[type]
}

export const getContactMethodPlaceholder = (type: ContactMethod['type']): string => {
  const placeholders = {
    instagram: '@usuario',
    messenger: 'Nombre de usuario',
    whatsapp: '+1234567890',
    email: 'usuario@ejemplo.com',
    phone: '+1234567890'
  }
  return placeholders[type]
}
