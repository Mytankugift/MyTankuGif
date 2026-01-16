'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useFriends } from '@/lib/hooks/use-friends'
import type { User, FriendUserDTO } from '@/types/api'

type ReceiverType = 'tanku' | 'external'

interface ReceiverData {
  type: ReceiverType
  user?: User
  externalData?: {
    email?: string
    instagram?: string
    phone?: string
    name?: string
  }
}

interface ReceiverSelectorProps {
  receiver: ReceiverData | null
  onSelect: (receiver: ReceiverData) => void
}

export function ReceiverSelector({ receiver, onSelect }: ReceiverSelectorProps) {
  const [activeTab, setActiveTab] = useState<ReceiverType>(receiver?.type || 'tanku')
  const [searchQuery, setSearchQuery] = useState('')
  const [externalData, setExternalData] = useState({
    email: '',
    instagram: '',
    phone: '',
    name: '',
  })

  const { friends, suggestions, isLoading, fetchFriends, fetchSuggestions } = useFriends()

  // Cargar datos iniciales
  useEffect(() => {
    fetchFriends()
    fetchSuggestions()
  }, [])

  // Filtrar amigos y sugerencias
  const filteredFriends = friends.filter((friend) => {
    if (!searchQuery.trim()) return true
    const fullName = `${friend.friend.firstName || ''} ${friend.friend.lastName || ''}`
      .trim()
      .toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  const filteredSuggestions = suggestions.filter((suggestion) => {
    if (!searchQuery.trim()) return true
    const fullName = `${suggestion.user.firstName || ''} ${suggestion.user.lastName || ''}`
      .trim()
      .toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  const handleSelectUser = (user: User | FriendUserDTO) => {
    // Convertir FriendUserDTO a User agregando phone si falta
    const fullUser: User = {
      ...user,
      phone: 'phone' in user ? user.phone : null,
    }
    onSelect({
      type: 'tanku',
      user: fullUser,
    })
  }

  const handleExternalDataChange = (field: keyof typeof externalData, value: string) => {
    const newData = { ...externalData, [field]: value }
    setExternalData(newData)

    // Validar que haya al menos un campo (email, instagram o phone)
    if (newData.email || newData.instagram || newData.phone) {
      onSelect({
        type: 'external',
        externalData: {
          email: newData.email || undefined,
          instagram: newData.instagram || undefined,
          phone: newData.phone || undefined,
          name: newData.name || undefined,
        },
      })
    } else {
      onSelect({
        type: 'external',
        externalData: undefined,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">¿Para quién es el regalo?</h3>
        <p className="text-sm text-gray-400">
          Selecciona si el regalo es para un usuario de Tanku o para alguien externo
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('tanku')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'tanku'
              ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
              : 'text-gray-400 hover:text-[#73FFA2]'
          }`}
        >
          Usuario de Tanku
        </button>
        <button
          onClick={() => setActiveTab('external')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'external'
              ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
              : 'text-gray-400 hover:text-[#73FFA2]'
          }`}
        >
          Usuario externo
        </button>
      </div>

      {/* Contenido según tab */}
      {activeTab === 'tanku' && (
        <div className="space-y-4">
          {/* Búsqueda */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuario..."
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
            />
          </div>

          {/* Lista de amigos */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Cargando usuarios...</div>
            ) : (
              <>
                {filteredFriends.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2 px-2">Amigos</h4>
                    {filteredFriends.map((friend) => (
                      <button
                        key={friend.friend.id}
                        onClick={() => handleSelectUser(friend.friend)}
                        className={`w-full text-left p-3 rounded-lg transition-colors mb-2 ${
                          receiver?.type === 'tanku' && receiver?.user?.id === friend.friend.id
                            ? 'bg-[#66DEDB]/20 border border-[#66DEDB]'
                            : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {friend.friend.profile?.avatar ? (
                            <img
                              src={friend.friend.profile.avatar}
                              alt={friend.friend.firstName || 'Usuario'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-white text-sm">
                                {(friend.friend.firstName?.[0] || friend.friend.email?.[0] || 'U').toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {friend.friend.firstName && friend.friend.lastName
                                ? `${friend.friend.firstName} ${friend.friend.lastName}`
                                : friend.friend.email}
                            </p>
                            {friend.friend.email && (
                              <p className="text-xs text-gray-400 truncate">{friend.friend.email}</p>
                            )}
                          </div>
                          {receiver?.type === 'tanku' && receiver?.user?.id === friend.friend.id && (
                            <span className="text-[#73FFA2] text-sm">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {filteredSuggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2 px-2 mt-4">
                      Otros usuarios
                    </h4>
                    {filteredSuggestions.slice(0, 10).map((suggestion) => (
                      <button
                        key={suggestion.user.id}
                        onClick={() => handleSelectUser(suggestion.user)}
                        className={`w-full text-left p-3 rounded-lg transition-colors mb-2 ${
                          receiver?.type === 'tanku' && receiver?.user?.id === suggestion.user.id
                            ? 'bg-[#66DEDB]/20 border border-[#66DEDB]'
                            : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {suggestion.user.profile?.avatar ? (
                            <img
                              src={suggestion.user.profile.avatar}
                              alt={suggestion.user.firstName || 'Usuario'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-white text-sm">
                                {(suggestion.user.firstName?.[0] || suggestion.user.email?.[0] || 'U').toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {suggestion.user.firstName && suggestion.user.lastName
                                ? `${suggestion.user.firstName} ${suggestion.user.lastName}`
                                : suggestion.user.email}
                            </p>
                            {suggestion.user.email && (
                              <p className="text-xs text-gray-400 truncate">{suggestion.user.email}</p>
                            )}
                          </div>
                          {receiver?.type === 'tanku' && receiver?.user?.id === suggestion.user.id && (
                            <span className="text-[#73FFA2] text-sm">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {filteredFriends.length === 0 && filteredSuggestions.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-gray-400">
                    No se encontraron usuarios con "{searchQuery}"
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'external' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400 mb-4">
            Ingresa al menos un método de contacto (Instagram, Email o Teléfono)
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Instagram <span className="text-gray-500">(opcional)</span>
              </label>
              <input
                type="text"
                value={externalData.instagram}
                onChange={(e) => handleExternalDataChange('instagram', e.target.value)}
                placeholder="@usuario"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-gray-500">(opcional)</span>
              </label>
              <input
                type="email"
                value={externalData.email}
                onChange={(e) => handleExternalDataChange('email', e.target.value)}
                placeholder="usuario@email.com"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Teléfono <span className="text-gray-500">(opcional)</span>
              </label>
              <input
                type="tel"
                value={externalData.phone}
                onChange={(e) => handleExternalDataChange('phone', e.target.value)}
                placeholder="3001234567"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre <span className="text-gray-500">(opcional)</span>
              </label>
              <input
                type="text"
                value={externalData.name}
                onChange={(e) => handleExternalDataChange('name', e.target.value)}
                placeholder="Nombre del receptor"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
              />
            </div>
          </div>

          {receiver?.type === 'external' && receiver.externalData && (
            <div className="mt-4 p-3 bg-[#66DEDB]/10 border border-[#66DEDB] rounded-lg">
              <p className="text-sm text-[#66DEDB]">
                ✓ Receptor externo configurado correctamente
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

