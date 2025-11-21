"use client"

import { useState } from "react"
import Image from "next/image"
import { WishlistProduct } from "../../../../../social/actions/get-public-wishlists"
import { ProductSuggestion } from "../../../../../social/actions/get-product-suggestions"

interface SelectableUser {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_url?: string | null
  is_friend?: boolean
}

interface OrderSummaryViewProps {
  selectedUser: SelectableUser
  pseudonym: string
  selectedProducts: (WishlistProduct | ProductSuggestion)[]
  orderId: string
  onNewGift: () => void
}

export default function OrderSummaryView({ 
  selectedUser, 
  pseudonym, 
  selectedProducts, 
  orderId,
  onNewGift 
}: OrderSummaryViewProps) {
  const [showRecipientView, setShowRecipientView] = useState(false)

  // Debug: Verificar qué productos se están recibiendo
  console.log('OrderSummaryView recibió productos:', selectedProducts.map(p => ({
    id: p.id,
    title: p.title,
    quantity: (p as any).quantity || 1
  })))

  // Función para obtener el precio de un producto
  const getProductPrice = (product: WishlistProduct | ProductSuggestion) => {
    if ('variants' in product && product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0]
      if (firstVariant.inventory?.price && firstVariant.inventory.price > 0) {
        return {
          price: firstVariant.inventory.price,
          currency: firstVariant.inventory.currency_code || 'COP'
        }
      }
    }
    // Fallback si no hay precio disponible
    return {
      price: 0,
      currency: 'COP'
    }
  }

  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce((total, product) => {
      const { price } = getProductPrice(product)
      const quantity = (product as any).quantity || 1
      return total + (price * quantity)
    }, 0)
    
    const tax = subtotal * 0.16 // 16% IVA adicional
    const shipping = subtotal > 50000 ? 0 : 5000 // Envío gratis si es mayor a $50,000
    const total = subtotal + tax + shipping
    
    return { subtotal, tax, shipping, total }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-[#66DEDB]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-[#66DEDB]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          ¡StalkerGift Enviado! 🎉
        </h2>
        <p className="text-gray-400">
          Tu regalo anónimo ha sido enviado exitosamente
        </p>
        <div className="mt-4 bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-lg p-3 inline-block">
          <p className="text-[#66DEDB] font-semibold">
            ID de Orden: {orderId}
          </p>
        </div>
      </div>

      {/* Tabs para cambiar vista */}
      <div className="flex justify-center mb-8">
        <div className="bg-[#262626]/30 rounded-lg p-1 border border-[#66DEDB]/20">
          <button
            onClick={() => setShowRecipientView(false)}
            className={`px-6 py-2 rounded-md transition-colors ${
              !showRecipientView 
                ? 'bg-[#66DEDB] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Vista del Remitente
          </button>
          <button
            onClick={() => setShowRecipientView(true)}
            className={`px-6 py-2 rounded-md transition-colors ${
              showRecipientView 
                ? 'bg-[#66DEDB] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Vista del Destinatario
          </button>
        </div>
      </div>

      {/* Vista del Remitente */}
      {!showRecipientView && (
        <div className="space-y-6">
          <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
            <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">📤</span>
              Tu StalkerGift
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-semibold mb-2">Destinatario:</h4>
                <div className="flex items-center space-x-3">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <Image
                      src={selectedUser?.avatar_url || "/feed/avatar.png"}
                      alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                      width={48}
                      height={48}
                      className="rounded-full object-cover border-2 border-[#66DEDB] w-12 h-12"
                      style={{ aspectRatio: '1/1' }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-300">{selectedUser.first_name} {selectedUser.last_name}</p>
                      {selectedUser.is_friend && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#66DEDB]/20 text-[#66DEDB] border border-[#66DEDB]/30">
                          Amigos
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{selectedUser.email}</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Remitente:</h4>
                <p className="text-gray-300">
                  {pseudonym ? `"${pseudonym}"` : "Tu nombre real"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
            <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">🎁</span>
              Productos Enviados
            </h3>
            <div className="space-y-3">
              {selectedProducts.map((product) => (
                <div key={product.id} className="flex items-center space-x-3 bg-[#1E1E1E]/50 rounded-lg p-3">
                  <div className="w-12 h-12 relative overflow-hidden rounded-lg flex-shrink-0">
                    <img
                      src={product.thumbnail || '/placeholder.png'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white line-clamp-2">{product.title}</h4>
                    <p className="text-xs text-gray-400">
                      Cantidad: {(product as any).quantity || 1}
                    </p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const { price, currency } = getProductPrice(product)
                      const quantity = (product as any).quantity || 1
                      const totalPrice = price * quantity
                      return price > 0 ? (
                        <div>
                          <p className="text-[#66DEDB] font-semibold">
                            {currency} {Math.round(totalPrice).toLocaleString()}
                          </p>
                          {quantity > 1 && (
                            <p className="text-xs text-gray-400">
                              {currency} {Math.round(price).toLocaleString()} × {quantity}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">Precio no disponible</p>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#66DEDB]/20 pt-4 mt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white">
                    {(() => {
                      const { subtotal } = calculateTotals()
                      const currency = selectedProducts.length > 0 ? getProductPrice(selectedProducts[0]).currency : 'COP'
                      return `${currency} ${Math.round(subtotal).toLocaleString()}`
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IVA (16% adicional):</span>
                  <span className="text-white">
                    {(() => {
                      const { tax } = calculateTotals()
                      const currency = selectedProducts.length > 0 ? getProductPrice(selectedProducts[0]).currency : 'COP'
                      return `${currency} ${Math.round(tax).toLocaleString()}`
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Envío:</span>
                  <span className="text-white">
                    {(() => {
                      const { shipping } = calculateTotals()
                      const currency = selectedProducts.length > 0 ? getProductPrice(selectedProducts[0]).currency : 'COP'
                      return `${currency} ${Math.round(shipping).toLocaleString()}`
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                  <span className="text-lg font-semibold text-white">Total:</span>
                  <span className="text-2xl font-bold text-[#66DEDB]">
                    {(() => {
                      const { total } = calculateTotals()
                      const currency = selectedProducts.length > 0 ? getProductPrice(selectedProducts[0]).currency : 'COP'
                      return `${currency} ${Math.round(total).toLocaleString()}`
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-xl p-6">
            <h4 className="text-[#66DEDB] font-semibold mb-2">Próximos pasos:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• El destinatario recibirá una notificación</li>
              <li>• Podrás ver el estado del regalo en tu perfil</li>
              <li>• Recibirás actualizaciones por email</li>
            </ul>
          </div>
        </div>
      )}

      {/* Vista del Destinatario */}
      {showRecipientView && (
        <div className="space-y-6">
          <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
            <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">📥</span>
              Has recibido un StalkerGift
            </h3>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#66DEDB]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎁</span>
              </div>
              <p className="text-white text-lg">
                Alguien te ha enviado un regalo anónimo
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {pseudonym ? `De: "${pseudonym}"` : `De: ${pseudonym}`}
              </p>
            </div>
          </div>

          <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
            <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">🎁</span>
              Productos Recibidos
            </h3>
            <div className="space-y-3">
              {selectedProducts.map((product) => (
                <div key={product.id} className="flex items-center space-x-3 bg-[#1E1E1E]/50 rounded-lg p-3">
                  <div className="w-12 h-12 relative overflow-hidden rounded-lg flex-shrink-0">
                    <img
                      src={product.thumbnail || '/placeholder.png'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white line-clamp-2">{product.title}</h4>
                    <p className="text-xs text-gray-400">
                      Cantidad: {(product as any).quantity || 1}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#5FE085]/10 border border-[#5FE085]/30 rounded-xl p-6">
            <h4 className="text-[#5FE085] font-semibold mb-2">¿Qué puedes hacer?</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Aceptar el regalo y agregarlo a tu cuenta</li>
              <li>• Rechazar el regalo si no lo deseas</li>
              <li>• Agradecer al remitente (opcional)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Botón para nuevo regalo */}
      <div className="mt-8 text-center">
        <button
          onClick={onNewGift}
          className="bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] text-white px-8 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
        >
          Enviar Otro StalkerGift
        </button>
      </div>
    </div>
  )
}
