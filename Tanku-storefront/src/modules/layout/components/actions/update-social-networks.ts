"use server"

import { cookies } from "next/headers"

export interface SocialNetworkData {
  facebook?: string
  instagram?: string
  youtube?: string
  tiktok?: string
  public_alias?: string
}

export interface UpdateSocialNetworksInput {
  customer_id: string
  social_networks: SocialNetworkData
}

export interface UpdateSocialNetworksResponse {
  success: boolean
  message?: string
  error?: string
}

export async function updateSocialNetworks(
  input: UpdateSocialNetworksInput
): Promise<UpdateSocialNetworksResponse> {
  try {
    console.log("🌐 Updating social networks:", input)

    const cookieStore = await cookies()
    const authToken = cookieStore.get("_medusa_jwt")?.value

    if (!authToken) {
      return {
        success: false,
        error: "No se encontró token de autenticación"
      }
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/socia-network/update-network`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        customer_id: input.customer_id,
        social_networks: input.social_networks
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("❌ Error updating social networks:", data)
      return {
        success: false,
        error: data.error || "Error al actualizar redes sociales"
      }
    }

    console.log("✅ Social networks updated successfully:", data)
    return {
      success: true,
      message: "Redes sociales actualizadas correctamente"
    }

  } catch (error) {
    console.error("❌ Error in updateSocialNetworks:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }
  }
}
