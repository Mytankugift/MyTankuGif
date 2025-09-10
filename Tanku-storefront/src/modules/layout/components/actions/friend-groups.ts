export interface FriendGroup {
  id: string
  group_name: string
  description?: string
  image_url?: string
  created_by: string
  is_private: boolean
  created_at: string
  member_count?: number
  role?: string
}

export interface GroupInvitation {
  id: string
  group_id: string
  group_name: string
  sender_name: string
  sender_id: string
  message?: string
  created_at: string
}

export interface GroupMember {
  id: string
  customer_id: string
  first_name: string
  last_name: string
  email: string
  role: string
  joined_at: string
  avatar_url?: string
}

export interface CreateGroupData {
  group_name: string
  description?: string
  is_private: boolean
  created_by: string
  image?: File | null
}

export interface InviteToGroupData {
  group_id: string
  friend_ids: string[]
  message?: string
  invited_by: string
}

// Get user's friend groups
export const getFriendGroups = async (userId: string) => {
  try {
   

    // // For now, return mock data since backend endpoints are not implemented yet
    // const mockGroups = [
    //   {
    //     id: "group_1",
    //     group_name: "Amigos del Colegio",
    //     description: "Grupo de amigos de la secundaria",
    //     image_url: null,
    //     created_by: userId,
    //     is_private: false,
    //     created_at: new Date().toISOString(),
    //     member_count: 5,
    //     role: "admin",
    //   },
    //   {
    //     id: "group_2",
    //     group_name: "Compañeros de Trabajo",
    //     description: "Equipo de desarrollo",
    //     image_url: null,
    //     created_by: "other_user",
    //     is_private: true,
    //     created_at: new Date().toISOString(),
    //     member_count: 8,
    //     role: "member",
    //   },
    // ]

    // return {
    //   success: true,
    //   groups: mockGroups,
    // }

    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/groups/user-groups?user_id=${userId}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
      }
    )

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || "Error al obtener grupos")
    }

    return {
      success: true,
      groups: data.groups || []
    }
    
  } catch (error) {
    console.error("Error al obtener grupos:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      groups: [],
    }
  }
}

// Create new friend group
export const createFriendGroup = async (groupData: CreateGroupData) => {
  try {
    const formData = new FormData()
    formData.append(
      "dataGroup",
      JSON.stringify({
        group_name: groupData.group_name,
        description: groupData.description,
        is_private: groupData.is_private,
        created_by: groupData.created_by,
      })
    )

    if (groupData.image) {
      formData.append("banner", groupData.image)
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/groups/create`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: formData,
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Error al crear grupo")
    }

    return {
      success: true,
      group: data.group,
    }
  } catch (error) {
    console.error("Error al crear grupo:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

// Get group invitations for user
export const getGroupInvitations = async (userId: string) => {
  try {
    

    // // For now, return mock data since backend endpoints are not implemented yet
    // const mockInvitations = [
    //   {
    //     id: "invitation_1",
    //     group_id: "group_3",
    //     group_name: "Club de Fotografía",
    //     sender_id: "friend_1",
    //     sender_name: "Ana García",
    //     message: "¡Únete a nuestro club de fotografía!",
    //     created_at: new Date().toISOString(),
    //   },
    //   {
    //     id: "invitation_2",
    //     group_id: "group_4",
    //     group_name: "Gamers Unidos",
    //     sender_id: "friend_2",
    //     sender_name: "Carlos López",
    //     message: "Te invito a nuestro grupo de gaming",
    //     created_at: new Date().toISOString(),
    //   },
    // ]

    // return {
    //   success: true,
    //   invitations: mockInvitations,
    // }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/groups/invitations?user_id=${userId}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
      }
    )

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || "Error al obtener invitaciones")
    }

    return {
      success: true,
      invitations: data.invitations || []
    }
    
  } catch (error) {
    console.error("Error al obtener invitaciones:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      invitations: [],
    }
  }
}

// Respond to group invitation
export const respondToGroupInvitation = async (
  invitationId: string,
  response: "accepted" | "rejected"
) => {
  try {
    const apiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/groups/invitations/respond`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: JSON.stringify({
          invitation_id: invitationId,
          response: response,
        }),
      }
    )

    const data = await apiResponse.json()

    if (!apiResponse.ok) {
      throw new Error(data.error || "Error al responder invitación")
    }

    return {
      success: true,
      message: data.message,
    }
  } catch (error) {
    console.error("Error al responder invitación:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

// Invite friends to group
export const inviteToGroup = async (inviteData: InviteToGroupData) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/groups/invite`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: JSON.stringify(inviteData),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Error al enviar invitaciones")
    }

    return {
      success: true,
      message: data.message,
    }
  } catch (error) {
    console.error("Error al enviar invitaciones:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

// Get group members
export const getGroupMembers = async (groupId: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/groups/members?group_id=${groupId}`,
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

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Error al obtener miembros")
    }

    return {
      success: true,
      members: data.members || [],
    }
  } catch (error) {
    console.error("Error al obtener miembros:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      members: [],
    }
  }
}
