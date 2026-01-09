'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Página temporal de mensajes
 * TODO: Implementar chat cuando esté listo
 */
export default function MessagesPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir al feed ya que el chat aún no está implementado
    router.replace('/feed')
  }, [router])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#1E1E1E' }}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
        <p className="text-white">Redirigiendo...</p>
      </div>
    </div>
  )
}

