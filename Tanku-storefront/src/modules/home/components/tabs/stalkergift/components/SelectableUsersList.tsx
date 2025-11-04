"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { getListUsers } from "../../../../../social/actions/get-list-users"
import { getFriends } from "../../../../../social/actions/get-friends"
import { getFriendSuggestions } from "../../../../../social/actions/get-friend-suggestions"
import { usePersonalInfo } from "../../../../../../lib/context"

export type SelectableUser = {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_url?: string | null
  alias?: string | null
  is_friend?: boolean
  mutual_friends_count?: number
}

interface SelectableUsersListProps {
  onUserSelect: (user: SelectableUser) => void
  selectedUserId?: string
}

export default function SelectableUsersList({ onUserSelect, selectedUserId }: SelectableUsersListProps) {
  const [friends, setFriends] = useState<SelectableUser[]>([])
  const [allUsers, setAllUsers] = useState<SelectableUser[]>([])
  const [suggestions, setSuggestions] = useState<SelectableUser[]>([])
  const [searchResults, setSearchResults] = useState<SelectableUser[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showDropdown, setShowDropdown] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const USERS_PER_PAGE = 12

  const { personalInfo } = usePersonalInfo()

  useEffect(() => {
    if (!personalInfo) return
    
    const loadUsers = async () => {
      try {
        setIsLoading(true)
        const [usersData, friendsData] = await Promise.all([
          getListUsers(),
          getFriends(personalInfo.id)
        ])
        const filteredAll = (usersData || []).filter((u: any) => u.id !== personalInfo.id)
        setAllUsers(filteredAll)

        // Map friends to SelectableUser shape
        const mappedFriends: SelectableUser[] = (friendsData || []).map((f: any) => ({
          id: f.friend_customer_id,
          first_name: f.friend?.first_name || "",
          last_name: f.friend?.last_name || "",
          email: f.friend?.email || "",
          avatar_url: f.friend?.avatar_url || null,
          alias: f.friend?.alias || null,
          is_friend: true,
        })).filter((u) => u.id !== personalInfo.id)
        setFriends(mappedFriends)

        // Si hay amigos, cargar sugerencias (amigos de amigos)
        if (mappedFriends.length > 0) {
          try {
            const suggestionsData = await getFriendSuggestions(personalInfo.id)
            const mappedSuggestions: SelectableUser[] = (suggestionsData || []).map((s: any) => ({
              id: s.id,
              first_name: s.first_name || "",
              last_name: s.last_name || "",
              email: s.email || "",
              avatar_url: s.avatar_url || null,
              alias: s.alias || null,
              is_friend: false,
              mutual_friends_count: s.mutual_friends_count || 0,
            })).filter((u) => u.id !== personalInfo.id)
            setSuggestions(mappedSuggestions)
          } catch (suggestionError) {
            console.error('Error al cargar sugerencias:', suggestionError)
            setSuggestions([])
          }
        } else {
          setSuggestions([])
        }
      } catch (error) {
        console.error('Error al cargar usuarios:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [personalInfo])

  useEffect(() => {
    if (!personalInfo) return
    
    if (searchTerm.trim() === '') {
      setSearchResults([])
      setShowDropdown(false)
    } else {
      const pool = allUsers
      const filtered = pool.filter(user => 
        (user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        user.id !== personalInfo.id
      )
      setSearchResults(filtered)
      setShowDropdown(true)
    }
  }, [searchTerm, allUsers, personalInfo])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleUserClick = (user: SelectableUser) => {
    onUserSelect(user)
    setSearchTerm('')
    setShowDropdown(false)
  }

  // Combinar usuarios: amigos + otros usuarios (sugerencias o usuarios comunes)
  const getCombinedUsers = (): SelectableUser[] => {
    if (friends.length > 0) {
      // Si hay amigos: agregar amigos primero, luego sugerencias o usuarios comunes
      const combinedUsers = [...friends]
      
      // Si hay sugerencias, usarlas; si no, usar usuarios comunes pero limitados a 10
      const otherUsers = suggestions.length > 0 
        ? suggestions 
        : allUsers.slice(0, 15) // Limitar usuarios comunes a 15 cuando hay amigos
      
      // Filtrar para evitar duplicados (si un amigo también está en otras listas)
      const friendIds = new Set(friends.map(f => f.id))
      const filteredOthers = otherUsers.filter(u => !friendIds.has(u.id))
      return [...combinedUsers, ...filteredOthers]
    } else {
      // Si no hay amigos: solo usuarios comunes (sin límite)
      return allUsers
    }
  }

  // Calcular paginación
  const combinedUsers = getCombinedUsers()
  const totalPages = Math.ceil(combinedUsers.length / USERS_PER_PAGE)
  const startIndex = (currentPage - 1) * USERS_PER_PAGE
  const endIndex = startIndex + USERS_PER_PAGE
  const currentUsers = combinedUsers.slice(startIndex, endIndex)

  // Resetear página cuando cambian los usuarios
  useEffect(() => {
    setCurrentPage(1)
  }, [friends.length, suggestions.length, allUsers.length])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#66DEDB]"></div>
        <p className="text-gray-300 ml-4">Cargando usuarios...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Buscar usuarios por nombre o email..."
            className="w-full px-4 py-3 bg-[#262626] text-white rounded-lg border border-[#66DEDB]/30 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20 transition-all duration-200"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Dropdown de búsqueda */}
        {showDropdown && searchTerm.trim() !== '' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#262626] border border-[#66DEDB]/30 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className={`flex items-center justify-between p-3 hover:bg-[#66DEDB]/10 transition-colors duration-200 border-b border-gray-700 last:border-b-0 cursor-pointer ${
                    selectedUserId === user.id ? 'bg-[#66DEDB]/20' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className="relative w-10 h-10 mr-3">
                      <Image
                        src={(user as any).avatar_url || "/feed/avatar.png"}
                        alt={`${user.first_name} ${user.last_name}`}
                        fill
                        className="rounded-full object-cover border border-[#66DEDB]"
                      />
                    </div>
                    <div>
                      <span className="text-white font-medium block">
                        {user.first_name} {user.last_name}
                      </span>
                      <span className="text-gray-400 text-sm">
                        @{(user as any).alias || user.email.split('@')[0]}
                      </span>
                    </div>
                  </div>
                  {selectedUserId === user.id && (
                    <div className="text-[#66DEDB]">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-gray-400 text-center">
                No se encontraron usuarios
              </div>
            )}
          </div>
        )}
      </div>

      {/* Título único: Amigos y Usuarios Tanku */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#66DEDB] flex items-center">
          <span className="mr-2">👥</span>
          Amigos y Usuarios Tanku
        </h3>

        {/* Grid único con todos los usuarios mezclados (paginados) */}
        {currentUsers.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentUsers.map((user) => (
                <div 
                  key={user.id} 
                  onClick={() => handleUserClick(user)}
                  className={`bg-[#262626]/30 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border cursor-pointer h-[220px] flex flex-col ${
                    selectedUserId === user.id 
                      ? 'border-[#66DEDB] bg-[#66DEDB]/10' 
                      : 'border-[#66DEDB]/20 hover:border-[#66DEDB]/50'
                  }`}
                >
                  <div className="flex flex-col items-center text-center flex-1 justify-between">
                    <div className="relative w-16 h-16 mb-3 flex-shrink-0">
                      <Image
                        src={(user as any).avatar_url || "/feed/avatar.png"}
                        alt={`${user.first_name} ${user.last_name}`}
                        fill
                        className="rounded-full object-cover border-2 border-[#66DEDB]"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-center w-full min-w-0">
                      <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2 leading-tight">
                        {user.first_name} {user.last_name}
                      </h3>
                      <p className="text-xs text-gray-400 truncate w-full">
                        @{(user as any).alias || user.email.split('@')[0]}
                      </p>
                    </div>
                    {/* Área reservada para badges/indicadores (altura fija) */}
                    <div className="h-12 flex flex-col items-center justify-center gap-1 mt-2 w-full">
                      {/* Badge "Amigos" solo si es amigo */}
                      {user.is_friend ? (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#66DEDB]/20 text-[#66DEDB] border border-[#66DEDB]/30">
                            Amigos
                          </span>
                        </div>
                      ) : user.mutual_friends_count && user.mutual_friends_count > 0 ? (
                        <p className="text-xs text-[#66DEDB] text-center px-1 line-clamp-1">
                          {user.mutual_friends_count} {user.mutual_friends_count === 1 ? 'amigo en común' : 'amigos en común'}
                        </p>
                      ) : (
                        <div className="h-5"></div>
                      )}
                      {/* Indicador "Seleccionado" */}
                      {selectedUserId === user.id ? (
                        <div className="flex items-center text-[#66DEDB] text-xs flex-shrink-0">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Seleccionado</span>
                        </div>
                      ) : (
                        <div className="h-5"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controles de paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-[#66DEDB] text-white hover:bg-[#5FE085] hover:scale-105'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Anterior
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <span className="text-gray-500 text-sm">
                    ({combinedUsers.length} {combinedUsers.length === 1 ? 'usuario' : 'usuarios'})
                  </span>
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-[#66DEDB] text-white hover:bg-[#5FE085] hover:scale-105'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    Siguiente
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">No hay usuarios disponibles</p>
          </div>
        )}
      </div>

    </div>
  )
}
