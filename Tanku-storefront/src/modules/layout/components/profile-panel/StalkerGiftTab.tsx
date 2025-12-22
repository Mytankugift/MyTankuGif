"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Heart, 
  ShoppingBag,
  XMark,
  Plus,
  Minus,
  ChatBubbleLeftRight,
  Gift
} from "@medusajs/icons"
import Image from "next/image"
import { getCustomerStalkerGifts, CustomerStalkerGift } from "./actions/get-customer-stalker-gifts"
import { getStalkerConversation, StalkerConversationData } from "@modules/stalker-gift/actions/get-stalker-conversation"
import { getStalkerMessages, StalkerMessage } from "@modules/stalker-gift/actions/get-stalker-messages"
import { sendStalkerMessage } from "@modules/stalker-gift/actions/send-stalker-message"
import { updateStalkerTyping } from "@modules/stalker-gift/actions/stalker-typing"
import socketManager from "@lib/socket"

interface StalkerGiftTabProps {
  customerId: string
}

const StalkerGiftTab: React.FC<StalkerGiftTabProps> = ({ customerId }) => {
  const [stalkerGifts, setStalkerGifts] = useState<CustomerStalkerGift[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGift, setSelectedGift] = useState<CustomerStalkerGift | null>(null)
  const [showGiftDetails, setShowGiftDetails] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [selectedGiftForChat, setSelectedGiftForChat] = useState<CustomerStalkerGift | null>(null)
  
  // 🎯 Estados del chat
  const [showChat, setShowChat] = useState(false)
  const [chatConversation, setChatConversation] = useState<StalkerConversationData | null>(null)
  const [chatMessages, setChatMessages] = useState<StalkerMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  
  // Referencias
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Verificar si hay algún regalo recibido para ocultar la columna de total
  const hasReceivedGifts = stalkerGifts.some(gift => !gift.isGiver)

  const loadStalkerGifts = useCallback(async () => {
    try {
      setLoading(true)
      const customerGifts = await getCustomerStalkerGifts(customerId)
      setStalkerGifts(customerGifts || [])
    } catch (error) {
      console.error('Error al cargar StalkerGifts:', error)
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadStalkerGifts()
  }, [loadStalkerGifts])

  // 🎯 Socket.IO listeners para tiempo real
  useEffect(() => {
    if (!showChat || !chatConversation) return

    // Configurar listeners de Socket.IO
    const unsubscribeMessage = socketManager.onStalkerMessage((socketMessage) => {
      // Verificar que chatConversation aún existe
      if (!chatConversation?.conversation?.id) return
      
      if (socketMessage.conversation_id === chatConversation.conversation.id) {
        // Convertir el mensaje de Socket.IO al formato local
        const message: StalkerMessage = {
          ...socketMessage,
          status: "delivered",
          status_at: new Date().toISOString()
        }
        
        setChatMessages(prev => {
          // Evitar duplicados
          if (prev.some(m => m.id === message.id)) return prev
          return [...prev, message]
        })
        scrollToBottom()
      }
    })

    const unsubscribeTyping = socketManager.onStalkerTyping((data) => {
      // Verificar que chatConversation aún existe
      if (!chatConversation?.conversation?.id) return
      
      if (data.conversation_id === chatConversation.conversation.id && data.user_id !== customerId) {
        setOtherUserTyping(data.is_typing)
        
        // Auto-hide typing indicator after 5 seconds
        if (data.is_typing) {
          setTimeout(() => setOtherUserTyping(false), 5000)
        }
      }
    })

    const unsubscribeChatEnabled = socketManager.onStalkerChatEnabled((data) => {
      // Verificar que chatConversation aún existe
      if (!chatConversation?.stalker_gift?.id) return
      
      if (data.stalker_gift_id === chatConversation.stalker_gift.id) {
        // Mostrar notificación de que el chat está habilitado
      }
    })

    // Cleanup
    return () => {
      unsubscribeMessage()
      unsubscribeTyping()
      unsubscribeChatEnabled()
    }
  }, [showChat, chatConversation, customerId])

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (chatConversation?.conversation?.id) {
        socketManager.leaveStalkerConversation(chatConversation.conversation.id)
      }
    }
  }, [chatConversation])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />
      case 'recibida':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30'
      case 'recibida':
        return 'bg-green-900/20 text-green-400 border-green-400/30'
      case 'failed':
        return 'bg-red-900/20 text-red-400 border-red-400/30'
      default:
        return 'bg-gray-900/20 text-gray-400 border-gray-400/30'
    }
  }

  const getTypeIcon = (isGiver: boolean) => {
    return isGiver ? (
      <ShoppingBag className="w-4 h-4 text-blue-400" />
    ) : (
      <Heart className="w-4 h-4 text-pink-400" />
    )
  }

  const getTypeColor = (isGiver: boolean) => {
    return isGiver 
      ? 'bg-blue-900/20 text-blue-400 border-blue-400/30'
      : 'bg-pink-900/20 text-pink-400 border-pink-400/30'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount)
  }

  const handleViewGift = (gift: CustomerStalkerGift) => {
    setSelectedGift(gift)
    setShowGiftDetails(true)
  }

  const closeGiftDetails = () => {
    setSelectedGift(null)
    setShowGiftDetails(false)
  }

  // 🎯 Funciones del chat
  const handleStartChat = async (gift: CustomerStalkerGift) => {
    if (gift.payment_status !== "recibida") {
      alert("El chat solo está disponible para regalos aceptados")
      return
    }

    setSelectedGiftForChat(gift)
    setIsLoadingChat(true)
    setChatError(null)

    try {
      // Obtener o crear conversación
      const conversationResult = await getStalkerConversation(gift.id, customerId)
      
      if (conversationResult.success && conversationResult.data) {
        setChatConversation(conversationResult.data)
        
        // Cargar mensajes
        const messagesResult = await getStalkerMessages(
          conversationResult.data.conversation.id,
          customerId
        )
        
        if (messagesResult.success && messagesResult.data) {
          setChatMessages(messagesResult.data.messages)
        }
        
        // Configurar Socket.IO
        socketManager.connect()
        socketManager.authenticate(customerId)
        socketManager.joinStalkerConversation(conversationResult.data.conversation.id)
        
        setShowChat(true)
        scrollToBottom()
      } else {
        setChatError(conversationResult.error || "No se pudo cargar la conversación")
        setShowChatModal(true)
      }
    } catch (error) {
      setChatError("Error al cargar el chat")
      setShowChatModal(true)
      console.error("Error loading chat:", error)
    } finally {
      setIsLoadingChat(false)
    }
  }

  const closeChatModal = () => {
    setSelectedGiftForChat(null)
    setShowChatModal(false)
    setChatError(null)
  }

  const closeChat = () => {
    // Guardar referencia antes de limpiar el estado
    const currentConversation = chatConversation
    
    setShowChat(false)
    setChatConversation(null)
    setChatMessages([])
    setNewMessage("")
    setChatError(null)
    setOtherUserTyping(false)
    
    if (currentConversation?.conversation?.id) {
      socketManager.leaveStalkerConversation(currentConversation.conversation.id)
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatConversation?.conversation?.id || isLoadingChat) return

    const messageContent = newMessage.trim()
    setNewMessage("")

    // Mensaje optimista
    const optimisticMessage: StalkerMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: chatConversation.conversation.id,
      sender_id: customerId,
      content: messageContent,
      message_type: "text",
      created_at: new Date().toISOString(),
      is_edited: false,
      is_deleted: false,
      status: "sending",
      status_at: new Date().toISOString()
    }

    setChatMessages(prev => [...prev, optimisticMessage])
    scrollToBottom()

    try {
      const result = await sendStalkerMessage({
        conversation_id: chatConversation.conversation.id,
        sender_id: customerId,
        content: messageContent,
        message_type: "text"
      })

      if (result.success && result.data) {
        // Reemplazar mensaje optimista con el real
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id ? result.data!.message : msg
          )
        )
      } else {
        // Remover mensaje optimista en caso de error
        setChatMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
        setChatError("No se pudo enviar el mensaje")
      }
    } catch (error) {
      setChatMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setChatError("Error al enviar mensaje")
      console.error("Error sending message:", error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
        <span className="ml-2 text-white">Cargando StalkerGifts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Gift className="w-6 h-6 text-[#73FFA2]" />
        <h3 className="text-xl font-bold text-[#73FFA2]">STALKER GIFTS</h3>
      </div>

      {/* StalkerGifts Table */}
      {stalkerGifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Gift className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-white text-lg font-medium mb-2">No hay StalkerGifts</h4>
          <p className="text-gray-400 text-sm">Cuando envíes o recibas regalos sorpresa, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-700">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Regalo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Estado
                  </th>
                  {!hasReceivedGifts && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                      Total
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Destinatario/Remitente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {stalkerGifts.map((gift) => (
                  <tr key={gift.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        #{gift.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-400">
                        {gift.products.length} producto(s)
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(gift.isGiver)}`}>
                        {getTypeIcon(gift.isGiver)}
                        {gift.isGiver ? 'Enviado' : 'Recibido'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(gift.created_at)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(gift.payment_status)}`}>
                        {getStatusIcon(gift.payment_status)}
                        {gift.payment_status === 'pending' ? 'Pendiente' : 
                         gift.payment_status === 'recibida' ? 'Recibida' : 'Fallida'}
                      </span>
                    </td>
                    {!hasReceivedGifts && (
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {formatCurrency(gift.total_amount)}
                      </td>
                    )}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {gift.isGiver ? (
                        <div>
                          <div className="font-medium">{gift.recipient_name}</div>
                          <div className="text-xs text-gray-500">Para: {gift.alias}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">De: {gift.alias}</div>
                          <div className="text-xs text-gray-500">Regalo anónimo</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleViewGift(gift)}
                          className="text-[#73FFA2] hover:text-[#66DEDB] transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Ver detalles
                        </button>
                        <button
                          onClick={() => handleStartChat(gift)}
                          className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                          <ChatBubbleLeftRight className="w-4 h-4" />
                          Chat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-4">
            {stalkerGifts.map((gift) => (
              <div key={gift.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-medium text-white">
                      #{gift.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(gift.created_at)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(gift.isGiver)}`}>
                      {getTypeIcon(gift.isGiver)}
                      {gift.isGiver ? 'Enviado' : 'Recibido'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(gift.payment_status)}`}>
                      {getStatusIcon(gift.payment_status)}
                      {gift.payment_status === 'pending' ? 'Pendiente' : 
                       gift.payment_status === 'recibida' ? 'Recibida' : 'Fallida'}
                    </span>
                  </div>
                </div>
                
                <div className={`flex ${!hasReceivedGifts ? 'justify-between' : 'justify-start'} items-center mb-3`}>
                  <div className="text-sm text-gray-300">
                    {gift.isGiver ? (
                      <div>
                        <div>Para: {gift.recipient_name}</div>
                        <div className="text-xs">Alias: {gift.alias}</div>
                      </div>
                    ) : (
                      <div>
                        <div>De: {gift.alias}</div>
                        <div className="text-xs">Regalo anónimo</div>
                      </div>
                    )}
                  </div>
                  {!hasReceivedGifts && (
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(gift.total_amount)}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewGift(gift)}
                    className="flex-1 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 px-4 py-2 rounded-lg font-medium text-sm hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver detalles
                  </button>
                  <button
                    onClick={() => handleStartChat(gift)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <ChatBubbleLeftRight className="w-4 h-4" />
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gift Details Modal */}
      {showGiftDetails && selectedGift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#73FFA2]">
                  Detalles del StalkerGift #{selectedGift.id.slice(-8).toUpperCase()}
                </h3>
                <button
                  onClick={closeGiftDetails}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Gift Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-[#73FFA2] mb-2">Información del Regalo</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fecha:</span>
                      <span className="text-white">{formatDate(selectedGift.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tipo:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(selectedGift.isGiver)}`}>
                        {getTypeIcon(selectedGift.isGiver)}
                        {selectedGift.isGiver ? 'Enviado' : 'Recibido'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Estado:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedGift.payment_status)}`}>
                        {getStatusIcon(selectedGift.payment_status)}
                        {selectedGift.payment_status === 'pending' ? 'Pendiente' : 
                         selectedGift.payment_status === 'recibida' ? 'Recibida' : 'Fallida'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total:</span>
                      <span className="text-white font-medium">
                        {selectedGift.isGiver ? formatCurrency(selectedGift.total_amount) : (
                          <span className="text-gray-400 italic">Oculto</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Método de Pago:</span>
                      <span className="text-white">{selectedGift.payment_method}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-[#73FFA2] mb-2">
                    {selectedGift.isGiver ? 'Información del Destinatario' : 'Información del Remitente'}
                  </h4>
                  <div className="text-sm text-gray-300">
                    <div className="mb-2">
                      <span className="text-gray-400">Nombre:</span> {selectedGift.recipient_name}
                    </div>
                    <div className="mb-2">
                      <span className="text-gray-400">Alias:</span> {selectedGift.alias}
                    </div>
                    <div className="mb-2">
                      <span className="text-gray-400">Email:</span> {selectedGift.email}
                    </div>
                    <div>
                      <span className="text-gray-400">Teléfono:</span> {selectedGift.phone}
                    </div>
                  </div>
                </div>
              </div>

              {/* Message */}
              {selectedGift.message && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-[#73FFA2] mb-2">Mensaje Personalizado</h4>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-300 text-sm italic">"{selectedGift.message}"</p>
                  </div>
                </div>
              )}

              {/* Products */}
              <div>
                <h4 className="text-sm font-medium text-[#73FFA2] mb-4">Productos</h4>
                <div className="space-y-3">
                  {selectedGift.products.map((product: any, index: number) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {product.thumbnail ? (
                          <Image
                            src={product.thumbnail}
                            alt={product.title || `Producto ${index + 1}`}
                            width={60}
                            height={60}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-[60px] h-[60px] bg-gray-700 rounded-lg flex items-center justify-center">
                            <Gift className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          {product.title || `Producto ${index + 1}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          Cantidad: {product.quantity || 1}
                        </div>
                      </div>
                      
                      {/* No mostrar precios en la vista de detalles del perfil */}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Confirmation Modal */}
      {showChatModal && selectedGiftForChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg max-w-md w-full">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#73FFA2]">
                  <ChatBubbleLeftRight className="w-6 h-6 inline mr-2" />
                  Iniciar Conversación
                </h3>
                <button
                  onClick={closeChatModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="mb-6">
                {selectedGiftForChat.isGiver ? (
                  // Mensaje para quien envió el regalo
                  <div className="text-center">
                    {/* TODO: Implementar la funcionalidad del chat para quien envió el regalo */}
                  </div>
                ) : (
                  // Mensaje para quien recibió el regalo
                  <div className="text-center">
                    {/* TODO: Implementar la funcionalidad del chat para quien recibió el regalo */}
                  </div>
                )}
              </div>

              {/* Close button for giver */}
              {/* TODO: Implementar la funcionalidad del chat opciones para cambiar el estado del chat si se quiere cerrar o si los dos quieren hacer match */}
              {selectedGiftForChat.isGiver && (
                <div className="flex justify-center">
                  <button
                    onClick={closeChatModal}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium text-sm transition-all"
                  >
                   Cerrar chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🎯 Chat Interface */}
      {showChat && chatConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] rounded-full flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-sm">
                    {chatConversation.user_role === 'giver' 
                      ? chatConversation.stalker_gift.recipient_name.charAt(0).toUpperCase()
                      : chatConversation.stalker_gift.alias.charAt(0).toUpperCase()
                    }
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-medium">
                    {chatConversation.user_role === 'giver' 
                      ? chatConversation.stalker_gift.recipient_name
                      : chatConversation.stalker_gift.alias
                    }
                  </h3>
                  <p className="text-gray-400 text-sm">
                    StalkerGift • {formatCurrency(chatConversation.stalker_gift.total_amount)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeChat}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  <XMark className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Welcome Message */}
              <div className="text-center py-4">
                <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
                  <ChatBubbleLeftRight className="w-8 h-8 text-[#73FFA2] mx-auto mb-2" />
                  <p className="text-gray-300 text-sm">
                    {chatConversation.user_role === 'giver' 
                      ? `¡${chatConversation.stalker_gift.recipient_name} ha aceptado tu regalo! Ahora pueden conocerse.`
                      : `¡Has aceptado un regalo de ${chatConversation.stalker_gift.alias}! Pueden empezar a chatear.`
                    }
                  </p>
                  {chatConversation.stalker_gift.message && (
                    <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                      <p className="text-gray-300 text-xs italic">
                        "{chatConversation.stalker_gift.message}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === customerId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === customerId
                        ? 'bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900'
                        : 'bg-gray-800 text-white'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender_id === customerId ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      {new Date(message.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                      {message.status === 'sending' && (
                        <span className="ml-1">⏳</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {otherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-white px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-1">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-xs text-gray-400 ml-2">escribiendo...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error Message */}
            {chatError && (
              <div className="px-4 py-2 bg-red-900 border-t border-red-700">
                <p className="text-red-300 text-sm">{chatError}</p>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe un mensaje..."
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#73FFA2] border border-gray-700"
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                    }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isLoadingChat}
                  className="bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 p-3 rounded-lg hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StalkerGiftTab
