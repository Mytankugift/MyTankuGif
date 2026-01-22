'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useChat } from '@/lib/hooks/use-chat'
import { useSocket } from '@/lib/hooks/use-socket'
import { UserAvatar } from '@/components/shared/user-avatar'
import { XMarkIcon, LinkIcon } from '@heroicons/react/24/outline'
import type { WishListDTO } from '@/types/api'

interface ShareWishlistModalProps {
  wishlist: WishListDTO
  isOpen: boolean
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

export function ShareWishlistModal({ wishlist, isOpen, onClose }: ShareWishlistModalProps) {
  const [allFriends, setAllFriends] = useState<Friend[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const { createOrGetConversation, sendMessage: sendMessageChat } = useChat()
  const { sendMessage: sendSocketMessage, isConnected } = useSocket()

  useEffect(() => {
    if (isOpen) {
      loadFriends()
      generateShareToken()
    } else {
      setSelectedFriends([])
      setSearchQuery('')
      setShareToken(null)
    }
  }, [isOpen, wishlist.id])

  const generateShareToken = async () => {
    try {
      const response = await apiClient.post<{ token: string; shareUrl: string }>(
        API_ENDPOINTS.WISHLISTS.SHARE_TOKEN(wishlist.id)
      )
      if (response.success && response.data) {
        const token = response.data.token
        const shareUrlPath = response.data.shareUrl
        setShareToken(token)
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        setShareUrl(`${baseUrl}${shareUrlPath}`)
      }
    } catch (error) {
      console.error('Error generando token de compartir:', error)
    }
  }

  const loadFriends = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get<{ friends: Friend[]; count: number }>(
        API_ENDPOINTS.FRIENDS.LIST
      )
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

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allFriends.filter((friend) => {
        const fullName = `${friend.friend.firstName || ''} ${friend.friend.lastName || ''}`.trim()
        const email = friend.friend.email.toLowerCase()
        const query = searchQuery.toLowerCase()
        return fullName.toLowerCase().includes(query) || email.includes(query)
      })
      setFriends(filtered)
    } else {
      setFriends(allFriends.slice(0, 20))
    }
  }, [searchQuery, allFriends])

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId)
      } else {
        if (prev.length >= 5) {
          return prev
        }
        return [...prev, friendId]
      }
    })
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('¡Enlace copiado al portapapeles!')
    } catch (err) {
      console.error('Error copiando al portapapeles:', err)
    }
  }

  const handleSend = async () => {
    if (selectedFriends.length === 0 || isSending || !shareUrl) return

    setIsSending(true)
    try {
      const messageText = `Te quiero compartir mi wishlist "${wishlist.name}"\n${shareUrl}`

      for (const friendId of selectedFriends) {
        try {
          const conversation = await createOrGetConversation(friendId, 'FRIENDS')

          if (conversation) {
            // ✅ Corregir: pasar los 4 argumentos requeridos
            // sendMessageChat ya maneja el envío por socket internamente
            if (isConnected && sendSocketMessage) {
              sendMessageChat(conversation.id, messageText, 'TEXT', sendSocketMessage)
            } else {
              // Fallback sin socket (aunque no debería pasar si isConnected es false)
              console.warn('Socket no conectado, no se puede enviar mensaje')
            }
          }
        } catch (error) {
          console.error(`Error enviando mensaje a ${friendId}:`, error)
        }
      }

      // TODO: Crear notificación de wishlist compartida
      alert(`Wishlist compartida con ${selectedFriends.length} amigo(s)`)
      onClose()
    } catch (error) {
      console.error('Error compartiendo wishlist:', error)
      alert('Error al compartir la wishlist')
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-[#73FFA2]/40 rounded-xl w-full max-w-md overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-[#73FFA2]">Compartir Wishlist</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Copiar link */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enlace para compartir
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                title="Copiar enlace"
              >
                <LinkIcon className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Buscar amigos */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar amigos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#73FFA2]"
            />
          </div>

          {/* Lista de amigos */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2] mx-auto"></div>
              <p className="text-gray-400 mt-2">Cargando amigos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto custom-scrollbar">
              {friends.map((friend) => {
                const isSelected = selectedFriends.includes(friend.friend.id)
                const fullName = `${friend.friend.firstName || ''} ${friend.friend.lastName || ''}`.trim() || friend.friend.email.split('@')[0]

                return (
                  <button
                    key={friend.friend.id}
                    onClick={() => toggleFriendSelection(friend.friend.id)}
                    disabled={!isSelected && selectedFriends.length >= 5}
                    className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-[#73FFA2]/20 border-2 border-[#73FFA2]'
                        : selectedFriends.length >= 5
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-800 border-2 border-transparent'
                    }`}
                  >
                    <UserAvatar
                      user={{
                        avatar: friend.friend.profile?.avatar || null,
                        firstName: friend.friend.firstName,
                        lastName: friend.friend.lastName,
                        email: friend.friend.email,
                      }}
                      size={48}
                    />
                    <span className="text-xs text-gray-300 text-center line-clamp-2">
                      {fullName}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {selectedFriends.length > 0 && (
            <div className="mt-4 text-sm text-gray-400">
              {selectedFriends.length} de 5 amigos seleccionados
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={selectedFriends.length === 0 || isSending || !shareUrl}
            className="px-6 py-2 bg-[#73FFA2] text-gray-900 font-semibold rounded-lg hover:bg-[#66DEDB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

