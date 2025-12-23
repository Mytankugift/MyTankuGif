"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}

export default function OrderConfirmedPage({ params }: Props) {
  const router = useRouter()
  
  // Redirigir automáticamente a Mis compras en el perfil ya que esta página no está funcionando
  useEffect(() => {
    // Establecer la pestaña en localStorage antes de navegar
    if (typeof window !== 'undefined') {
      localStorage.setItem('tanku_profile_tab', 'MIS COMPRAS')
    }
    router.replace('/profile?tab=MIS_COMPRAS')
  }, [router])
  
  // Mostrar un mensaje de carga mientras redirige
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#73FFA2] mb-4"></div>
        <p className="text-white">Redirigiendo a Mis compras...</p>
      </div>
    </div>
  )
}
