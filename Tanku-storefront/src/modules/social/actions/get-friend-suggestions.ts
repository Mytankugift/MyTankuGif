export interface SuggestedUser {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_url?: string | null
  alias?: string | null
  mutual_friends_count: number
}

export const getFriendSuggestions = async (userId: string): Promise<SuggestedUser[]> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/friends/suggestions/${userId}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }
  )
  
  const data = await res.json()
  
  if (!res.ok) {
    throw new Error(data?.error || 'Error al obtener sugerencias de amigos')
  }
  
  return data?.suggestions || []
}

