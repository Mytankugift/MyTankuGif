'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useChat } from '@/lib/hooks/use-chat'
import { useSocket } from '@/lib/hooks/use-socket'
import { UserAvatar } from '@/components/shared/user-avatar'
import { XMarkIcon, LinkIcon } from '@heroicons/react/24/outline'

interface SharePostModalProps {
  isOpen: boolean
  postUrl: string
  postDescription?: string | null
  onClose: () => void
}

interface Friend {
  id: string
  friend: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    profile: {
      avatar: string | null
    } | null
  }
}

export function SharePostModal({ isOpen, postUrl, postDescription, onClose }: SharePostModalProps) {
  const [allFriends, setAllFriends] = useState<Friend[]>([]) // Todos los amigos para búsqueda
  const [friends, setFriends] = useState<Friend[]>([]) // Primeros 20 amigos para mostrar
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { createOrGetConversation, sendMessage: sendMessageChat } = useChat()
  const { sendMessage: sendSocketMessage, isConnected } = useSocket()

  useEffect(() => {
    if (isOpen) {
      loadFriends()
    } else {
      setSelectedFriends([])
      setSearchQuery('')
    }
  }, [isOpen])

  const loadFriends = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get<{ friends: Friend[]; count: number }>(API_ENDPOINTS.FRIENDS.LIST)
      if (response.success && response.data) {
        const allFriendsList = response.data.friends || []
        setAllFriends(allFriendsList) // Guardar todos para búsqueda
        setFriends(allFriendsList.slice(0, 20)) // Mostrar solo los primeros 20
      }
    } catch (error) {
      console.error('Error cargando amigos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId)
      } else {
        // Máximo 5 amigos
        if (prev.length >= 5) {
          return prev
        }
        return [...prev, friendId]
      }
    })
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl)
      alert('¡Enlace copiado al portapapeles!')
    } catch (err) {
      console.error('Error copiando al portapapeles:', err)
    }
  }

  const handleSend = async () => {
    if (selectedFriends.length === 0 || isSending) return

    setIsSending(true)
    try {
      const messageText = `Mira esta publicación:\n${postUrl}${postDescription ? `\n\n${postDescription}` : ''}`

      for (const friendId of selectedFriends) {
        try {
          // Crear o obtener conversación
          const conversation = await createOrGetConversation(friendId, 'FRIENDS')
          
          if (conversation) {
            // Enviar mensaje
            if (isConnected && sendSocketMessage) {
              sendMessageChat(conversation.id, messageText, 'TEXT', sendSocketMessage)
            } else {
              // Fallback sin socket
              await apiClient.post(API_ENDPOINTS.CHAT.SEND_MESSAGE(conversation.id), {
                content: messageText,
                type: 'TEXT',
              })
            }
          }
        } catch (error) {
          console.error(`Error enviando a ${friendId}:`, error)
        }
      }

      onClose()
      alert(`¡Enlace compartido con ${selectedFriends.length} ${selectedFriends.length === 1 ? 'amigo' : 'amigos'}!`)
    } catch (error) {
      console.error('Error compartiendo:', error)
      alert('Error al compartir el enlace')
    } finally {
      setIsSending(false)
    }
  }

  // Si hay búsqueda, buscar en todos los amigos. Si no, mostrar solo los primeros 20
  const filteredFriends = searchQuery
    ? allFriends.filter(friend => {
        const query = searchQuery.toLowerCase()
        const name = `${friend.friend.firstName || ''} ${friend.friend.lastName || ''}`.toLowerCase()
        const email = friend.friend.email.toLowerCase()
        return name.includes(query) || email.includes(query)
      })
    : friends

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg w-[500px] h-[600px] overflow-hidden flex flex-col border border-gray-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold text-lg">Compartir publicación</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Botón copiar link */}
        <div className="flex-shrink-0 p-4 border-b border-gray-700">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
          >
            <LinkIcon className="w-5 h-5" />
            <span>Copiar enlace</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Buscar amigos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#73FFA2]"
          />
        </div>

        {/* Friends Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
            </div>
          ) : filteredFriends.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchQuery ? 'No se encontraron amigos' : 'No tienes amigos aún'}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {filteredFriends.map((friend) => {
                const friendUser = friend.friend
                const friendName = friendUser.firstName && friendUser.lastName
                  ? `${friendUser.firstName} ${friendUser.lastName}`
                  : friendUser.email.split('@')[0]
                const isSelected = selectedFriends.includes(friendUser.id)
                const isDisabled = !isSelected && selectedFriends.length >= 5

                return (
                  <button
                    key={friendUser.id}
                    onClick={() => toggleFriendSelection(friendUser.id)}
                    disabled={isDisabled}
                    className={`flex flex-col items-center gap-2 transition-opacity ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                    }`}
                  >
                    <div className="relative">
                      <UserAvatar
                        user={{
                          avatar: friendUser.profile?.avatar || null,
                          firstName: friendUser.firstName,
                          lastName: friendUser.lastName,
                          email: friendUser.email,
                        }}
                        size={64}
                      />
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#73FFA2] flex items-center justify-center border-2 border-gray-900">
                          <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className={`text-white text-xs text-center max-w-full truncate ${isSelected ? 'font-semibold' : ''}`}>
                      {friendName}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-700 flex items-center justify-between">
          <span className="text-gray-400 text-sm">
            {selectedFriends.length}/5 {selectedFriends.length === 1 ? 'amigo seleccionado' : 'amigos seleccionados'}
          </span>
          <button
            onClick={handleSend}
            disabled={selectedFriends.length === 0 || isSending}
            className="px-6 py-2 bg-[#73FFA2] hover:bg-[#66e891] text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

