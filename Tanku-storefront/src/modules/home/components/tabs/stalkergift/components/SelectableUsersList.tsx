"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { getListUsers } from "../../../../../social/actions/get-list-users"
import { usePersonalInfo } from "../../../../../../lib/context"

export type SelectableUser = {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface SelectableUsersListProps {
  onUserSelect: (user: SelectableUser) => void
  selectedUserId?: string
}

export default function SelectableUsersList({ onUserSelect, selectedUserId }: SelectableUsersListProps) {
  const [users, setUsers] = useState<SelectableUser[]>([])
  const [searchResults, setSearchResults] = useState<SelectableUser[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showDropdown, setShowDropdown] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const { personalInfo } = usePersonalInfo()

  useEffect(() => {
    if (!personalInfo) return
    
    const loadUsers = async () => {
      try {
        setIsLoading(true)
        const usersData = await getListUsers()
        // Filtrar al usuario actual de la lista
        const filteredUsers = usersData.filter((user: SelectableUser) => user.id !== personalInfo.id)
        setUsers(filteredUsers)
        console.log("filteredUsers", filteredUsers)
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
      const filtered = users.filter(user => 
        (user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        user.id !== personalInfo.id
      )
      setSearchResults(filtered)
      setShowDropdown(true)
    }
  }, [searchTerm, users, personalInfo])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleUserClick = (user: SelectableUser) => {
    onUserSelect(user)
    setSearchTerm('')
    setShowDropdown(false)
  }

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
                        src="/feed/avatar.png"
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
                        {user.email}
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

      {/* Lista de usuarios en grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {users.slice(0, 12).map((user) => (
          <div 
            key={user.id} 
            onClick={() => handleUserClick(user)}
            className={`bg-[#262626]/30 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border cursor-pointer ${
              selectedUserId === user.id 
                ? 'border-[#66DEDB] bg-[#66DEDB]/10' 
                : 'border-[#66DEDB]/20 hover:border-[#66DEDB]/50'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative w-16 h-16 mb-3">
                <Image
                  src="/feed/avatar.png"
                  alt={`${user.first_name} ${user.last_name}`}
                  fill
                  className="rounded-full object-cover border-2 border-[#66DEDB]"
                />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {user.first_name} {user.last_name}
              </h3>
              <p className="text-xs text-gray-400 truncate w-full">
                {user.email}
              </p>
              {selectedUserId === user.id && (
                <div className="mt-2 flex items-center text-[#66DEDB] text-xs">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Seleccionado
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {users.length > 12 && (
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Mostrando los primeros 12 usuarios. Usa el buscador para encontrar usuarios específicos.
          </p>
        </div>
      )}

      {users.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400">No hay usuarios disponibles</p>
        </div>
      )}
    </div>
  )
}
