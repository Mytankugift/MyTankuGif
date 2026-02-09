'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useChat } from '@/lib/hooks/use-chat'
import { useSocket } from '@/lib/hooks/use-socket'
import { UserAvatar } from '@/components/shared/user-avatar'
import { LinkIcon } from '@heroicons/react/24/outline'

interface ShareProductModalProps {
  isOpen: boolean
  productUrl: string
  productTitle?: string | null
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

export function ShareProductModal({ isOpen, productUrl, productTitle, onClose }: ShareProductModalProps) {
  const [allFriends, setAllFriends] = useState<Friend[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
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
        setAllFriends(allFriendsList)
        setFriends(allFriendsList.slice(0, 20))
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
        if (prev.length >= 5) {
          return prev
        }
        return [...prev, friendId]
      }
    })
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl)
      alert('¡Enlace copiado al portapapeles!')
    } catch (err) {
      console.error('Error copiando al portapapeles:', err)
    }
  }

  const handleSend = async () => {
    if (selectedFriends.length === 0 || isSending) return

    setIsSending(true)
    try {
      const messageText = `Mira este producto:\n${productUrl}${productTitle ? `\n\n${productTitle}` : ''}`

      for (const friendId of selectedFriends) {
        try {
          const conversation = await createOrGetConversation(friendId, 'FRIENDS')
          
          if (conversation) {
            if (isConnected && sendSocketMessage) {
              sendMessageChat(conversation.id, messageText, 'TEXT', sendSocketMessage)
            } else {
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
        className="w-[650px] h-[550px] overflow-hidden flex flex-col relative"
        style={{ 
          backgroundColor: '#2C3137',
          border: '2px solid #73FFA2',
          borderRadius: '25px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex-shrink-0 mb-4">
            <h2 
              className="text-xl font-semibold mb-3"
              style={{ color: '#73FFA2' }}
            >
              Compartir
            </h2>
            <p 
              className="text-sm leading-relaxed"
              style={{ color: '#66DEDB' }}
            >
              Envíalo como una idea. El gesto puede venir después. A veces, compartir una idea ya es pensar en alguien.
            </p>
          </div>

          {/* Botón copiar link */}
          <div className="flex-shrink-0 mb-4">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-4 transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'transparent',
                border: '2px solid #73FFA2',
                borderRadius: '25px',
                color: '#ffffff',
                paddingTop: '0.75rem',
                paddingBottom: '0.75rem'
              }}
            >
              <LinkIcon className="w-5 h-5" />
              <span>Copiar Enlace</span>
            </button>
          </div>

          {/* Search */}
          <div className="flex-shrink-0 mb-4">
            <input
              type="text"
              placeholder="Buscar Amigos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 focus:outline-none placeholder:text-[#2C3137]"
              style={{
                backgroundColor: '#66DEDB',
                borderRadius: '25px',
                color: '#2C3137',
                border: '2px solid #66DEDB'
              }}
            />
          </div>

          {/* Friends Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
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
          <div className="flex-shrink-0 mt-4 flex items-center justify-end">
            <button
              onClick={handleSend}
              disabled={selectedFriends.length === 0 || isSending}
              className="px-6 py-2 font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#73FFA2',
                color: '#2C3137',
                borderRadius: '25px'
              }}
            >
              {isSending ? 'Enviando...' : 'Compartir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

