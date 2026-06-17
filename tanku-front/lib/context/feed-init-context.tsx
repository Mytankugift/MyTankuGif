'use client'

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'

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

  // ✅ Memoizadas: si cambian de identidad en cada render, los consumidores
  // (useFeedInit, useFeed, useStories…) se re-renderizan en cascada y redisparan fetches.
  const markComplete = useCallback((data: Partial<typeof hasData>) => {
    setHasData(prev => ({ ...prev, ...data }))
    setIsComplete(true)
    setIsInitializing(false)
  }, [])

  const reset = useCallback(() => {
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
  }, [])

  const value = useMemo(
    () => ({ isInitializing, isComplete, hasData, markComplete, reset }),
    [isInitializing, isComplete, hasData, markComplete, reset]
  )

  return (
    <FeedInitContext.Provider value={value}>
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

