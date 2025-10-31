export const unfriend = async (user_id: string, friend_id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/friends/unfriend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ user_id, friend_id })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'No se pudo eliminar la amistad')
  }
  return await res.json()
}


