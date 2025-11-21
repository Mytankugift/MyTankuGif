"use server"

import { setAuthToken, getCacheTag } from "../cookies"
import { revalidateTag } from "next/cache"
import { sdk } from "@lib/config"

/**
 * Maneja el callback de Google cuando recibimos un código de autorización
 * Usa el endpoint oficial de Medusa para autenticar, igual que el login normal
 */
export async function handleGoogleAuthCallback(code: string, state?: string) {
  try {
    // Usar el endpoint oficial de Medusa para autenticar con Google
    // Esto es lo mismo que hace sdk.auth.login() pero para OAuth
    const backendUrl = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    
    // Llamar al endpoint oficial de Medusa para el callback de Google
    const response = await fetch(`${backendUrl}/auth/customer/google/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        state,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Error autenticando con Google: ${errorData}`)
    }

    const data = await response.json()
    const token = data.token || data.access_token

    if (!token) {
      throw new Error("No se recibió el token del endpoint de Medusa")
    }

    // Establecer el token en las cookies, igual que el login normal
    await setAuthToken(token)
    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Error en handleGoogleAuthCallback:", error)
    return { success: false, error: error.toString() }
  }
}

/**
 * Maneja el callback de Google cuando recibimos un token directamente
 * (fallback para compatibilidad)
 */
export async function handleGoogleAuthCallbackWithToken(token: string) {
  try {
    await setAuthToken(token)
    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Error en handleGoogleAuthCallbackWithToken:", error)
    return { success: false, error: error.toString() }
  }
}

