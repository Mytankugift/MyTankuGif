'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useChat, type Conversation } from '@/lib/hooks/use-chat'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ChatBubbleLeftRightIcon, GiftIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

interface StalkerGiftChatListProps {
  onSelectChat?: (conversationId: string) => void
}

export function StalkerGiftChatList({ onSelectChat }: StalkerGiftChatListProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { conversations, isLoading, fetchConversations, unreadCount } = useChat()
  
  // Filtrar solo conversaciones de tipo STALKERGIFT
  const stalkerGiftConversations = conversations.filter(
    (conv) => conv.type === 'STALKERGIFT'
  )

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const getOtherParticipant = (conversation: Conversation) => {
    if (!user?.id) return null
    return conversation.participants.find((p) => p.userId !== user.id)
  }

  const getParticipantName = (conversation: Conversation) => {
    const otherParticipant = getOtherParticipant(conversation)
    if (!otherParticipant) return 'Usuario desconocido'

    // Si el alias está revelado o el participante está revelado, mostrar nombre real
    if (otherParticipant.isRevealed || conversation.type === 'FRIENDS') {
      const fullName = `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim()
      return fullName || otherParticipant.user.email.split('@')[0]
    }

    // Si no está revelado, usar alias o "Anónimo"
    return otherParticipant.alias || 'Anónimo'
  }

  const getParticipantAvatar = (conversation: Conversation) => {
    const otherParticipant = getOtherParticipant(conversation)
    if (!otherParticipant) return null

    // Si está revelado, mostrar avatar real
    if (otherParticipant.isRevealed || conversation.type === 'FRIENDS') {
      return otherParticipant.user.profile?.avatar
    }

    // Si no está revelado, no mostrar avatar o mostrar uno por defecto
    return null
  }

  const getLastMessage = (conversation: Conversation) => {
    if (conversation.messages && conversation.messages.length > 0) {
      const lastMsg = conversation.messages[0]
      return {
        content: lastMsg.content,
        createdAt: lastMsg.createdAt,
      }
    }
    return null
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  }

  const handleSelectConversation = (conversationId: string) => {
    if (onSelectChat) {
      onSelectChat(conversationId)
    } else {
      router.push(`/messages?conversation=${conversationId}`)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
        <p className="text-gray-400">Cargando chats...</p>
      </div>
    )
  }

  if (stalkerGiftConversations.length === 0) {
    return (
      <div className="text-center py-12">
        <GiftIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 mb-2">No tienes chats de StalkerGift</p>
        <p className="text-sm text-gray-500">
          Los chats aparecerán aquí cuando alguien acepte o rechace un regalo que hayas enviado
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {stalkerGiftConversations.map((conversation) => {
        const participant = getOtherParticipant(conversation)
        const participantName = getParticipantName(conversation)
        const participantAvatar = getParticipantAvatar(conversation)
        const lastMessage = getLastMessage(conversation)
        const isRevealed = participant?.isRevealed || false

        return (
          <button
            key={conversation.id}
            onClick={() => handleSelectConversation(conversation.id)}
            className="w-full text-left p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors border border-gray-700 hover:border-[#66DEDB]/50"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                {participantAvatar ? (
                  <Image
                    src={participantAvatar}
                    alt={participantName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#66DEDB]/20">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-[#66DEDB]" />
                  </div>
                )}
                {!isRevealed && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="text-xs text-white font-semibold">?</span>
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-white truncate">
                    {participantName}
                    {!isRevealed && (
                      <span className="ml-2 text-xs text-gray-400">(Anónimo)</span>
                    )}
                  </h3>
                  {lastMessage && (
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                
                {lastMessage ? (
                  <p className="text-sm text-gray-400 truncate">
                    {lastMessage.content}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Sin mensajes aún
                  </p>
                )}

                {/* Badge de tipo */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-[#66DEDB]/20 text-[#66DEDB] rounded">
                    StalkerGift
                  </span>
                  {!isRevealed && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                      Anónimo
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

