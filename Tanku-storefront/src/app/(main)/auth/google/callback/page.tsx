"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { handleGoogleAuthCallback } from "@lib/data/customer/google-auth"

export default function GoogleCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get("token")
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const customerId = searchParams.get("customer_id")
    const errorParam = searchParams.get("error")

    if (errorParam) {
      setError(errorParam)
      // Redirigir después de mostrar el error
      const timer = setTimeout(() => {
        router.replace("/account")
      }, 3000)
      return () => clearTimeout(timer)
    }

    // Si tenemos token directamente en la URL, establecerlo
    if (token) {
      const setToken = async () => {
        try {
          const { handleGoogleAuthCallbackWithToken } = await import("@lib/data/customer/google-auth")
          const result = await handleGoogleAuthCallbackWithToken(token)
          if (result.success) {
            await new Promise(resolve => setTimeout(resolve, 500))
            window.location.href = "/"
          } else {
            setError(result.error || "Error al iniciar sesión")
            setTimeout(() => {
              router.replace("/account")
            }, 3000)
          }
        } catch (err) {
          console.error("Error estableciendo token:", err)
          setError("Error al iniciar sesión")
          setTimeout(() => {
            router.replace("/account")
          }, 3000)
        }
      }
      setToken()
      return
    }

    if (code) {
      // Si tenemos código de autorización, usar el SDK de Medusa para autenticar
      // Esto es lo mismo que hace el login normal
      const completeAuth = async () => {
        try {
          const result = await handleGoogleAuthCallback(code, state || undefined)
          if (result.success) {
            // Esperar un momento para asegurar que la cookie se establezca
            // y luego forzar una recarga completa de la página para que las cookies estén disponibles
            await new Promise(resolve => setTimeout(resolve, 500))
            // Usar window.location.href en lugar de router.replace para forzar una recarga completa
            // Esto asegura que las cookies estén disponibles cuando se carga la página
            window.location.href = "/"
          } else {
            setError(result.error || "Error al iniciar sesión")
            setTimeout(() => {
              router.replace("/account")
            }, 3000)
          }
        } catch (err) {
          console.error("Error completando autenticación:", err)
          setError("Error al iniciar sesión")
          setTimeout(() => {
            router.replace("/account")
          }, 3000)
        }
      }
      completeAuth()
    } else if (customerId) {
      // Fallback: si tenemos customer_id, usar el método anterior
      const completeAuth = async () => {
        try {
          // Usar el endpoint de complete como fallback
          const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
          const response = await fetch(`${backendUrl}/auth/google/complete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ customer_id: customerId }),
          })

          if (!response.ok) {
            throw new Error("Error generando token")
          }

          const data = await response.json()
          const token = data.token

          if (token) {
            const { handleGoogleAuthCallbackWithToken } = await import("@lib/data/customer/google-auth")
            const result = await handleGoogleAuthCallbackWithToken(token)
            if (result.success) {
              await new Promise(resolve => setTimeout(resolve, 500))
              window.location.href = "/"
            } else {
              setError(result.error || "Error al iniciar sesión")
              setTimeout(() => {
                router.replace("/account")
              }, 3000)
            }
          } else {
            throw new Error("No se recibió el token")
          }
        } catch (err) {
          console.error("Error completando autenticación:", err)
          setError("Error al iniciar sesión")
          setTimeout(() => {
            router.replace("/account")
          }, 3000)
        }
      }
      completeAuth()
    } else {
      // Si no hay token ni customer_id ni error, puede ser que la página se cargó antes de la redirección
      // O que el endpoint oficial de Medusa devolvió JSON directamente
      // Intentar obtener el token del body de la respuesta si está disponible
      const checkForTokenInBody = async () => {
        try {
          // Si estamos en esta página sin parámetros, puede ser que el backend devolvió JSON
          // En este caso, necesitamos que el usuario sea redirigido manualmente
          // Por ahora, mostrar un mensaje de error
          setError("No se recibió la información de autenticación. Por favor, intenta de nuevo.")
          setTimeout(() => {
            router.replace("/account")
          }, 3000)
        } catch (err) {
          console.error("Error verificando token:", err)
          setError("Error al iniciar sesión")
          setTimeout(() => {
            router.replace("/account")
          }, 3000)
        }
      }
      
      const timer = setTimeout(() => {
        if (!token && !customerId && !errorParam && !code) {
          checkForTokenInBody()
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#1E1E1E]">
      <div className="text-center">
        <div className="mb-4">
          <Image
            src="/logoTanku.png"
            alt="TANKU Logo"
            width={100}
            height={100}
            className="object-contain mx-auto"
          />
        </div>
        {error ? (
          <>
            <p className="text-red-400 text-lg mb-2">Error al iniciar sesión</p>
            <p className="text-gray-400 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-4">Redirigiendo...</p>
          </>
        ) : (
          <>
            <p className="text-white text-lg">Iniciando sesión...</p>
            <div className="mt-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#73FFA2]"></div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

