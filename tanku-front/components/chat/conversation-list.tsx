'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { useChat } from '@/lib/hooks/use-chat'
import { useAuthStore } from '@/lib/stores/auth-store'

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void
  selectedConversationId?: string | null
  /** Filtro por nombre de usuario, alias, etc. (misma lógica que el modal de mensajes) */
  searchQuery?: string
}

const rowDividerStyle = {
  borderImage: 'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
} as const

export function ConversationList({
  onSelectConversation,
  selectedConversationId,
  searchQuery = '',
}: ConversationListProps) {
  const {
    conversations,
    isLoading,
    getOtherParticipant,
    getAllMessagesForConversation,
    getUnreadCountForConversation,
    lastReceivedMessage,
  } = useChat()
  const { user } = useAuthStore()

  const conversationsData = useMemo(() => {
    const friendsConversations = conversations.filter((c) => c.type === 'FRIENDS')
    return friendsConversations
      .map((conversation) => {
        const allMessages = getAllMessagesForConversation(conversation.id)
        const unreadCount = getUnreadCountForConversation(conversation.id, user?.id || '')
        return {
          conversation,
          lastMessage: allMessages[0]?.content || 'Sin mensajes',
          lastMessageTime: allMessages[0]?.createdAt || conversation.updatedAt,
          unreadCount,
        }
      })
      .filter(({ conversation }) => {
        const otherParticipant = getOtherParticipant(conversation, user?.id || '')
        if (!otherParticipant) return false
        if (!otherParticipant.user && !otherParticipant.deletedUserEmail) return false

        const username = otherParticipant.user?.username?.toLowerCase() || ''
        const firstName = otherParticipant.user?.firstName?.toLowerCase() || ''
        const lastName = otherParticipant.user?.lastName?.toLowerCase() || ''
        const alias = otherParticipant.alias?.toLowerCase() || ''
        const deletedEmail = otherParticipant.deletedUserEmail?.toLowerCase() || ''
        const q = searchQuery.trim().toLowerCase()
        if (!q) return true
        return (
          username.includes(q) ||
          firstName.includes(q) ||
          lastName.includes(q) ||
          alias.includes(q) ||
          deletedEmail.includes(q)
        )
      })
  }, [
    conversations,
    getAllMessagesForConversation,
    getUnreadCountForConversation,
    getOtherParticipant,
    user?.id,
    lastReceivedMessage,
    searchQuery,
  ])

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
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#66DEDB]" />
      </div>
    )
  }

  if (!conversations.some((c) => c.type === 'FRIENDS')) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center text-gray-400">
        <p className="text-sm">No tienes conversaciones</p>
        <p className="mt-2 text-xs">Inicia una conversación desde tus amigos</p>
      </div>
    )
  }

  if (conversationsData.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center text-gray-400">
        <p className="text-sm">Ninguna conversación coincide</p>
        <p className="mt-1 text-xs">Prueba con otro nombre o alias</p>
      </div>
    )
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto">
      {conversationsData.map(({ conversation, lastMessage, lastMessageTime, unreadCount }) => {
        const otherParticipant = getOtherParticipant(conversation, user?.id || '')
        if (!otherParticipant) return null
        if (!otherParticipant.user && !otherParticipant.deletedUserEmail) return null

        const displayName =
          otherParticipant.user?.username ||
          otherParticipant.alias ||
          (otherParticipant.user
            ? `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim()
            : otherParticipant.deletedUserEmail || 'Usuario eliminado') ||
          otherParticipant.user?.email ||
          'Usuario desconocido'

        const avatar = otherParticipant.user?.profile?.avatar
        const isSelected = selectedConversationId === conversation.id

        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelectConversation(conversation.id)}
            className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-white/[0.03] ${
              isSelected ? 'bg-white/[0.06]' : ''
            }`}
            style={rowDividerStyle}
          >
            <div className="relative flex-shrink-0">
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#66DEDB] bg-gray-700">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    unoptimized={avatar.startsWith('http')}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                    onLoad={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'block'
                    }}
                  />
                ) : (
                  <span className="text-sm font-semibold text-gray-400">
                    {(
                      otherParticipant.user?.firstName?.[0] ||
                      otherParticipant.user?.email?.[0] ||
                      otherParticipant.deletedUserEmail?.[0] ||
                      'U'
                    ).toUpperCase()}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#171B21] bg-[#66DEDB]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <span className="ml-2 flex-shrink-0 text-sm text-gray-300">
                  {formatTime(lastMessageTime)}
                </span>
              </div>
              <p
                className={`truncate text-xs ${unreadCount > 0 ? 'font-medium text-white' : 'text-gray-400'}`}
              >
                {lastMessage}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
