/**
 * Hook personalizado para la selección de usuarios en Stalker Gift
 */

import { useState, useEffect, useCallback } from "react"

export interface TankuUser {
  id: string
  name: string
  username?: string
  email?: string
  avatar?: string
  isFriend?: boolean
}

interface UseUserSelectionReturn {
  // Estados
  selectedUser: TankuUser | null
  friends: TankuUser[]
  searchResults: TankuUser[]
  isLoadingFriends: boolean
  isSearching: boolean
  searchTerm: string

  // Acciones
  selectUser: (user: TankuUser) => void
  clearSelection: () => void
  setSearchTerm: (term: string) => void
  searchUsers: (query: string) => Promise<void>
  loadFriends: () => Promise<void>
}

export function useUserSelection(): UseUserSelectionReturn {
  const [selectedUser, setSelectedUser] = useState<TankuUser | null>(null)
  const [friends, setFriends] = useState<TankuUser[]>([])
  const [searchResults, setSearchResults] = useState<TankuUser[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Cargar amigos
  const loadFriends = useCallback(async () => {
    setIsLoadingFriends(true)
    try {
      // TODO: Reemplazar con llamada real al API
      // const response = await fetch('/api/friends')
      // if (!response.ok) throw new Error('Error loading friends')
      // const data = await response.json()
      // setFriends(data.friends)

      // Mock data para desarrollo
      await new Promise((resolve) => setTimeout(resolve, 800))
      const mockFriends: TankuUser[] = [
        {
          id: "friend_1",
          name: "Maria Garcia",
          username: "@mariagarcia",
          email: "maria@example.com",
          avatar: "https://i.pravatar.cc/150?img=1",
          isFriend: true,
        },
        {
          id: "friend_2",
          name: "Juan Perez",
          username: "@juanperez",
          email: "juan@example.com",
          avatar: "https://i.pravatar.cc/150?img=2",
          isFriend: true,
        },
        {
          id: "friend_3",
          name: "Ana Martinez",
          username: "@anamartinez",
          email: "ana@example.com",
          avatar: "https://i.pravatar.cc/150?img=3",
          isFriend: true,
        },
        {
          id: "friend_4",
          name: "Carlos Rodriguez",
          username: "@carlosr",
          email: "carlos@example.com",
          avatar: "https://i.pravatar.cc/150?img=4",
          isFriend: true,
        },
      ]

      setFriends(mockFriends)
    } catch (error) {
      console.error("[useUserSelection] Error loading friends:", error)
      setFriends([])
    } finally {
      setIsLoadingFriends(false)
    }
  }, [])

  // Buscar usuarios
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // TODO: Reemplazar con llamada real al API
      // const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      // if (!response.ok) throw new Error('Error searching users')
      // const data = await response.json()
      // setSearchResults(data.users)

      // Mock data para desarrollo
      await new Promise((resolve) => setTimeout(resolve, 600))
      const mockResults: TankuUser[] = [
        {
          id: "user_1",
          name: "Laura Gomez",
          username: "@laurag",
          email: "laura@example.com",
          avatar: "https://i.pravatar.cc/150?img=5",
          isFriend: false,
        },
        {
          id: "user_2",
          name: "Pedro Sanchez",
          username: "@pedros",
          email: "pedro@example.com",
          avatar: "https://i.pravatar.cc/150?img=6",
          isFriend: false,
        },
        {
          id: "user_3",
          name: "Sofia Lopez",
          username: "@sofial",
          email: "sofia@example.com",
          avatar: "https://i.pravatar.cc/150?img=7",
          isFriend: false,
        },
      ].filter(
        (user) =>
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.username?.toLowerCase().includes(query.toLowerCase())
      )

      setSearchResults(mockResults)
    } catch (error) {
      console.error("[useUserSelection] Error searching users:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Efecto para buscar cuando cambia el término
  useEffect(() => {
    if (searchTerm.length >= 3) {
      const debounce = setTimeout(() => {
        searchUsers(searchTerm)
      }, 300)

      return () => clearTimeout(debounce)
    } else {
      setSearchResults([])
    }
  }, [searchTerm, searchUsers])

  // Seleccionar usuario
  const selectUser = useCallback((user: TankuUser) => {
    setSelectedUser(user)
  }, [])

  // Limpiar selección
  const clearSelection = useCallback(() => {
    setSelectedUser(null)
  }, [])

  return {
    // Estados
    selectedUser,
    friends,
    searchResults,
    isLoadingFriends,
    isSearching,
    searchTerm,

    // Acciones
    selectUser,
    clearSelection,
    setSearchTerm,
    searchUsers,
    loadFriends,
  }
}

// Hook para obtener detalles de un usuario específico
export function useUserDetails(userId: string | null) {
  const [user, setUser] = useState<TankuUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setUser(null)
      return
    }

    const fetchUser = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // TODO: Reemplazar con llamada real al API
        // const response = await fetch(`/api/users/${userId}`)
        // if (!response.ok) throw new Error('User not found')
        // const data = await response.json()
        // setUser(data.user)

        // Mock data para desarrollo
        await new Promise((resolve) => setTimeout(resolve, 500))
        const mockUser: TankuUser = {
          id: userId,
          name: "Usuario Mock",
          username: "@usuario",
          avatar: "https://i.pravatar.cc/150?img=8",
          isFriend: false,
        }

        setUser(mockUser)
      } catch (err: any) {
        console.error("[useUserDetails] Error fetching user:", err)
        setError(err.message)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [userId])

  return { user, isLoading, error }
}

// Utilidades
export function formatUsername(username?: string): string {
  if (!username) return ""
  return username.startsWith("@") ? username : `@${username}`
}

export function getUserInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function getUserAvatarUrl(user: TankuUser): string {
  return user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`
}