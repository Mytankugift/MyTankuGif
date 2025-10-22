"use client"

import { useState, useEffect } from "react"
import {
  MagnifyingGlass as Search,
  User,
  Users
} from "@medusajs/icons"

// Tipos
export interface TankuUser {
  id: string
  name: string
  username?: string
  email?: string
  avatar?: string
  isFriend?: boolean
}

interface StepSelectUserProps {
  onSelectUser: (user: TankuUser) => void
  onBack: () => void
  selectedUserId?: string
}

// Componente de Spinner
const Spinner = ({ className = "" }: { className?: string }) => (
  <div className={`inline-block ${className}`}>
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </div>
)

export default function StepSelectUser({
  onSelectUser,
  onBack,
  selectedUserId,
}: StepSelectUserProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<TankuUser[]>([])
  const [friends, setFriends] = useState<TankuUser[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(true)
  const [activeTab, setActiveTab] = useState<"friends" | "search">("friends")

  // Cargar amigos al montar el componente
  useEffect(() => {
    loadFriends()
  }, [])

  // Buscar usuarios cuando el término de búsqueda cambia
  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchUsers(searchTerm)
    } else {
      setSearchResults([])
    }
  }, [searchTerm])

  const loadFriends = async () => {
    setIsLoadingFriends(true)
    try {
      // TODO: Reemplazar con llamada real al API
      // const response = await fetch('/api/friends')
      // const data = await response.json()

      // Mock data para desarrollo
      const mockFriends: TankuUser[] = [
        {
          id: "friend_1",
          name: "Maria Garcia",
          username: "@mariagarcia",
          avatar: "https://i.pravatar.cc/150?img=1",
          isFriend: true,
        },
        {
          id: "friend_2",
          name: "Juan Perez",
          username: "@juanperez",
          avatar: "https://i.pravatar.cc/150?img=2",
          isFriend: true,
        },
        {
          id: "friend_3",
          name: "Ana Martinez",
          username: "@anamartinez",
          avatar: "https://i.pravatar.cc/150?img=3",
          isFriend: true,
        },
      ]

      setFriends(mockFriends)
    } catch (error) {
      console.error("Error loading friends:", error)
    } finally {
      setIsLoadingFriends(false)
    }
  }

  const searchUsers = async (query: string) => {
    setIsSearching(true)
    try {
      // TODO: Reemplazar con llamada real al API
      // const response = await fetch(`/api/users/search?q=${query}`)
      // const data = await response.json()

      // Mock data para desarrollo
      const mockResults: TankuUser[] = [
        {
          id: "user_1",
          name: "Carlos Rodriguez",
          username: "@carlosr",
          avatar: "https://i.pravatar.cc/150?img=4",
          isFriend: false,
        },
        {
          id: "user_2",
          name: "Laura Gomez",
          username: "@laurag",
          avatar: "https://i.pravatar.cc/150?img=5",
          isFriend: false,
        },
      ]

      setSearchResults(mockResults)
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectUser = (user: TankuUser) => {
    onSelectUser(user)
  }

  const UserCard = ({ user }: { user: TankuUser }) => {
    const isSelected = selectedUserId === user.id

    return (
      <div
        onClick={() => handleSelectUser(user)}
        className={`
          group relative bg-gradient-to-br from-[#262626] to-[#66DEDB]/10
          border-2 rounded-xl p-4 cursor-pointer transition-all duration-300
          ${
            isSelected
              ? "border-[#66DEDB] shadow-lg shadow-[#66DEDB]/30"
              : "border-[#66DEDB]/30 hover:border-[#66DEDB]/60 hover:shadow-md hover:shadow-[#66DEDB]/20"
          }
        `}
      >
        {/* Checkmark si está seleccionado */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#66DEDB] rounded-full flex items-center justify-center animate-bounce">
            <span className="text-white text-lg">✓</span>
          </div>
        )}

        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#66DEDB]/50"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            {user.isFriend && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#5FE085] rounded-full border-2 border-[#262626] flex items-center justify-center">
                <span className="text-xs">👥</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">
              {user.name}
            </h3>
            {user.username && (
              <p className="text-[#66DEDB] text-sm truncate">
                {user.username}
              </p>
            )}
            {user.isFriend && (
              <span className="inline-block mt-1 text-xs text-[#5FE085] bg-[#5FE085]/10 px-2 py-1 rounded-full">
                Amigo
              </span>
            )}
          </div>

          {/* Icono de selección */}
          <div className="flex-shrink-0">
            <div
              className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
              ${
                isSelected
                  ? "bg-[#66DEDB] border-[#66DEDB]"
                  : "border-gray-500 group-hover:border-[#66DEDB]"
              }
            `}
            >
              {isSelected && <span className="text-white text-sm">✓</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-[#66DEDB] hover:text-[#66DEDB]/80 transition-colors mb-4 flex items-center space-x-2"
        >
          <span>←</span>
          <span>Volver</span>
        </button>

        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-r from-[#66DEDB] to-[#66DEDB]/70 rounded-full px-6 py-2 mb-4">
            <h2 className="text-2xl font-bold text-white">Selecciona el Destinatario</h2>
          </div>
          <p className="text-gray-300">
            Elige a quién quieres enviar tu regalo sorpresa
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-[#66DEDB]/20">
        <button
          onClick={() => setActiveTab("friends")}
          className={`
            flex-1 py-3 px-4 font-semibold transition-all relative
            ${
              activeTab === "friends"
                ? "text-[#66DEDB]"
                : "text-gray-400 hover:text-gray-300"
            }
          `}
        >
          <div className="flex items-center justify-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Mis Amigos</span>
          </div>
          {activeTab === "friends" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#66DEDB] animate-slideIn" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("search")}
          className={`
            flex-1 py-3 px-4 font-semibold transition-all relative
            ${
              activeTab === "search"
                ? "text-[#66DEDB]"
                : "text-gray-400 hover:text-gray-300"
            }
          `}
        >
          <div className="flex items-center justify-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Buscar Usuarios</span>
          </div>
          {activeTab === "search" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#66DEDB] animate-slideIn" />
          )}
        </button>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === "friends" && (
        <div>
          {isLoadingFriends ? (
            <div className="flex justify-center items-center py-12">
              <Spinner className="w-8 h-8 text-[#66DEDB]" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No tienes amigos aún</p>
              <p className="text-gray-500 text-sm mt-2">
                Busca usuarios y envíales solicitudes de amistad
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {friends.map((friend) => (
                <UserCard key={friend.id} user={friend} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "search" && (
        <div>
          {/* Barra de búsqueda */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o usuario..."
              className="w-full bg-[#262626] border-2 border-[#66DEDB]/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#66DEDB] transition-colors"
            />
            {isSearching && (
              <Spinner className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#66DEDB]" />
            )}
          </div>

          {/* Resultados de búsqueda */}
          {searchTerm.length < 3 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Escribe al menos 3 caracteres para buscar</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No se encontraron usuarios</p>
              <p className="text-gray-500 text-sm mt-2">
                Intenta con otro nombre o usuario
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {searchResults.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info adicional */}
      <div className="mt-8 bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-xl p-4">
        <p className="text-[#66DEDB] text-sm text-center">
          💡 <strong>Recuerda:</strong> Tu identidad permanecerá en secreto hasta que decidas compartirla
        </p>
      </div>
    </div>
  )
}