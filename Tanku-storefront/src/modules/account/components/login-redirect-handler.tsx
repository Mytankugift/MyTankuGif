"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LoginRedirectHandler() {
  const router = useRouter()

  useEffect(() => {
    // Verificar si hay una URL guardada para redirigir después del login
    const redirectUrl = localStorage.getItem('tanku_redirect_after_login')
    
    if (redirectUrl) {
      // Limpiar la URL guardada
      localStorage.removeItem('tanku_redirect_after_login')
      
      // Redirigir a la URL guardada
      router.push(redirectUrl)
    } else {
      // Si no hay URL guardada, redirigir al home
      router.push('/')
    }
  }, [router])

  return null
}

