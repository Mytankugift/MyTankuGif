'use client'

import { create } from 'zustand'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  FriendDTO,
  FriendRequestDTO,
  FriendSuggestionDTO,
  CreateFriendRequestDTO,
  UpdateFriendRequestDTO,
} from '@/types/api'
import { useAuthStore } from '@/lib/stores/auth-store'

interface BlockedUserDTO {
  id: string
  userId: string
  blockedUserId: string
  blockedUser: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    username: string | null
    profile?: {
      avatar: string | null
    } | null
  }
  createdAt: string
}

type FetchOptions = { silent?: boolean }

function mergeSentRequest(prev: FriendRequestDTO[], created: FriendDTO): FriendRequestDTO[] {
  if (prev.some((r) => r.friendId === created.friendId || r.id === created.id)) return prev
  return [
    ...prev,
    {
      id: created.id,
      userId: created.userId,
      friendId: created.friendId,
      status: 'pending' as const,
      fromUser: created.friend,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
  ]
}

function isPendingRequestConflict(message?: string | null, code?: string | null): boolean {
  const lowered = (message || '').toLowerCase()
  return (
    code === 'CONFLICT' ||
    lowered.includes('solicitud pendiente') ||
    lowered.includes('already exists')
  )
}

interface FriendsState {
  friends: FriendDTO[]
  requests: FriendRequestDTO[]
  sentRequests: FriendRequestDTO[]
  suggestions: FriendSuggestionDTO[]
  blockedUsers: BlockedUserDTO[]
  /** Acciones puntuales (enviar solicitud, etc.) */
  isLoading: boolean
  /** Carga inicial / revalidación de la página /friends */
  isPageLoading: boolean
  hasPageLoaded: boolean
  error: string | null

  reset: () => void
  loadFriendsPage: () => Promise<void>
  fetchFriends: (options?: FetchOptions) => Promise<void>
  fetchRequests: (options?: FetchOptions) => Promise<void>
  fetchSentRequests: (options?: FetchOptions) => Promise<void>
  fetchSuggestions: (options?: FetchOptions) => Promise<void>
  fetchBlockedUsers: () => Promise<void>
  sendFriendRequest: (friendId: string) => Promise<FriendDTO | null>
  acceptRequest: (requestId: string) => Promise<FriendDTO | null>
  rejectRequest: (requestId: string) => Promise<void>
  removeFriend: (friendId: string) => Promise<void>
  cancelSentRequest: (requestId: string) => Promise<void>
  blockUser: (userId: string) => Promise<void>
  unblockUser: (userId: string) => Promise<void>
}

const initialState = {
  friends: [] as FriendDTO[],
  requests: [] as FriendRequestDTO[],
  sentRequests: [] as FriendRequestDTO[],
  suggestions: [] as FriendSuggestionDTO[],
  blockedUsers: [] as BlockedUserDTO[],
  isLoading: false,
  isPageLoading: false,
  hasPageLoaded: false,
  error: null as string | null,
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  ...initialState,

  reset: () => set({ ...initialState }),

  loadFriendsPage: async () => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({
        friends: [],
        requests: [],
        sentRequests: [],
        suggestions: [],
        isPageLoading: false,
        hasPageLoaded: true,
      })
      return
    }

    const revalidate = get().hasPageLoaded
    if (!revalidate) {
      set({ isPageLoading: true, error: null })
    }

    try {
      await Promise.all([
        get().fetchFriends({ silent: true }),
        get().fetchRequests({ silent: true }),
        get().fetchSuggestions({ silent: true }),
        get().fetchSentRequests({ silent: true }),
      ])
    } finally {
      set({ isPageLoading: false, hasPageLoaded: true })
    }
  },

  fetchFriends: async (options?: FetchOptions) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ friends: [] })
      return
    }

    if (!options?.silent) set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<{ friends: FriendDTO[]; count: number } | FriendDTO[]>(
        API_ENDPOINTS.FRIENDS.LIST,
      )
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          set({ friends: response.data })
        } else if (response.data.friends && Array.isArray(response.data.friends)) {
          set({ friends: response.data.friends })
        } else {
          set({ friends: [] })
        }
      } else {
        set({ error: response.error?.message || 'Error al obtener amigos' })
      }
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al obtener amigos' })
    } finally {
      if (!options?.silent) set({ isLoading: false })
    }
  },

  fetchRequests: async (options?: FetchOptions) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ requests: [] })
      return
    }

    if (!options?.silent) set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<FriendRequestDTO[]>(API_ENDPOINTS.FRIENDS.REQUESTS)
      if (response.success && response.data) {
        set({ requests: response.data })
      } else {
        set({ error: response.error?.message || 'Error al obtener solicitudes' })
      }
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al obtener solicitudes' })
    } finally {
      if (!options?.silent) set({ isLoading: false })
    }
  },

  fetchSentRequests: async (options?: FetchOptions) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ sentRequests: [] })
      return
    }

    if (!options?.silent) set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<FriendRequestDTO[]>(API_ENDPOINTS.FRIENDS.REQUESTS_SENT)
      if (response.success && response.data) {
        set({ sentRequests: response.data })
      } else {
        set({ error: response.error?.message || 'Error al obtener solicitudes enviadas' })
      }
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al obtener solicitudes enviadas' })
    } finally {
      if (!options?.silent) set({ isLoading: false })
    }
  },

  fetchSuggestions: async (options?: FetchOptions) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ suggestions: [] })
      return
    }

    if (!options?.silent) set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<FriendSuggestionDTO[]>(
        `${API_ENDPOINTS.FRIENDS.SUGGESTIONS}?limit=48`,
      )
      if (response.success && response.data) {
        set({ suggestions: response.data })
      } else {
        set({ error: response.error?.message || 'Error al obtener sugerencias' })
      }
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al obtener sugerencias' })
    } finally {
      if (!options?.silent) set({ isLoading: false })
    }
  },

  sendFriendRequest: async (friendId: string) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ error: 'No autenticado' })
      return null
    }

    const existing = get().sentRequests.find((r) => r.friendId === friendId)
    if (existing) return null

    set({ isLoading: true, error: null })
    try {
      const data: CreateFriendRequestDTO = { friendId }
      const response = await apiClient.post<FriendDTO>(API_ENDPOINTS.FRIENDS.SEND_REQUEST, data)

      if (response.success && response.data) {
        const created = response.data
        set((state) => ({ sentRequests: mergeSentRequest(state.sentRequests, created) }))
        return created
      }

      if (isPendingRequestConflict(response.error?.message, response.error?.code)) {
        await get().fetchSentRequests({ silent: true })
        return null
      }

      set({ error: response.error?.message || 'Error al enviar solicitud' })
      return null
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al enviar solicitud' })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  acceptRequest: async (requestId: string) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ error: 'No autenticado' })
      return null
    }

    set({ isLoading: true, error: null })
    try {
      const data: UpdateFriendRequestDTO = { status: 'accepted' }
      const response = await apiClient.put<FriendDTO>(
        API_ENDPOINTS.FRIENDS.UPDATE_REQUEST(requestId),
        data,
      )

      if (response.success && response.data) {
        set((state) => ({ requests: state.requests.filter((r) => r.id !== requestId) }))
        return response.data
      }
      set({ error: response.error?.message || 'Error al aceptar solicitud' })
      return null
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al aceptar solicitud' })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  rejectRequest: async (requestId: string) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ error: 'No autenticado' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const data: UpdateFriendRequestDTO = { status: 'rejected' }
      const response = await apiClient.put<FriendDTO>(
        API_ENDPOINTS.FRIENDS.UPDATE_REQUEST(requestId),
        data,
      )

      if (response.success) {
        set((state) => ({ requests: state.requests.filter((r) => r.id !== requestId) }))
      } else {
        set({ error: response.error?.message || 'Error al rechazar solicitud' })
      }
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al rechazar solicitud' })
    } finally {
      set({ isLoading: false })
    }
  },

  removeFriend: async (friendId: string) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ error: 'No autenticado' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.delete(API_ENDPOINTS.FRIENDS.REMOVE(friendId))
      if (response.success) {
        set((state) => ({
          friends: state.friends.filter(
            (f) => f.friendId !== friendId && f.friend.id !== friendId,
          ),
        }))
      } else {
        set({ error: response.error?.message || 'Error al eliminar amigo' })
      }
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al eliminar amigo' })
    } finally {
      set({ isLoading: false })
    }
  },

  cancelSentRequest: async (requestId: string) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ error: 'No autenticado' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.delete(API_ENDPOINTS.FRIENDS.CANCEL_REQUEST(requestId))
      if (response.success) {
        set((state) => ({ sentRequests: state.sentRequests.filter((r) => r.id !== requestId) }))
      } else {
        set({ error: response.error?.message || 'Error al cancelar solicitud' })
        await get().fetchSentRequests({ silent: true })
      }
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al cancelar solicitud' })
      await get().fetchSentRequests({ silent: true })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchBlockedUsers: async () => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ blockedUsers: [] })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<BlockedUserDTO[]>(API_ENDPOINTS.FRIENDS.BLOCKED)
      if (response.success && response.data) {
        set({ blockedUsers: response.data })
      } else {
        set({ error: response.error?.message || 'Error al obtener usuarios bloqueados' })
      }
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al obtener usuarios bloqueados' })
    } finally {
      set({ isLoading: false })
    }
  },

  blockUser: async (userId: string) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ error: 'No autenticado' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post(API_ENDPOINTS.FRIENDS.BLOCK, { userId })
      if (response.success) {
        await get().fetchBlockedUsers()
        set((state) => ({ suggestions: state.suggestions.filter((s) => s.userId !== userId) }))
      } else {
        set({ error: response.error?.message || 'Error al bloquear usuario' })
      }
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al bloquear usuario' })
    } finally {
      set({ isLoading: false })
    }
  },

  unblockUser: async (userId: string) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ error: 'No autenticado' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.delete(API_ENDPOINTS.FRIENDS.UNBLOCK(userId))
      if (response.success) {
        await get().fetchBlockedUsers()
        await get().fetchSuggestions({ silent: true })
      } else {
        set({ error: response.error?.message || 'Error al desbloquear usuario' })
      }
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error al desbloquear usuario' })
    } finally {
      set({ isLoading: false })
    }
  },
}))
