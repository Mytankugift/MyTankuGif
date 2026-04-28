'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { clsx } from 'clsx'
import { useRouter, useSearchParams } from 'next/navigation'
import { useIsMaxWidth, useIsMinWidth } from '@/lib/hooks/use-is-max-width'
import { useChat } from '@/lib/hooks/use-chat'
import { ChatWindow } from '@/components/chat/chat-window'
import { StalkerGiftChatList } from '@/components/stalkergift/stalkergift-chat-list'

const rowDividerStyle = {
  borderImage:
    'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
} as const

/** Layout de chats igual que /messages: lista + ChatWindow en card; móvil portal pantalla completa. */
export function StalkerGiftChatsPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('conversation')

  const { conversations, setActiveConversation, fetchConversations } = useChat()
  const selectedConversation =
    conversations.find((c) => c.type === 'STALKERGIFT' && c.id === conversationId) || null

  const showMobileChatOverlay = Boolean(conversationId && selectedConversation)
  const isMobileViewport = useIsMaxWidth(767)
  const isLgUp = useIsMinWidth(1024)

  const [chatPortalMounted, setChatPortalMounted] = useState(false)
  useEffect(() => setChatPortalMounted(true), [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (conversationId) setActiveConversation(conversationId)
  }, [conversationId, setActiveConversation])

  const openConversation = (id: string) => {
    setActiveConversation(id)
    const q = new URLSearchParams(searchParams.toString())
    q.set('tab', 'chats')
    q.set('conversation', id)
    router.replace(`/stalkergift?${q.toString()}`, { scroll: false })
  }

  const closeConversation = () => {
    setActiveConversation(null)
    const q = new URLSearchParams(searchParams.toString())
    q.delete('conversation')
    router.replace(`/stalkergift?${q.toString()}`, { scroll: false })
  }

  return (
    <>
      <div
        className={clsx(
          'custom-scrollbar relative z-0 flex h-full min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]',
          'pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:pb-8',
          showMobileChatOverlay && isMobileViewport && 'max-md:hidden',
        )}
      >
        <div
          className={clsx(
            'flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#414141] shadow-xl',
            'lg:flex-row lg:min-h-[calc(100vh-13rem)] xl:min-h-[calc(100vh-14rem)]',
          )}
          style={{ backgroundColor: '#171B21' }}
        >
          <div
            className={clsx(
              'flex min-h-0 flex-col border-b border-[#414141]',
              'lg:h-auto lg:min-h-0 lg:w-80 lg:flex-shrink-0 lg:border-b-0 lg:border-r lg:border-[#414141]',
              conversationId ? 'hidden lg:flex' : 'flex flex-1',
            )}
          >
            <div className="shrink-0 border-b p-4" style={rowDividerStyle}>
              <div className="mb-3 flex items-center gap-2">
                <Image
                  src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 object-contain"
                  unoptimized
                />
                <h2 className="text-base font-semibold leading-none text-white">Chats StalkerGift</h2>
              </div>
              <p className="mb-3 text-xs text-[#A7A7A7]">Anónimos hasta que se revele.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2 sm:px-4 md:px-4">
              <StalkerGiftChatList onSelectChat={openConversation} />
            </div>
          </div>

          <div
            className={clsx(
              'min-h-0 flex-1 flex-col overflow-hidden',
              conversationId && selectedConversation ? 'hidden md:flex' : 'hidden lg:flex',
            )}
          >
            {conversationId && selectedConversation ? (
              <ChatWindow
                conversationId={conversationId}
                conversation={selectedConversation}
                anonymousMode
                onMobileBack={isLgUp ? undefined : closeConversation}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center text-gray-400">
                <Image
                  src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
                  alt=""
                  width={40}
                  height={40}
                  className="mb-3 h-10 w-10 object-contain opacity-80"
                  unoptimized
                />
                <p className="mb-2 text-lg text-white/90">Selecciona una conversación</p>
                <p className="text-sm text-[#A7A7A7]">O envía un regalo desde Enviar Tanku</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {chatPortalMounted &&
      showMobileChatOverlay &&
      selectedConversation &&
      conversationId &&
      isMobileViewport &&
      typeof document !== 'undefined'
        ? createPortal(
            <div
              className={clsx(
                'fixed inset-x-0 bottom-0 top-0 z-[160] flex min-h-0 flex-col overflow-hidden bg-[#171B21]',
                'pt-[env(safe-area-inset-top,0px)] pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
              )}
              role="dialog"
              aria-modal="true"
              aria-label="Chat StalkerGift"
            >
              <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                <ChatWindow
                  conversationId={conversationId}
                  conversation={selectedConversation}
                  anonymousMode
                  onMobileBack={closeConversation}
                  mobileFullBleedChrome
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
