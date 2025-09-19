export interface UserStatus {
  user_id: string
  is_online: boolean
  last_seen: string | null
}

export interface GetUserStatusResponse {
  success: boolean
  data: UserStatus[]
}

export const getUserStatus = async (userIds: string[]): Promise<GetUserStatusResponse> => {
  try {
    const queryParams = new URLSearchParams()
    userIds.forEach(id => queryParams.append('user_ids', id))
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/chat/user-status?${queryParams.toString()}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || "Error al obtener estado de usuarios")
    }

    return result
  } catch (error) {
    console.error("Error al obtener estado de usuarios:", error)
    throw error
  }
}

export const updateUserStatus = async (userId: string, status: 'online' | 'offline'): Promise<void> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/chat/user-status`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: JSON.stringify({
          user_id: userId,
          status: status
        })
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || "Error al actualizar estado de usuario")
    }
  } catch (error) {
    console.error("Error al actualizar estado de usuario:", error)
    throw error
  }
}
