export const cancelFriendRequest = async (sender_id: string, receiver_id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/friends/cancel-friend-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ sender_id, receiver_id })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'No se pudo cancelar la solicitud')
  }
  return await res.json()
}


