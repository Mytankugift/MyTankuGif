/**
 * Hook para gestionar amigos (estado compartido vía Zustand)
 */

'use client'

import { useFriendsStore } from '@/lib/stores/friends-store'

export function useFriends() {
  return useFriendsStore()
}
