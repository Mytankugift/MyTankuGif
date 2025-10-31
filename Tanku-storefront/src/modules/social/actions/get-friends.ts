export interface FriendItem {
  id: string
  friend_customer_id: string
  friend: {
    id: string
    first_name?: string
    last_name?: string
    email?: string
    avatar_url?: string | null
    pseudonym?: string | null
  }
}

export const getFriends = async (userId: string): Promise<FriendItem[]> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/friends/list/${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || 'Error al obtener amigos')
  }
  return data?.friends || []
}


