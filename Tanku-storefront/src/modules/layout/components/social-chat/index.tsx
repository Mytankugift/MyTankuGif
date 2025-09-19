"use client"

import { useState, useEffect, useRef } from "react"
// Usando iconos SVG personalizados en lugar de lucide-react
const MessageCircle = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
)

const X = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
)

const Minus = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/>
  </svg>
)

const Send = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
  </svg>
)

const Users = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
import { getFriendRequests } from "@modules/social/actions/get-friend-requests"
import { getChatConversation, ChatMessage } from "@modules/chat/actions/get-chat-conversation"
import { sendChatMessage } from "@modules/chat/actions/send-chat-message"
import { getUserStatus } from "@modules/chat/actions/get-user-status"
import socketManager from "@lib/socket"


interface Friend {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_url?: string
  // Campos adicionales para el chat con valores por defecto
  isOnline?: boolean
  lastSeen?: string
}

interface ChatWindow {
  friendId: string
  friendName: string
  isMinimized: boolean
  conversationId?: string
  messages: Array<{
    id: string
    senderId: string
    content: string
    timestamp: string
  }>
  isTyping?: boolean
}

const SocialChat = ({ customerId }: { customerId: string }) => {
  const [isMainPanelOpen, setIsMainPanelOpen] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [chatWindows, setChatWindows] = useState<ChatWindow[]>([])
  const [loading, setLoading] = useState(false)
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<{ [conversationId: string]: string[] }>({})
  const messagesEndRef = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Función para hacer scroll al final de los mensajes
  const scrollToBottom = (friendId: string) => {
    const messagesEnd = messagesEndRef.current[friendId]
    if (messagesEnd) {
      messagesEnd.scrollIntoView({ behavior: "smooth" })
    }
  }

  // Efecto para hacer scroll cuando cambian los mensajes
  useEffect(() => {
    chatWindows.forEach(chat => {
      if (chat.messages.length > 0) {
        setTimeout(() => scrollToBottom(chat.friendId), 100)
      }
    })
  }, [chatWindows])

  useEffect(() => {
    const loadFriends = async () => {
      if (!customerId) return
      
      setLoading(true)
      try {
        const friendRequests = await getFriendRequests(customerId)
        
        // Combinamos amigos de solicitudes enviadas y recibidas que estén aceptadas
        const allFriends: Friend[] = []
        
        // Procesar amigos de la respuesta
        if (friendRequests.sent && Array.isArray(friendRequests.sent)) {
          friendRequests.sent.forEach((request: any) => {
            allFriends.push({
              id: request.sender_id || request.id,
              first_name: request.first_name || "Usuario",
              last_name: request.last_name || "",
              email: request.email || "",
              avatar_url: request.avatar_url,
              isOnline: Math.random() > 0.5, // Valor por defecto aleatorio
              lastSeen: Math.random() > 0.5 ? "Ahora" : `Hace ${Math.floor(Math.random() * 24)} horas`
            })
          })
        }

        setFriends(allFriends)
        console.log("Amigos cargados:", allFriends)

        // Cargar estado inicial de conexión de amigos
        if (allFriends.length > 0) {
          try {
            const userIds = allFriends.map(friend => friend.id)
            const statusResponse = await getUserStatus(userIds)
            
            if (statusResponse.success) {
              setFriends(prev => 
                prev.map(friend => {
                  const status = statusResponse.data.find(s => s.user_id === friend.id)
                  return {
                    ...friend,
                    isOnline: status?.is_online || false,
                    lastSeen: status?.last_seen || "Hace tiempo"
                  }
                })
              )
            }
          } catch (statusError) {
            console.warn("Error al cargar estado de usuarios:", statusError)
          }
        }
      } catch (error) {
        console.error("Error al cargar amigos:", error)
        setFriends([])
      } finally {
        setLoading(false)
      }
    }

    loadFriends()
  }, [customerId])

  // Efecto para inicializar Socket.IO
  useEffect(() => {
    if (!customerId) return

    // Conectar y autenticar
    socketManager.authenticate(customerId)
    
    // Configurar listeners
    const unsubscribeConnection = socketManager.onConnection((connected) => {
      setIsSocketConnected(connected)
      console.log('[SOCKET] Connection status:', connected)
    })

    const unsubscribeMessage = socketManager.onMessage((message) => {
      console.log('[SOCKET] New message received:', message)
      
      // Agregar mensaje a la ventana de chat correspondiente
      setChatWindows(prev => 
        prev.map(chat => {
          if (chat.conversationId === message.conversation_id) {
            const newMessage = {
              id: message.id,
              senderId: message.sender_id,
              content: message.content,
              timestamp: message.created_at
            }
            
            // Evitar duplicados
            const messageExists = chat.messages.some(msg => msg.id === message.id)
            if (!messageExists) {
              return {
                ...chat,
                messages: [...chat.messages, newMessage]
              }
            }
          }
          return chat
        })
      )
    })

    const unsubscribeUserStatus = socketManager.onUserStatus((status) => {
      console.log('[SOCKET] User status changed:', status)
      
      // Actualizar estado de conexión de amigos
      setFriends(prev => 
        prev.map(friend => 
          friend.id === status.user_id 
            ? { 
                ...friend, 
                isOnline: status.is_online,
                lastSeen: status.last_seen || friend.lastSeen
              }
            : friend
        )
      )
    })

    const unsubscribeTyping = socketManager.onTyping((data) => {
      console.log('[SOCKET] Typing indicator:', data)
      
      setTypingUsers(prev => {
        const conversationTyping = prev[data.conversation_id] || []
        
        if (data.is_typing) {
          // Agregar usuario a la lista de typing si no está
          if (!conversationTyping.includes(data.user_id)) {
            return {
              ...prev,
              [data.conversation_id]: [...conversationTyping, data.user_id]
            }
          }
        } else {
          // Remover usuario de la lista de typing
          return {
            ...prev,
            [data.conversation_id]: conversationTyping.filter(id => id !== data.user_id)
          }
        }
        
        return prev
      })
    })

    // Cleanup
    return () => {
      unsubscribeConnection()
      unsubscribeMessage()
      unsubscribeUserStatus()
      unsubscribeTyping()
    }
  }, [customerId])

  const openChat = async (friend: Friend) => {
    const existingChat = chatWindows.find(chat => chat.friendId === friend.id)
    
    if (existingChat) {
      // Si ya existe, lo desminiminizamos
      setChatWindows(prev => 
        prev.map(chat => 
          chat.friendId === friend.id 
            ? { ...chat, isMinimized: false }
            : chat
        )
      )
    } else {
      // Crear nueva ventana de chat y cargar mensajes reales
      const friendName = `${friend.first_name} ${friend.last_name}`.trim()
      
      try {
        // Obtener o crear conversación y cargar mensajes
        const conversationData = await getChatConversation(customerId, friend.id)
        
        const realMessages = conversationData.messages?.map((msg: ChatMessage) => ({
          id: msg.id,
          senderId: msg.sender_id,
          content: msg.content,
          timestamp: msg.created_at
        })) || []
        
        const newChat: ChatWindow = {
          friendId: friend.id,
          friendName: friendName,
          isMinimized: false,
          messages: realMessages,
          conversationId: conversationData.conversation?.id,
          isTyping: false
        }
        
        setChatWindows(prev => [...prev, newChat])
      } catch (error) {
        console.error("Error al cargar conversación:", error)
        // Fallback: crear chat vacío
        const newChat: ChatWindow = {
          friendId: friend.id,
          friendName: friendName,
          isMinimized: false,
          messages: [],
          isTyping: false
        }
        setChatWindows(prev => [...prev, newChat])
      }
    }
    
    // Cerrar panel principal
    setIsMainPanelOpen(false)
  }

  const closeChat = (friendId: string) => {
    const chat = chatWindows.find(c => c.friendId === friendId)
    
    setChatWindows(prev => prev.filter(chat => chat.friendId !== friendId))
  }

  const minimizeChat = (friendId: string) => {
    setChatWindows(prev => 
      prev.map(chat => 
        chat.friendId === friendId 
          ? { ...chat, isMinimized: true }
          : chat
      )
    )
  }

  const maximizeChat = (friendId: string) => {
    setChatWindows(prev => 
      prev.map(chat => 
        chat.friendId === friendId 
          ? { ...chat, isMinimized: false }
          : chat
      )
    )
  }

  const sendMessage = async (friendId: string, content: string) => {
    const chat = chatWindows.find(c => c.friendId === friendId)
    if (!chat) return

    // Crear mensaje temporal para mostrar inmediatamente
    const tempMessage = {
      id: `temp-${Date.now()}`,
      senderId: customerId,
      content,
      timestamp: new Date().toISOString()
    }

    // Actualizar UI inmediatamente
    setChatWindows(prev => 
      prev.map(c => 
        c.friendId === friendId 
          ? { ...c, messages: [...c.messages, tempMessage] }
          : c
      )
    )

    try {
      // Si no hay conversationId, primero obtenemos/creamos la conversación
      let conversationId = chat.conversationId
      
      if (!conversationId) {
        const conversationData = await getChatConversation(customerId, friendId)
        conversationId = conversationData.conversation?.id
        
        // Actualizar el chat con el conversationId
        setChatWindows(prev => 
          prev.map(c => 
            c.friendId === friendId 
              ? { ...c, conversationId }
              : c
          )
        )
      }

      if (!conversationId) {
        throw new Error("No se pudo obtener o crear la conversación")
      }

      // Enviar mensaje al backend
      const result = await sendChatMessage({
        conversation_id: conversationId,
        sender_id: customerId,
        content
      })

      if (result.success && result.message) {
        // Reemplazar mensaje temporal con el real
        const realMessage = {
          id: result.message.id,
          senderId: result.message.sender_id,
          content: result.message.content,
          timestamp: result.message.created_at
        }

        setChatWindows(prev => 
          prev.map(c => 
            c.friendId === friendId 
              ? { 
                  ...c, 
                  messages: c.messages.map(msg => 
                    msg.id === tempMessage.id ? realMessage : msg
                  ),
                  conversationId: result.message.conversation_id
                }
              : c
          )
        )

        // Unirse a la conversación en Socket.IO si no estaba ya
        if (conversationId) {
          socketManager.joinConversation(conversationId)
        }
      }
    } catch (error) {
      console.error("Error al enviar mensaje:", error)
      // Marcar mensaje como fallido o eliminarlo
      setChatWindows(prev => 
        prev.map(c => 
          c.friendId === friendId 
            ? { 
                ...c, 
                messages: c.messages.filter(msg => msg.id !== tempMessage.id)
              }
            : c
        )
      )
      // Mostrar error al usuario
      alert("Error al enviar mensaje. Por favor intenta de nuevo.")
    }
  }

  return (
    <>
      {/* Botón flotante principal */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMainPanelOpen(!isMainPanelOpen)}
          className="bg-[#73FFA2] hover:bg-[#5ee889] text-gray-800 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        >
          <MessageCircle size={24} />
        </button>
      </div>

      {/* Panel principal de amigos */}
      {isMainPanelOpen && (
        <div className="fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-xl border z-50 animate-slide-up">
          <div className="bg-[#73FFA2] p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-gray-800" />
              <h3 className="font-semibold text-gray-800">Amigos</h3>
            </div>
            <button
              onClick={() => setIsMainPanelOpen(false)}
              className="text-gray-800 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => openChat(friend)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={friend.avatar_url || "./feed/avatar.png"}
                      alt={`${friend.first_name} ${friend.last_name}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                        friend.isOnline ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{`${friend.first_name} ${friend.last_name}`.trim()}</p>
                    <p className="text-sm text-gray-500">
                      {friend.isOnline ? "En línea" : `Última vez: ${friend.lastSeen}`}
                    </p>
                  </div>
                  <button className="bg-[#73FFA2] hover:bg-[#5ee889] text-gray-800 px-3 py-1 rounded-full text-sm transition-colors">
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ventanas de chat */}
      <div className="fixed bottom-4 right-20 flex gap-2 z-40">
        {chatWindows.map((chat, index) => (
          <ChatWindow
            key={chat.friendId}
            chat={chat}
            onClose={() => closeChat(chat.friendId)}
            onMinimize={() => minimizeChat(chat.friendId)}
            onMaximize={() => maximizeChat(chat.friendId)}
            onSendMessage={(content) => sendMessage(chat.friendId, content)}
            customerId={customerId}
            style={{ zIndex: 40 - index }}
            messagesEndRef={messagesEndRef}
            typingUsers={typingUsers}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

interface ChatWindowProps {
  chat: ChatWindow
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onSendMessage: (content: string) => void
  customerId: string
  style?: React.CSSProperties
  messagesEndRef: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>
  typingUsers: { [conversationId: string]: string[] }
}

const ChatWindow = ({ 
  chat, 
  onClose, 
  onMinimize, 
  onMaximize, 
  onSendMessage, 
  customerId,
  style,
  messagesEndRef,
  typingUsers
}: ChatWindowProps) => {
  const [messageInput, setMessageInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      onSendMessage(messageInput.trim())
      setMessageInput("")
      
      if (isTyping && chat.conversationId) {
        setIsTyping(false)
        socketManager.stopTyping(chat.conversationId)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessageInput(value)
    
    if (chat.conversationId) {
      if (value.trim() && !isTyping) {
        setIsTyping(true)
        socketManager.startTyping(chat.conversationId)
      } else if (!value.trim() && isTyping) {
        setIsTyping(false)
        socketManager.stopTyping(chat.conversationId)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (chat.isMinimized) {
    return (
      <div style={style}>
        <button
          onClick={onMaximize}
          className="bg-[#73FFA2] hover:bg-[#5ee889] text-gray-800 px-4 py-2 rounded-t-lg shadow-lg transition-colors flex items-center gap-2 min-w-[200px] justify-between"
        >
          <span className="font-medium truncate">{chat.friendName}</span>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              <X size={16} />
            </button>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white rounded-lg shadow-xl border animate-slide-up" style={style}>
      {/* Header del chat */}
      <div className="bg-[#73FFA2] p-3 rounded-t-lg flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 truncate">{chat.friendName}</h4>
        <div className="flex gap-1">
          <button
            onClick={onMinimize}
            className="text-gray-800 hover:text-gray-600 p-1"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={onClose}
            className="text-gray-800 hover:text-gray-600 p-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="h-80 overflow-y-auto p-3 bg-gray-50">
        {chat.messages.map((message, index) => (
          <div
            key={`${message.id}-${index}`}
            className={`mb-3 flex ${
              message.senderId === customerId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] p-2 rounded-lg ${
                message.senderId === customerId
                  ? "bg-[#73FFA2] text-gray-800"
                  : "bg-white border text-gray-900"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Indicador de "escribiendo..." */}
        {chat.conversationId && typingUsers[chat.conversationId] && typingUsers[chat.conversationId].length > 0 && (
          <div className="mb-3 flex justify-start">
            <div className="bg-white border p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <p className="text-xs text-gray-500">escribiendo...</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Indicador de typing */}
        {chat.isTyping && (
          <div className="mb-3 flex justify-start">
            <div className="bg-white border text-gray-900 p-2 rounded-lg">
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">{chat.friendName} está escribiendo...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Elemento invisible para hacer scroll al final */}
        <div 
          ref={(el) => {
            if (el) {
              messagesEndRef.current[chat.friendId] = el
            }
          }}
          style={{ height: '1px' }}
        />
      </div>

      {/* Input de mensaje */}
      <div className="p-3 border-t bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#73FFA2] focus:border-transparent"
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className="bg-[#73FFA2] hover:bg-[#5ee889] disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-800 p-2 rounded-lg transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default SocialChat
