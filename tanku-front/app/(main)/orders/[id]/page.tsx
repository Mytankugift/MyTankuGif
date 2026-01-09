'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function OrderPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  useEffect(() => {
    if (orderId) {
      // Guardar el orderId en localStorage para que el perfil lo detecte
      if (typeof window !== 'undefined') {
        localStorage.setItem('tanku_profile_tab', 'MIS COMPRAS')
        localStorage.setItem('tanku_view_order_id', orderId)
        // Redirigir al perfil con la pestaña de MIS COMPRAS
        router.replace('/profile?tab=MIS_COMPRAS&orderId=' + orderId)
      }
    }
  }, [orderId, router])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
        <p className="text-gray-400">Redirigiendo al perfil...</p>
      </div>
    </div>
  )
}

