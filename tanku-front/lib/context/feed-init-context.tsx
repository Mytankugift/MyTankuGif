'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface FeedInitContextValue {
  isInitializing: boolean
  isComplete: boolean
  hasData: {
    feed: boolean
    stories: boolean
    conversations: boolean
    notifications: boolean
    cart: boolean
    onboarding: boolean
  }
  markComplete: (data: Partial<FeedInitContextValue['hasData']>) => void
  reset: () => void
}

const FeedInitContext = createContext<FeedInitContextValue | undefined>(undefined)

export function FeedInitProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const [hasData, setHasData] = useState({
    feed: false,
    stories: false,
    conversations: false,
    notifications: false,
    cart: false,
    onboarding: false,
  })

  const markComplete = (data: Partial<typeof hasData>) => {
    setHasData(prev => ({ ...prev, ...data }))
    setIsComplete(true)
    setIsInitializing(false)
  }

  const reset = () => {
    setIsInitializing(true)
    setIsComplete(false)
    setHasData({
      feed: false,
      stories: false,
      conversations: false,
      notifications: false,
      cart: false,
      onboarding: false,
    })
  }

  return (
    <FeedInitContext.Provider value={{ isInitializing, isComplete, hasData, markComplete, reset }}>
      {children}
    </FeedInitContext.Provider>
  )
}

export function useFeedInitContext() {
  const context = useContext(FeedInitContext)
  if (!context) {
    // ✅ Si no hay contexto, retornar valores por defecto (para compatibilidad)
    return {
      isInitializing: false,
      isComplete: true,
      hasData: {
        feed: false,
        stories: false,
        conversations: false,
        notifications: false,
        cart: false,
        onboarding: false,
      },
      markComplete: () => {},
      reset: () => {},
    }
  }
  return context
}

