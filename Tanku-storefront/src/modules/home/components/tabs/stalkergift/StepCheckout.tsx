"use client"

import { useState } from "react"
import {
  ShoppingBag,
  User,
  PencilSquare,
  InformationCircleSolid,
  CreditCard,
  CheckCircleSolid,
} from "@medusajs/icons"
import Image from "next/image"
import { createStalkerGift, CreateStalkerGiftPayload } from "@/lib/data/stalker-gift"

// Tipos
interface Product {
  id: string
  title: string
  thumbnail?: string
  price?: {
    calculated_price?: {
      calculated_amount: number
      currency_code: string
    }
  }
}

interface SelectedProduct {
  product: Product
  quantity: number
  variantId?: string
}

interface RecipientInfo {
  id: string
  name: string
  username?: string
  avatar?: string
}

interface SenderInfo {
  alias: string
  revealIdentity: boolean
  message?: string
  firstName: string
  phone: string
  email: string
  contactMethods?: Array<{
    type: string
    value: string
  }>
}

interface StepCheckoutProps {
  recipient: RecipientInfo
  sender: SenderInfo
  products: SelectedProduct[]
  totalAmount: number
  onConfirm: (stalkerGiftId: string, invitationUrl: string) => void
  onBack: () => void
  onEditRecipient?: () => void
  onEditAlias?: () => void
  onEditProducts?: () => void
  onEditMessage?: () => void
}

export default function StepCheckout({
  recipient,
  sender,
  products,
  totalAmount,
  onConfirm,
  onBack,
  onEditRecipient,
  onEditAlias,
  onEditProducts,
  onEditMessage,
}: StepCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showFullMessage, setShowFullMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatPrice = (amount: number, currencyCode: string = "COP"): string => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Preparar productos para el payload
      const productsPayload = products.map((item) => ({
        id: item.product.id,
        title: item.product.title,
        quantity: item.quantity,
        price: item.product.price?.calculated_price?.calculated_amount || 0,
      }))

      // Calcular total con IVA
      const subtotal = totalAmount
      const tax = subtotal * 0.19 // IVA 19%
      const shipping = 0
      const total = subtotal + tax + shipping

      // Preparar payload para crear el stalker gift
      const payload: CreateStalkerGiftPayload = {
        total_amount: total,
        first_name: sender.firstName,
        phone: sender.phone,
        email: sender.email,
        alias: sender.alias, // ← Corregido: era giver_alias
        recipient_name: recipient.name,
        contact_methods: sender.contactMethods || [
          { type: "phone", value: sender.phone },
          { type: "email", value: sender.email },
        ],
        products: productsPayload,
        message: sender.message,
        customer_giver_id: undefined, // ← Corregido: era giver_id
        customer_recipient_id: recipient.id, // ← Agregado
        payment_method: "epayco",
        payment_status: "pending",
      }

      // Crear el stalker gift
      const response = await createStalkerGift(payload)

      if (response.success) {
        // Llamar al callback con el ID y URL de invitación
        await onConfirm(
          response.data.stalkerGift.id,
          response.data.invitationUrl
        )
      } else {
        throw new Error("Error al crear la orden")
      }
    } catch (error) {
      console.error("Error al confirmar orden:", error)
      setError(
        error instanceof Error
          ? error.message
          : "Error al procesar la orden. Por favor intenta nuevamente."
      )
      setIsProcessing(false)
    }
  }

  // Calcular subtotal, envío, impuestos
  const subtotal = totalAmount
  const shipping = 0 // TODO: Calcular envío real
  const tax = subtotal * 0.19 // IVA 19%
  const total = subtotal + shipping + tax

  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0)

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="text-[#66DEDB] hover:text-[#66DEDB]/80 transition-colors mb-4 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>←</span>
          <span>Volver</span>
        </button>

        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-r from-[#66DEDB] to-[#66DEDB]/70 rounded-full px-6 py-2 mb-4">
            <h2 className="text-2xl font-bold text-white">
              Revisa tu Orden
            </h2>
          </div>
          <p className="text-gray-300">
            Verifica que todo esté correcto antes de proceder al pago
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna principal - Detalles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información del Destinatario */}
          <div className="bg-gradient-to-br from-[#262626] to-[#66DEDB]/5 border-2 border-[#66DEDB]/30 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-[#66DEDB] rounded-full p-2">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Destinatario</h3>
              </div>
              {onEditRecipient && (
                <button
                  onClick={onEditRecipient}
                  disabled={isProcessing}
                  className="text-[#66DEDB] hover:text-[#66DEDB]/80 transition-colors flex items-center space-x-1 disabled:opacity-50"
                >
                  <PencilSquare className="w-4 h-4" />
                  <span className="text-sm">Editar</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {recipient.avatar ? (
                <img
                  src={recipient.avatar}
                  alt={recipient.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#66DEDB]/50"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <p className="text-white font-semibold text-lg">
                  {recipient.name}
                </p>
                {recipient.username && (
                  <p className="text-[#66DEDB] text-sm">{recipient.username}</p>
                )}
              </div>
            </div>
          </div>

          {/* Información del Remitente (Alias) */}
          <div className="bg-gradient-to-br from-[#262626] to-[#66DEDB]/5 border-2 border-[#66DEDB]/30 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-[#66DEDB] rounded-full p-2">
                  <span className="text-xl">🎭</span>
                </div>
                <h3 className="text-xl font-bold text-white">Tu Identidad</h3>
              </div>
              {onEditAlias && (
                <button
                  onClick={onEditAlias}
                  disabled={isProcessing}
                  className="text-[#66DEDB] hover:text-[#66DEDB]/80 transition-colors flex items-center space-x-1 disabled:opacity-50"
                >
                  <PencilSquare className="w-4 h-4" />
                  <span className="text-sm">Editar</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#66DEDB]/20">
                <p className="text-gray-400 text-sm mb-1">Seudónimo:</p>
                <p className="text-white font-semibold text-lg">
                  {sender.alias}
                </p>
              </div>

              <div className="flex items-start space-x-2 text-sm">
                {sender.revealIdentity ? (
                  <>
                    <CheckCircleSolid className="w-5 h-5 text-[#5FE085] flex-shrink-0 mt-0.5" />
                    <p className="text-[#5FE085]">
                      Permitirás que {recipient.name} pueda solicitarte revelar tu identidad
                    </p>
                  </>
                ) : (
                  <>
                    <InformationCircleSolid className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-400">
                      Tu identidad permanecerá completamente anónima
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mensaje Personalizado */}
          {sender.message && (
            <div className="bg-gradient-to-br from-[#262626] to-[#66DEDB]/5 border-2 border-[#66DEDB]/30 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-[#66DEDB] rounded-full p-2">
                    <span className="text-xl">💌</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Tu Mensaje</h3>
                </div>
                {onEditMessage && (
                  <button
                    onClick={onEditMessage}
                    disabled={isProcessing}
                    className="text-[#66DEDB] hover:text-[#66DEDB]/80 transition-colors flex items-center space-x-1 disabled:opacity-50"
                  >
                    <PencilSquare className="w-4 h-4" />
                    <span className="text-sm">Editar</span>
                  </button>
                )}
              </div>

              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#66DEDB]/20">
                <p className="text-white italic leading-relaxed">
                  {showFullMessage || sender.message.length <= 150
                    ? `"${sender.message}"`
                    : `"${sender.message.substring(0, 150)}..."`}
                </p>
                {sender.message.length > 150 && (
                  <button
                    onClick={() => setShowFullMessage(!showFullMessage)}
                    className="text-[#66DEDB] text-sm mt-2 hover:underline"
                  >
                    {showFullMessage ? "Ver menos" : "Ver más"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Productos */}
          <div className="bg-gradient-to-br from-[#262626] to-[#66DEDB]/5 border-2 border-[#66DEDB]/30 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-[#66DEDB] rounded-full p-2">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Productos ({totalItems} {totalItems === 1 ? "artículo" : "artículos"})
                </h3>
              </div>
              {onEditProducts && (
                <button
                  onClick={onEditProducts}
                  disabled={isProcessing}
                  className="text-[#66DEDB] hover:text-[#66DEDB]/80 transition-colors flex items-center space-x-1 disabled:opacity-50"
                >
                  <PencilSquare className="w-4 h-4" />
                  <span className="text-sm">Editar</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {products.map((item, index) => {
                const price =
                  item.product.price?.calculated_price?.calculated_amount || 0
                const currencyCode =
                  item.product.price?.calculated_price?.currency_code || "COP"

                return (
                  <div
                    key={`${item.product.id}-${item.variantId || index}`}
                    className="flex items-center space-x-4 bg-[#1a1a1a] rounded-lg p-4 border border-[#66DEDB]/20"
                  >
                    {/* Imagen */}
                    <div className="relative w-16 h-16 flex-shrink-0 bg-[#262626] rounded-lg overflow-hidden">
                      {item.product.thumbnail ? (
                        <Image
                          src={item.product.thumbnail}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">
                        {item.product.title}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Cantidad: {item.quantity}
                      </p>
                    </div>

                    {/* Precio */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold">
                        {formatPrice(price * item.quantity, currencyCode)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-gray-400 text-xs">
                          {formatPrice(price, currencyCode)} c/u
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Columna lateral - Resumen de Pago */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Resumen de Orden */}
            <div className="bg-gradient-to-br from-[#262626] to-[#66DEDB]/10 border-2 border-[#66DEDB] rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <CreditCard className="w-6 h-6 text-[#66DEDB]" />
                <span>Resumen de Orden</span>
              </h3>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between text-gray-300">
                  <span>Envío</span>
                  <span>{shipping === 0 ? "Gratis" : formatPrice(shipping)}</span>
                </div>

                <div className="flex justify-between text-gray-300">
                  <span>IVA (19%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>

                <div className="border-t border-[#66DEDB]/30 pt-3">
                  <div className="flex justify-between text-white text-xl font-bold">
                    <span>Total</span>
                    <span className="text-[#66DEDB]">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className={`
                  w-full py-4 rounded-xl font-bold text-white transition-all
                  ${
                    isProcessing
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#66DEDB] to-[#5FE085] hover:shadow-lg hover:shadow-[#66DEDB]/30 hover:scale-[1.02]"
                  }
                `}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Procesando...</span>
                  </span>
                ) : (
                  "Proceder al Pago"
                )}
              </button>
            </div>

            {/* Info Adicional */}
            <div className="bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <InformationCircleSolid className="w-5 h-5 text-[#66DEDB] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[#66DEDB] space-y-2">
                  <p>
                    <strong>¿Qué sucede después?</strong>
                  </p>
                  <ul className="space-y-1 text-gray-300 list-disc list-inside">
                    <li>Realizarás el pago de forma segura</li>
                    <li>Recibirás un código de confirmación</li>
                    <li>El destinatario será notificado</li>
                    <li>Podrás chatear de forma anónima</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Garantía */}
            <div className="bg-gradient-to-br from-[#5FE085]/10 to-transparent border border-[#5FE085]/30 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircleSolid className="w-5 h-5 text-[#5FE085]" />
                <p className="text-[#5FE085] font-semibold">
                  Garantía de Privacidad
                </p>
              </div>
              <p className="text-gray-400 text-sm">
                Tu identidad está protegida. El destinatario solo verá tu
                seudónimo hasta que decidas revelarte.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 max-w-md bg-red-500/20 border-2 border-red-500 text-red-500 px-6 py-4 rounded-xl z-50 shadow-lg animate-slideIn">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold mb-1">Error al procesar</p>
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-300 hover:text-red-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}