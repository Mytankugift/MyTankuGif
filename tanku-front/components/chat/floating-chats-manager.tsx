'use client'

import { useState, useCallback, useEffect } from 'react'
import { FloatingChatWindow } from './floating-chat-window'
import { useChat } from '@/lib/hooks/use-chat'
import type { Conversation } from '@/lib/hooks/use-chat'

interface OpenChat {
  conversationId: string
  position: { x: number; y: number }
}

export function FloatingChatsManager() {
  const { conversations } = useChat()
  const [openChats, setOpenChats] = useState<OpenChat[]>([])

  const openChat = useCallback((conversationId: string) => {
    setOpenChats(prev => {
      // Si ya está abierto, no duplicar
      if (prev.find(chat => chat.conversationId === conversationId)) {
        return prev
      }
      
      // Calcular posición (escalonada)
      const offset = prev.length * 20
      const x = window.innerWidth - 380 - offset
      const y = 100 + offset
      
      return [...prev, { conversationId, position: { x, y } }]
    })
  }, [])

  const closeChat = useCallback((conversationId: string) => {
    setOpenChats(prev => prev.filter(chat => chat.conversationId !== conversationId))
  }, [])

  // Exponer función globalmente para que MessagesDropdown pueda usarla
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).openFloatingChat = openChat
      return () => {
        delete (window as any).openFloatingChat
      }
    }
  }, [openChat])

  return (
    <>
      {openChats.map(({ conversationId, position }) => {
        const conversation = conversations.find(c => c.id === conversationId)
        if (!conversation) return null

        return (
          <FloatingChatWindow
            key={conversationId}
            conversationId={conversationId}
            conversation={conversation}
            onClose={() => closeChat(conversationId)}
            position={position}
          />
        )
      })}
    </>
  )
}

