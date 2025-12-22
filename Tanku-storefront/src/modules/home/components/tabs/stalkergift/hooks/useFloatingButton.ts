"use client"

import { useState, useEffect, useRef } from "react"

export function useFloatingButton(currentView: string) {
  const [isFloatingButtonVisible, setIsFloatingButtonVisible] = useState(false)
  const originalButtonRef = useRef<HTMLDivElement>(null)

  // Effect para manejar el scroll y botón flotante
  useEffect(() => {
    if (currentView !== 'product-selection') {
      setIsFloatingButtonVisible(false)
      return
    }

    const handleScroll = () => {
      if (originalButtonRef.current) {
        const rect = originalButtonRef.current.getBoundingClientRect()
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
        setIsFloatingButtonVisible(!isVisible)
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state

    return () => window.removeEventListener('scroll', handleScroll)
  }, [currentView])

  return {
    isFloatingButtonVisible,
    originalButtonRef
  }
}
