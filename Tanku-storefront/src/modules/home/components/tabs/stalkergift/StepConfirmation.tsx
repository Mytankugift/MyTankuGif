"use client"

import { useState } from "react"
import {
  CheckCircleSolid,
  InformationCircleSolid,
  Share,
  DocumentDuplicate,
  ChatBubbleLeftRight,
  ShoppingBag,
  Sparkles,
} from "@medusajs/icons"
import Image from "next/image"
import { copyToClipboard, shareViaWebShare } from "@/lib/data/stalker-gift"

// Tipos
interface Product {
  id: string
  title: string
  thumbnail?: string
  quantity: number
  price: number
}

interface StalkerGiftOrder {
  id: string
  alias: string
  recipientName: string
  totalAmount: number
  products: Product[]
  message?: string
  invitationUrl: string
  invitationText: string
  paymentStatus: string
  createdAt: string
}

interface StepConfirmationProps {
  order: StalkerGiftOrder
  viewMode: "sender" | "recipient"
  onClose?: () => void
  onStartChat?: () => void
  onViewOrder?: () => void
}

export default function StepConfirmation({
  order,
  viewMode,
  onClose,
  onStartChat,
  onViewOrder,
}: StepConfirmationProps) {
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)

  const formatPrice = (amount: number, currencyCode: string = "COP"): string => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleCopyLink = async () => {
    const success = await copyToClipboard(order.invitationUrl)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  const handleShare = async () => {
    setSharing(true)
    const success = await shareViaWebShare({
      title: "¡Tienes un regalo sorpresa!",
      text: order.invitationText,
      url: order.invitationUrl,
    })

    if (!success) {
      // Fallback a copiar al portapapeles
      await handleCopyLink()
    }
    setSharing(false)
  }

  const totalItems = order.products.reduce((sum, p) => sum + p.quantity, 0)

  // Vista para quien ENVÍA el regalo
  if (viewMode === "sender") {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Celebración */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-block bg-gradient-to-r from-[#5FE085] to-[#66DEDB] rounded-full p-6 mb-6 animate-bounce">
            <CheckCircleSolid className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            ¡Regalo Enviado! 🎉
          </h1>
          <p className="text-xl text-gray-300">
            Tu regalo sorpresa ha sido creado exitosamente
          </p>
        </div>

        {/* Información de la orden */}
        <div className="space-y-6">
          {/* Resumen */}
          <div className="bg-gradient-to-br from-[#262626] to-[#66DEDB]/10 border-2 border-[#66DEDB] rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Sparkles className="w-6 h-6 text-[#66DEDB]" />
              <h2 className="text-2xl font-bold text-white">Resumen del Regalo</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#66DEDB]/20">
                <p className="text-gray-400 text-sm mb-1">Destinatario</p>
                <p className="text-white font-semibold text-lg">
                  {order.recipientName}
                </p>
              </div>

              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#66DEDB]/20">
                <p className="text-gray-400 text-sm mb-1">Tu Seudónimo</p>
                <p className="text-white font-semibold text-lg">{order.alias}</p>
              </div>

              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#66DEDB]/20">
                <p className="text-gray-400 text-sm mb-1">Total Pagado</p>
                <p className="text-[#66DEDB] font-bold text-xl">
                  {formatPrice(order.totalAmount)}
                </p>
              </div>

              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#66DEDB]/20">
                <p className="text-gray-400 text-sm mb-1">Productos</p>
                <p className="text-white font-semibold text-lg">
                  {totalItems} {totalItems === 1 ? "artículo" : "artículos"}
                </p>
              </div>
            </div>

            {/* ID de Orden */}
            <div className="mt-4 bg-[#1a1a1a] rounded-lg p-4 border border-[#66DEDB]/20">
              <p className="text-gray-400 text-sm mb-1">ID de Orden</p>
              <p className="text-[#66DEDB] font-mono text-sm">{order.id}</p>
            </div>
          </div>

          {/* Compartir Link */}
          <div className="bg-gradient-to-br from-[#262626] to-[#5FE085]/10 border-2 border-[#5FE085] rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Share className="w-6 h-6 text-[#5FE085]" />
              <h2 className="text-2xl font-bold text-white">
                Comparte el Regalo
              </h2>
            </div>

            <p className="text-gray-300 mb-4">
              Envía este enlace a <strong>{order.recipientName}</strong> para que
              pueda ver su regalo sorpresa:
            </p>

            {/* URL Input */}
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#5FE085]/30 mb-4">
              <p className="text-[#5FE085] font-mono text-sm break-all">
                {order.invitationUrl}
              </p>
            </div>

            {/* Botones de compartir */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-3 px-4 bg-[#66DEDB] hover:bg-[#66DEDB]/90 text-white font-semibold rounded-lg transition-all flex items-center justify-center space-x-2"
              >
                <DocumentDuplicate className="w-5 h-5" />
                <span>{copied ? "¡Copiado!" : "Copiar Link"}</span>
              </button>

              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex-1 py-3 px-4 bg-[#5FE085] hover:bg-[#5FE085]/90 text-white font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Share className="w-5 h-5" />
                <span>{sharing ? "Compartiendo..." : "Compartir"}</span>
              </button>
            </div>
          </div>

          {/* Productos */}
          <div className="bg-gradient-to-br from-[#262626] to-[#66DEDB]/10 border-2 border-[#66DEDB]/30 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <ShoppingBag className="w-6 h-6 text-[#66DEDB]" />
              <h2 className="text-xl font-bold text-white">Productos Incluidos</h2>
            </div>

            <div className="space-y-3">
              {order.products.map((product, index) => (
                <div
                  key={`${product.id}-${index}`}
                  className="flex items-center space-x-4 bg-[#1a1a1a] rounded-lg p-4 border border-[#66DEDB]/20"
                >
                  <div className="relative w-16 h-16 flex-shrink-0 bg-[#262626] rounded-lg overflow-hidden">
                    {product.thumbnail ? (
                      <Image
                        src={product.thumbnail}
                        alt={product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {product.title}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Cantidad: {product.quantity}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-bold">
                      {formatPrice(product.price * product.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Siguiente Pasos */}
          <div className="bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <InformationCircleSolid className="w-6 h-6 text-[#66DEDB] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-[#66DEDB] font-bold mb-2">
                  ¿Qué sucede ahora?
                </h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="text-[#5FE085]">✓</span>
                    <span>
                      Comparte el enlace con {order.recipientName} para que vea su
                      regalo
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-[#5FE085]">✓</span>
                    <span>
                      Recibirás una notificación cuando el destinatario vea el
                      regalo
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-[#5FE085]">✓</span>
                    <span>
                      Podrás chatear de forma anónima una vez que el regalo sea
                      recibido
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-[#5FE085]">✓</span>
                    <span>Tu identidad permanecerá anónima como "{order.alias}"</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3">
            {onViewOrder && (
              <button
                onClick={onViewOrder}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-[#66DEDB] to-[#5FE085] hover:shadow-lg hover:shadow-[#66DEDB]/30 text-white font-bold rounded-xl transition-all"
              >
                Ver Mis Órdenes
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 py-4 px-6 bg-[#262626] border-2 border-[#66DEDB]/30 hover:border-[#66DEDB] text-white font-semibold rounded-xl transition-all"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Vista para quien RECIBE el regalo
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Sorpresa */}
      <div className="text-center mb-8 animate-fadeIn">
        <div className="inline-block bg-gradient-to-r from-[#66DEDB] to-[#5FE085] rounded-full p-6 mb-6 animate-pulse">
          <span className="text-6xl">🎁</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          ¡Tienes un Regalo! 🎉
        </h1>
        <p className="text-xl text-gray-300">
          Alguien especial te ha enviado una sorpresa
        </p>
      </div>

      {/* Información del regalo */}
      <div className="space-y-6">
        {/* Mensaje del remitente */}
        <div className="bg-gradient-to-br from-[#262626] to-[#66DEDB]/10 border-2 border-[#66DEDB] rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-3xl">💌</span>
            <h2 className="text-2xl font-bold text-white">
              Mensaje de "{order.alias}"
            </h2>
          </div>

          {order.message ? (
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#66DEDB]/20">
              <p className="text-white text-lg italic leading-relaxed">
                "{order.message}"
              </p>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#66DEDB]/20">
              <p className="text-gray-400 text-center italic">
                Tu admirador secreto no dejó mensaje, ¡pero te envió algo especial!
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center space-x-2 text-gray-400 text-sm">
            <span>De:</span>
            <span className="text-[#66DEDB] font-semibold">{order.alias}</span>
            <span>🎭</span>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-gradient-to-br from-[#262626] to-[#5FE085]/10 border-2 border-[#5FE085] rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ShoppingBag className="w-6 h-6 text-[#5FE085]" />
            <h2 className="text-2xl font-bold text-white">
              Tus Regalos ({totalItems} {totalItems === 1 ? "artículo" : "artículos"})
            </h2>
          </div>

          <div className="space-y-3">
            {order.products.map((product, index) => (
              <div
                key={`${product.id}-${index}`}
                className="flex items-center space-x-4 bg-[#1a1a1a] rounded-lg p-4 border border-[#5FE085]/30 hover:border-[#5FE085] transition-all"
              >
                <div className="relative w-20 h-20 flex-shrink-0 bg-[#262626] rounded-lg overflow-hidden">
                  {product.thumbnail ? (
                    <Image
                      src={product.thumbnail}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-gray-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-lg mb-1">
                    {product.title}
                  </p>
                  <p className="text-gray-400">
                    Cantidad: <span className="text-[#5FE085] font-semibold">{product.quantity}</span>
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-2xl">✨</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 bg-gradient-to-r from-[#5FE085]/20 to-[#66DEDB]/20 rounded-lg p-4 border border-[#5FE085]/50">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold text-lg">
                Valor Total del Regalo:
              </span>
              <span className="text-[#5FE085] font-bold text-2xl">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Chat */}
        {order.paymentStatus === "recibida" && onStartChat && (
          <div className="bg-gradient-to-br from-[#262626] to-[#66DEDB]/10 border-2 border-[#66DEDB] rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <ChatBubbleLeftRight className="w-6 h-6 text-[#66DEDB]" />
              <h2 className="text-xl font-bold text-white">
                Chat Anónimo Disponible
              </h2>
            </div>

            <p className="text-gray-300 mb-4">
              Ahora puedes chatear con "{order.alias}" de forma completamente
              anónima. ¡Agradece tu regalo o simplemente conversa!
            </p>

            <button
              onClick={onStartChat}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#66DEDB] to-[#5FE085] hover:shadow-lg hover:shadow-[#66DEDB]/30 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
            >
              <ChatBubbleLeftRight className="w-5 h-5" />
              <span>Iniciar Chat</span>
            </button>
          </div>
        )}

        {/* Información */}
        <div className="bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <InformationCircleSolid className="w-6 h-6 text-[#66DEDB] flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-[#66DEDB] font-bold mb-2">
                Sobre tu Regalo Anónimo
              </h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start space-x-2">
                  <span className="text-[#5FE085]">•</span>
                  <span>
                    Este regalo fue enviado de forma anónima por alguien que te
                    aprecia
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[#5FE085]">•</span>
                  <span>
                    La identidad de "{order.alias}" permanece protegida hasta que
                    decidan revelarse
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[#5FE085]">•</span>
                  <span>
                    Tus productos serán enviados a la dirección registrada
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[#5FE085]">•</span>
                  <span>
                    Podrás rastrear tu pedido con el ID: {order.id}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-[#66DEDB] to-[#5FE085] hover:shadow-lg hover:shadow-[#66DEDB]/30 text-white font-bold rounded-xl transition-all"
            >
              Aceptar Regalo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}