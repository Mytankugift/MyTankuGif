/**
 * Hook para gestionar amigos
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { initSocket, getSocket } from '@/lib/realtime/socket'

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

interface UseFriendsResult {
  // Estado
  friends: FriendDTO[]
  requests: FriendRequestDTO[]
  sentRequests: FriendRequestDTO[]
  suggestions: FriendSuggestionDTO[]
  blockedUsers: BlockedUserDTO[]
  isLoading: boolean
  error: string | null

  // Acciones
  fetchFriends: () => Promise<void>
  fetchRequests: () => Promise<void>
  fetchSentRequests: () => Promise<void>
  fetchSuggestions: () => Promise<void>
  fetchBlockedUsers: () => Promise<void>
  sendFriendRequest: (friendId: string) => Promise<FriendDTO | null>
  acceptRequest: (requestId: string) => Promise<FriendDTO | null>
  rejectRequest: (requestId: string) => Promise<void>
  removeFriend: (friendId: string) => Promise<void>
  cancelSentRequest: (requestId: string) => Promise<void>
  blockUser: (userId: string) => Promise<void>
  unblockUser: (userId: string) => Promise<void>
}

export function useFriends(): UseFriendsResult {
  const { isAuthenticated, user } = useAuthStore()
  const [friends, setFriends] = useState<FriendDTO[]>([])
  const [requests, setRequests] = useState<FriendRequestDTO[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequestDTO[]>([])
  const [suggestions, setSuggestions] = useState<FriendSuggestionDTO[]>([])
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // (Se mueve al final para evitar referencias antes de inicialización)

  /**
   * Obtener lista de amigos
   */
  const fetchFriends = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setFriends([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<{ friends: FriendDTO[]; count: number } | FriendDTO[]>(API_ENDPOINTS.FRIENDS.LIST)
      if (response.success && response.data) {
        // Manejar tanto la nueva estructura { friends: [], count: number } como el array directo
        if (Array.isArray(response.data)) {
          setFriends(response.data)
        } else if (response.data.friends && Array.isArray(response.data.friends)) {
          setFriends(response.data.friends)
        } else {
          setFriends([])
        }
      } else {
        setError(response.error?.message || 'Error al obtener amigos')
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener amigos')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id])

  /**
   * Obtener solicitudes recibidas
   */
  const fetchRequests = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setRequests([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<FriendRequestDTO[]>(API_ENDPOINTS.FRIENDS.REQUESTS)
      if (response.success && response.data) {
        setRequests(response.data)
      } else {
        setError(response.error?.message || 'Error al obtener solicitudes')
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener solicitudes')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id])

  /**
   * Obtener solicitudes enviadas
   */
  const fetchSentRequests = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setSentRequests([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<FriendRequestDTO[]>(
        API_ENDPOINTS.FRIENDS.REQUESTS_SENT
      )
      if (response.success && response.data) {
        setSentRequests(response.data)
      } else {
        setError(response.error?.message || 'Error al obtener solicitudes enviadas')
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener solicitudes enviadas')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id])

  /**
   * Obtener sugerencias de amigos
   */
  const fetchSuggestions = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<FriendSuggestionDTO[]>(
        API_ENDPOINTS.FRIENDS.SUGGESTIONS
      )
      if (response.success && response.data) {
        setSuggestions(response.data)
      } else {
        setError(response.error?.message || 'Error al obtener sugerencias')
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener sugerencias')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id])

  /**
   * Enviar solicitud de amistad
   */
  const sendFriendRequest = useCallback(
    async (friendId: string): Promise<FriendDTO | null> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const data: CreateFriendRequestDTO = { friendId }
        const response = await apiClient.post<FriendDTO>(
          API_ENDPOINTS.FRIENDS.SEND_REQUEST,
          data
        )

        if (response.success && response.data) {
          // Actualización optimista: remover de sugerencias inmediatamente
          setSuggestions((prev) => prev.filter((s) => s.userId !== friendId))
          // NOTA: No actualizamos sentRequests aquí, se cargará cuando el usuario haga clic en el tab "Enviadas"
          return response.data
        } else {
          setError(response.error?.message || 'Error al enviar solicitud')
          return null
        }
      } catch (err: any) {
        setError(err.message || 'Error al enviar solicitud')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id]
  )

  /**
   * Aceptar solicitud
   */
  const acceptRequest = useCallback(
    async (requestId: string): Promise<FriendDTO | null> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const data: UpdateFriendRequestDTO = { status: 'accepted' }
        const response = await apiClient.put<FriendDTO>(
          API_ENDPOINTS.FRIENDS.UPDATE_REQUEST(requestId),
          data
        )

        if (response.success && response.data) {
          // Actualización optimista: remover de solicitudes inmediatamente
          setRequests((prev) => prev.filter((r) => r.id !== requestId))
          // NOTA: No actualizamos friends automáticamente, se cargará cuando el usuario haga clic en el tab "Amigos"
          return response.data
        } else {
          setError(response.error?.message || 'Error al aceptar solicitud')
          return null
        }
      } catch (err: any) {
        setError(err.message || 'Error al aceptar solicitud')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id]
  )

  /**
   * Rechazar solicitud
   */
  const rejectRequest = useCallback(
    async (requestId: string): Promise<void> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data: UpdateFriendRequestDTO = { status: 'rejected' }
        const response = await apiClient.put<FriendDTO>(
          API_ENDPOINTS.FRIENDS.UPDATE_REQUEST(requestId),
          data
        )

        if (response.success) {
          // Remover de solicitudes
          setRequests((prev) => prev.filter((r) => r.id !== requestId))
        } else {
          setError(response.error?.message || 'Error al rechazar solicitud')
        }
      } catch (err: any) {
        setError(err.message || 'Error al rechazar solicitud')
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id]
  )

  /**
   * Eliminar amigo
   */
  const removeFriend = useCallback(
    async (friendId: string): Promise<void> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.delete(API_ENDPOINTS.FRIENDS.REMOVE(friendId))

        if (response.success) {
          // Actualización optimista: remover inmediatamente
          setFriends((prev) => prev.filter((f) => f.friendId !== friendId && f.friend.id !== friendId))
        } else {
          setError(response.error?.message || 'Error al eliminar amigo')
        }
      } catch (err: any) {
        setError(err.message || 'Error al eliminar amigo')
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id]
  )

  /**
   * Cancelar solicitud enviada
   */
  const cancelSentRequest = useCallback(
    async (requestId: string): Promise<void> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.delete(API_ENDPOINTS.FRIENDS.CANCEL_REQUEST(requestId))

        if (response.success) {
          // Actualización optimista: remover inmediatamente
          setSentRequests((prev) => prev.filter((r) => r.id !== requestId))
        } else {
          setError(response.error?.message || 'Error al cancelar solicitud')
          // Si falla, refrescar para restaurar estado
          await fetchSentRequests()
        }
      } catch (err: any) {
        setError(err.message || 'Error al cancelar solicitud')
        // Si falla, refrescar para restaurar estado
        await fetchSentRequests()
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id, fetchSentRequests]
  )

  /**
   * Obtener usuarios bloqueados
   */
  const fetchBlockedUsers = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setBlockedUsers([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<BlockedUserDTO[]>(API_ENDPOINTS.FRIENDS.BLOCKED)
      if (response.success && response.data) {
        setBlockedUsers(response.data)
      } else {
        setError(response.error?.message || 'Error al obtener usuarios bloqueados')
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener usuarios bloqueados')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id])

  /**
   * Bloquear usuario
   */
  const blockUser = useCallback(
    async (userId: string): Promise<void> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.post(API_ENDPOINTS.FRIENDS.BLOCK, { userId })

        if (response.success) {
          // Actualizar usuarios bloqueados
          await fetchBlockedUsers()
          // Actualizar sugerencias (remover el usuario bloqueado)
          setSuggestions((prev) => prev.filter((s) => s.userId !== userId))
        } else {
          setError(response.error?.message || 'Error al bloquear usuario')
        }
      } catch (err: any) {
        setError(err.message || 'Error al bloquear usuario')
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id, fetchBlockedUsers]
  )

  /**
   * Desbloquear usuario
   */
  const unblockUser = useCallback(
    async (userId: string): Promise<void> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.delete(API_ENDPOINTS.FRIENDS.UNBLOCK(userId))

        if (response.success) {
          // Actualizar usuarios bloqueados
          await fetchBlockedUsers()
          // Refrescar sugerencias (el usuario puede reaparecer)
          await fetchSuggestions()
        } else {
          setError(response.error?.message || 'Error al desbloquear usuario')
        }
      } catch (err: any) {
        setError(err.message || 'Error al desbloquear usuario')
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id, fetchBlockedUsers, fetchSuggestions]
  )

  // NO escuchamos eventos de tiempo real constantemente
  // Los datos se actualizarán cuando el usuario cambie de tab o realice acciones
  // Solo las notificaciones se actualizan en tiempo real (manejado en use-notifications)

  return {
    friends,
    requests,
    sentRequests,
    suggestions,
    blockedUsers,
    isLoading,
    error,
    fetchFriends,
    fetchRequests,
    fetchSentRequests,
    fetchSuggestions,
    fetchBlockedUsers,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    cancelSentRequest,
    blockUser,
    unblockUser,
  }
}

