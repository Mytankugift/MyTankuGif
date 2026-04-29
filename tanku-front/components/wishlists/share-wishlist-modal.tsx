'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useChat } from '@/lib/hooks/use-chat'
import { useSocket } from '@/lib/hooks/use-socket'
import { useToast } from '@/lib/contexts/toast-context'
import { UserAvatar } from '@/components/shared/user-avatar'
import { XMarkIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import type { WishListDTO } from '@/types/api'

/** Mismo ícono y campo que `FriendsPageSearchBar` (pill + lupa). */
function ModalFriendsSearchInput({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string
  onSearchChange: (v: string) => void
}) {
  return (
    <div className="relative w-full min-w-0">
      <div className="absolute left-2.5 top-1/2 z-10 -translate-y-1/2 transform">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 41 42"
          fill="none"
          className="h-5 w-5"
          aria-hidden
        >
          <path
            d="M26.8334 8.76545L30.1099 22.6447L20.9442 31.156L8.1482 27.8382L4.84774 14.0188L14.8779 5.75197L26.8334 8.76545Z"
            stroke="#B8C4CC"
            strokeWidth="3"
          />
          <line
            y1="-1.5"
            x2="20.427"
            y2="-1.5"
            transform="matrix(0.709973 0.704229 -0.70423 0.709971 24.3841 27.5551)"
            stroke="#B8C4CC"
            strokeWidth="3"
          />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Buscar por nombre o @usuario…"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        autoComplete="off"
        className="tanku-pill-search-input w-full rounded-full border border-white/10 bg-[var(--color-surface-191e23-20)] py-2 pl-10 pr-3 text-[15px] text-zinc-100 placeholder:text-[#A7A7A7] transition-all duration-200 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20"
        style={{ fontFamily: 'Poppins, sans-serif' }}
      />
    </div>
  )
}

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
  const [shareUrl, setShareUrl] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const { createOrGetConversation, sendMessage: sendMessageChat } = useChat()
  const { sendMessage: sendSocketMessage, isConnected } = useSocket()
  const { success: toastSuccess, error: toastError } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadFriends()
      generateShareToken()
    } else {
      setSelectedFriends([])
      setSearchQuery('')
      setShareUrl('')
    }
  }, [isOpen, wishlist.id])

  const generateShareToken = async () => {
    try {
      const response = await apiClient.post<{ token: string; shareUrl: string }>(
        API_ENDPOINTS.WISHLISTS.SHARE_TOKEN(wishlist.id),
      )
      if (response.success && response.data) {
        const shareUrlPath = response.data.shareUrl
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
      }
      if (prev.length >= 5) {
        return prev
      }
      return [...prev, friendId]
    })
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toastSuccess('Enlace copiado')
    } catch (err) {
      console.error('Error copiando al portapapeles:', err)
      toastError('No se pudo copiar')
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
            if (isConnected && sendSocketMessage) {
              sendMessageChat(conversation.id, messageText, 'TEXT', sendSocketMessage)
            } else {
              console.warn('Socket no conectado, no se puede enviar mensaje')
            }
          }
        } catch (error) {
          console.error(`Error enviando mensaje a ${friendId}:`, error)
        }
      }

      toastSuccess(`Enviado a ${selectedFriends.length} amigo${selectedFriends.length !== 1 ? 's' : ''}`)
      onClose()
    } catch (error) {
      console.error('Error compartiendo wishlist:', error)
      toastError('Error al compartir la wishlist')
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-transparent p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#414141] bg-[#171B21] shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-wishlist-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
          <div className="min-w-0">
            <h3 id="share-wishlist-title" className="text-lg font-semibold text-[#66DEDB]">
              Compartir wishlist
            </h3>
            <p className="mt-0.5 truncate text-sm text-zinc-500" title={wishlist.name}>
              {wishlist.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 pb-5">
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!shareUrl}
              className="inline-flex items-center gap-2 rounded-full border border-[#66DEDB]/40 bg-black/20 px-5 py-2.5 text-sm font-medium text-[#66DEDB] transition-colors hover:border-[#73FFA2]/55 hover:bg-[#66DEDB]/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ClipboardDocumentIcon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              Copiar enlace
            </button>
          </div>

          <ModalFriendsSearchInput searchQuery={searchQuery} onSearchChange={setSearchQuery} />

          {isLoading ? (
            <div className="flex flex-col items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#66DEDB] border-t-transparent" />
              <p className="mt-2 text-sm text-zinc-500">Cargando amigos…</p>
            </div>
          ) : (
            <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto custom-scrollbar sm:gap-3">
              {friends.map((friend) => {
                const isSelected = selectedFriends.includes(friend.friend.id)
                const fullName =
                  `${friend.friend.firstName || ''} ${friend.friend.lastName || ''}`.trim() ||
                  friend.friend.email.split('@')[0]

                return (
                  <button
                    key={friend.friend.id}
                    type="button"
                    onClick={() => toggleFriendSelection(friend.friend.id)}
                    disabled={!isSelected && selectedFriends.length >= 5}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all ${
                      isSelected
                        ? 'border border-[#73FFA2]/60 bg-[#73FFA2]/10 ring-1 ring-[#73FFA2]/35'
                        : selectedFriends.length >= 5
                          ? 'cursor-not-allowed opacity-45'
                          : 'border border-transparent hover:bg-white/[0.04]'
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
                    <span className="line-clamp-2 text-center text-[11px] leading-tight text-zinc-400">{fullName}</span>
                  </button>
                )
              })}
            </div>
          )}

          {selectedFriends.length > 0 && (
            <p className="text-center text-xs text-zinc-500">
              {selectedFriends.length} de 5 seleccionados
            </p>
          )}

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={handleSend}
              disabled={selectedFriends.length === 0 || isSending || !shareUrl}
              className="min-w-[11rem] rounded-[28px] bg-[#73FFA2] px-10 py-3 text-sm font-semibold text-gray-900 shadow-[inset_0_2px_6px_rgba(0,0,0,0.18)] transition-colors hover:bg-[#66DEDB] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
