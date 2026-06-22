'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, ArrowUpTrayIcon, LinkIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useChat } from '@/lib/hooks/use-chat'
import { useSocket } from '@/lib/hooks/use-socket'
import { canUseNativeShare, copyTextToClipboard, shareViaNative } from '@/lib/utils/web-share'
import { UserAvatar } from '@/components/shared/user-avatar'
import { TankuDialogOverlay } from '@/components/ui/tanku-dialog-overlay'
import { tankuOrderModalInputClass } from '@/lib/ui/tanku-modal-surface'

const panelClass =
  'flex max-h-[min(34rem,88dvh)] w-full max-w-md flex-col overflow-hidden rounded-[24px] border border-[#414141] bg-[#171B21]'

const actionButtonClass =
  'rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

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

export type ShareWithFriendsModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  shareUrl: string
  getShareMessage: () => string
  zIndexClass?: string
}

export function ShareWithFriendsModal({
  isOpen,
  onClose,
  title,
  shareUrl,
  getShareMessage,
  zIndexClass = 'z-[1000003]',
}: ShareWithFriendsModalProps) {
  const [allFriends, setAllFriends] = useState<Friend[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const { createOrGetConversation, sendMessage: sendMessageChat } = useChat()
  const { sendMessage: sendSocketMessage, isConnected } = useSocket()

  useEffect(() => {
    if (!isOpen) {
      setSelectedFriends([])
      setSearchQuery('')
      setLinkCopied(false)
      return
    }
    void loadFriends()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !shareUrl) {
      setCanNativeShare(false)
      return
    }
    setCanNativeShare(canUseNativeShare({ title, url: shareUrl }))
  }, [isOpen, shareUrl, title])

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
    setSelectedFriends((prev) => {
      if (prev.includes(friendId)) return prev.filter((id) => id !== friendId)
      if (prev.length >= 5) return prev
      return [...prev, friendId]
    })
  }

  const handleShareLink = async () => {
    const result = await shareViaNative({
      title,
      text: getShareMessage(),
      url: shareUrl,
    })
    if (result === 'aborted' || result === 'shared') return

    const ok = await copyTextToClipboard(shareUrl)
    if (ok) {
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  const handleSend = async () => {
    if (selectedFriends.length === 0 || isSending) return

    setIsSending(true)
    try {
      const messageText = getShareMessage()

      for (const friendId of selectedFriends) {
        try {
          const conversation = await createOrGetConversation(friendId, 'FRIENDS')
          if (!conversation) continue

          if (isConnected && sendSocketMessage) {
            sendMessageChat(conversation.id, messageText, 'TEXT', sendSocketMessage)
          } else {
            await apiClient.post(API_ENDPOINTS.CHAT.SEND_MESSAGE(conversation.id), {
              content: messageText,
              type: 'TEXT',
            })
          }
        } catch (error) {
          console.error(`Error enviando a ${friendId}:`, error)
        }
      }

      onClose()
    } catch (error) {
      console.error('Error compartiendo:', error)
    } finally {
      setIsSending(false)
    }
  }

  const filteredFriends = searchQuery
    ? allFriends.filter((friend) => {
        const query = searchQuery.toLowerCase()
        const name = `${friend.friend.firstName || ''} ${friend.friend.lastName || ''}`.toLowerCase()
        const email = friend.friend.email.toLowerCase()
        return name.includes(query) || email.includes(query)
      })
    : friends

  return (
    <TankuDialogOverlay
      open={isOpen}
      onClose={onClose}
      dismissible={!isSending}
      zIndexClass={zIndexClass}
      panelClassName={panelClass}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-5">
          <h2 className="text-base font-bold text-[#66DEDB]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 space-y-3 border-b border-white/[0.08] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => void handleShareLink()}
            className={clsx(
              actionButtonClass,
              canNativeShare
                ? 'flex w-full items-center justify-center gap-2 bg-[#73FFA2] text-[#262626] hover:bg-[#66e891]'
                : 'flex w-full items-center justify-center gap-2 border border-white/15 bg-transparent text-gray-200 hover:bg-white/[0.06]',
            )}
          >
            {linkCopied ? (
              <>
                <CheckIcon className="h-4 w-4 text-[#73FFA2]" />
                Enlace copiado
              </>
            ) : canNativeShare ? (
              <>
                <ArrowUpTrayIcon className="h-4 w-4" />
                Compartir…
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4" />
                Copiar enlace
              </>
            )}
          </button>
          <input
            type="text"
            placeholder="Buscar amigos…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={clsx(tankuOrderModalInputClass, 'py-2')}
          />
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#73FFA2] border-t-transparent" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              {searchQuery ? 'No se encontraron amigos' : 'No tienes amigos aún'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {filteredFriends.map((friend) => {
                const friendUser = friend.friend
                const friendName =
                  friendUser.firstName && friendUser.lastName
                    ? `${friendUser.firstName} ${friendUser.lastName}`
                    : friendUser.email.split('@')[0]
                const isSelected = selectedFriends.includes(friendUser.id)
                const isDisabled = !isSelected && selectedFriends.length >= 5

                return (
                  <button
                    key={friendUser.id}
                    type="button"
                    onClick={() => toggleFriendSelection(friendUser.id)}
                    disabled={isDisabled}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-colors',
                      isSelected ? 'bg-white/[0.06] ring-1 ring-[#73FFA2]/60' : 'hover:bg-white/[0.04]',
                      isDisabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    <UserAvatar
                      user={{
                        avatar: friendUser.profile?.avatar || null,
                        firstName: friendUser.firstName,
                        lastName: friendUser.lastName,
                        email: friendUser.email,
                      }}
                      size={52}
                    />
                    <p
                      className={clsx(
                        'w-full truncate text-center text-[11px] text-gray-300',
                        isSelected && 'font-semibold text-white',
                      )}
                    >
                      {friendName}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-3 sm:px-5">
          <span className="text-xs text-gray-500">
            {selectedFriends.length}/5 seleccionados
          </span>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={selectedFriends.length === 0 || isSending}
            className={clsx(
              actionButtonClass,
              'flex min-w-[7rem] items-center justify-center gap-2 bg-[#73FFA2] text-[#262626] hover:bg-[#66e891]',
            )}
          >
            {isSending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#262626] border-t-transparent" />
                Enviando…
              </>
            ) : (
              'Enviar'
            )}
          </button>
        </div>
      </div>
    </TankuDialogOverlay>
  )
}
