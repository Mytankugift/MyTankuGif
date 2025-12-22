"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface StoryUploadContextType {
  triggerUpload: () => void
  isTriggered: boolean
  resetTrigger: () => void
}

const StoryUploadContext = createContext<StoryUploadContextType | undefined>(undefined)

export function StoryUploadProvider({ children }: { children: ReactNode }) {
  const [isTriggered, setIsTriggered] = useState(false)

  const triggerUpload = () => {
    setIsTriggered(true)
  }

  const resetTrigger = () => {
    setIsTriggered(false)
  }

  return (
    <StoryUploadContext.Provider value={{ triggerUpload, isTriggered, resetTrigger }}>
      {children}
    </StoryUploadContext.Provider>
  )
}

export function useStoryUpload() {
  const context = useContext(StoryUploadContext)
  if (context === undefined) {
    throw new Error('useStoryUpload must be used within a StoryUploadProvider')
  }
  return context
}

