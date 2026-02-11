'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { useChat } from '@/lib/hooks/use-chat'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ConversationList } from '@/components/chat/conversation-list'
import { ChatWindow } from '@/components/chat/chat-window'
import { BaseNav } from '@/components/layout/base-nav'

// Componente interno que usa useSearchParams
function MessagesClientContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const { 
    conversations, 
    activeConversation, 
    setActiveConversation,
    createOrGetConversation,
    isLoading 
  } = useChat()

  const userIdParam = searchParams.get('userId')

  // Si hay userId en la URL, crear/obtener conversación
  useEffect(() => {
    const handleUserIdParam = async () => {
      if (userIdParam && user?.id && userIdParam !== user.id) {
        try {
          const conversation = await createOrGetConversation(userIdParam, 'FRIENDS')
          if (conversation) {
            setActiveConversation(conversation.id)
            // Limpiar URL
            router.replace('/messages')
          }
        } catch (error) {
          console.error('Error creando conversación:', error)
        }
      }
    }

    handleUserIdParam()
  }, [userIdParam, user?.id, createOrGetConversation, setActiveConversation, router])

  
  const selectedConversation = conversations.find(c => c.id === activeConversation) || null

  return (
    <div
      className="min-h-screen custom-scrollbar overflow-y-auto"
      style={{ backgroundColor: '#1E1E1E', height: 'calc(100vh - 0px)' }}
    >
      {/* Nav con botones de carrito y notificaciones */}
      <BaseNav showStories={true} />

      <div className="max-w-7xl mx-auto pt-16 sm:pt-20 md:pt-24">
      <div className="mb-4 px-4 sm:px-6 md:px-8 flex items-end gap-3">
        <h1 className="text-3xl font-bold text-[#66DEDB]">
          Mensajes
        </h1>

        <p className="text-gray-400">
          Chatea con tus amigos
        </p>
      </div>
        <div className="flex h-[calc(100vh-10rem)] border-t border-gray-700">
          {/* Lista de conversaciones */}
          <div className="w-full md:w-80 border-r border-gray-700 bg-gray-900/50 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-[#73FFA2]">Conversaciones</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <ConversationList
                onSelectConversation={setActiveConversation}
                selectedConversationId={activeConversation}
              />
            </div>
          </div>

          {/* Ventana de chat */}
          <div className="flex-1 flex flex-col bg-gray-900/30">
            {activeConversation && selectedConversation ? (
              <ChatWindow
                conversationId={activeConversation}
                conversation={selectedConversation}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <p className="text-lg mb-2">Selecciona una conversación</p>
                  <p className="text-sm">O inicia una desde tus amigos</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente principal con Suspense boundary
export default function MessagesClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900">
        <BaseNav />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center text-gray-400">Cargando...</div>
        </div>
      </div>
    }>
      <MessagesClientContent />
    </Suspense>
  )
}

