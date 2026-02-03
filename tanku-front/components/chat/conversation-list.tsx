'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { useChat } from '@/lib/hooks/use-chat'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { Conversation } from '@/lib/hooks/use-chat'

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void
  selectedConversationId?: string | null
}

export function ConversationList({ onSelectConversation, selectedConversationId }: ConversationListProps) {
  const { conversations, isLoading, getOtherParticipant, unreadCount, getAllMessagesForConversation, getUnreadCountForConversation, lastReceivedMessage } = useChat()
  const { user } = useAuthStore()

  // ✅ Filtrar solo conversaciones tipo FRIENDS (excluir STALKERGIFT)
  // Los chats de StalkerGift deben mostrarse solo en /stalkergift, no en /messages
  const friendsConversations = conversations.filter(c => c.type === 'FRIENDS')

  // ✅ Memoizar datos de cada conversación para actualizar cuando llega mensaje nuevo
  // lastReceivedMessage fuerza re-render cuando cambia
  const conversationsData = useMemo(() => {
    return friendsConversations.map(conversation => {
      const allMessages = getAllMessagesForConversation(conversation.id)
      // ✅ Calcular correctamente, sin forzar a 0 solo por estar seleccionado
      // El indicador debe desaparecer solo cuando realmente se marca como leído
      const unreadCount = getUnreadCountForConversation(conversation.id, user?.id || '')
      return {
        conversation,
        lastMessage: allMessages[0]?.content || 'Sin mensajes',
        lastMessageTime: allMessages[0]?.createdAt || conversation.updatedAt,
        unreadCount,
      }
    })
  }, [friendsConversations, getAllMessagesForConversation, getUnreadCountForConversation, user?.id, lastReceivedMessage]) // ✅ lastReceivedMessage fuerza recálculo


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
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#66DEDB]"></div>
      </div>
    )
  }

  if (friendsConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p>No tienes conversaciones</p>
        <p className="text-sm mt-2">Inicia una conversación desde tus amigos</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      {conversationsData.map(({ conversation, lastMessage, lastMessageTime, unreadCount }) => {
        const otherParticipant = getOtherParticipant(conversation, user?.id || '')
        if (!otherParticipant) return null

        const displayName = otherParticipant.alias || 
          `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim() ||
          otherParticipant.user.email
        const avatar = otherParticipant.user.profile?.avatar
        const isSelected = selectedConversationId === conversation.id

        return (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`w-full p-4 border-b border-gray-700 hover:bg-gray-800/50 transition-colors ${
              isSelected ? 'bg-gray-800/70 border-l-4 border-l-[#66DEDB]' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar con badge de no leídos */}
              <div className="relative flex-shrink-0">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#66DEDB] bg-gray-700 flex items-center justify-center">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={displayName}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                      referrerPolicy="no-referrer"
                      unoptimized={avatar.startsWith('http')}
                    />
                  ) : (
                    <span className="text-lg text-gray-400 font-bold">
                      {(otherParticipant.user.firstName?.[0] || otherParticipant.user.email?.[0] || 'U').toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Badge azul Tanku de mensajes no leídos (sin número, solo indicador) */}
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#66DEDB] rounded-full border-2 border-gray-900"></div>
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-[#73FFA2] truncate">{displayName}</h3>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatTime(lastMessageTime)}
                  </span>
                </div>
                <p className={`text-xs truncate ${unreadCount > 0 ? 'text-white font-medium' : 'text-gray-400'}`}>
                  {lastMessage}
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

