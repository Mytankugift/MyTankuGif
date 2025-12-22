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

interface CheckoutViewProps {
  selectedUser: SelectableUser
  pseudonym: string
  selectedProducts: (WishlistProduct | ProductSuggestion)[]
  onBack: () => void
  onCompleteOrder: () => void
}

export default function CheckoutView({ 
  selectedUser, 
  pseudonym, 
  selectedProducts, 
  onBack, 
  onCompleteOrder 
}: CheckoutViewProps) {
  const [isProcessing, setIsProcessing] = useState(false)

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

  // Calcular totales con desglose
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

  const handleCompleteOrder = async () => {
    setIsProcessing(true)
    
    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsProcessing(false)
    onCompleteOrder()
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-[#66DEDB] hover:text-[#5FE085] transition-colors duration-300"
        >
          <span className="mr-2">←</span> Volver a selección
        </button>
        <h2 className="text-3xl font-bold text-white mt-4 flex items-center">
          <span className="mr-3">🛒</span>
          Resumen del StalkerGift
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Información del destinatario */}
        <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
          <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
            <span className="mr-2">👤</span>
            Destinatario
          </h3>
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image
                src={selectedUser.avatar_url || "/feed/avatar.png"}
                alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                width={64}
                height={64}
                className="rounded-full object-cover border-2 border-[#66DEDB] w-16 h-16"
                style={{ aspectRatio: '1/1' }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-lg font-semibold text-white">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h4>
                {selectedUser.is_friend && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#66DEDB]/20 text-[#66DEDB] border border-[#66DEDB]/30">
                    Amigos
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm">{selectedUser.email}</p>
            </div>
          </div>
          
          <div className="bg-[#1E1E1E]/50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-[#66DEDB] mb-2">Remitente:</h5>
            <p className="text-white">
              {pseudonym ? `"${pseudonym}"` : "Tu nombre real"}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {pseudonym 
                ? "El destinatario verá este seudónimo" 
                : "El destinatario verá tu nombre real"
              }
            </p>
          </div>
        </div>

        {/* Resumen de productos */}
        <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
          <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
            <span className="mr-2">🎁</span>
            Productos Seleccionados
          </h3>
          
          <div className="space-y-3 mb-6">
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

          {/* Totales con desglose */}
          <div className="border-t border-[#66DEDB]/20 pt-4">
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
            <p className="text-gray-400 text-xs mt-1">
              *Precios obtenidos del sistema de inventario
            </p>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-8 bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
        <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
          <span className="mr-2">ℹ️</span>
          Información del StalkerGift
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-semibold mb-2">Para el Remitente:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Recibirás confirmación del envío</li>
              <li>• Podrás ver el estado del regalo</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">Para el Destinatario:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Recibirá notificación del regalo</li>
              <li>• Verá tu nombre o seudónimo como remitente</li>
              <li>• Podrá aceptar o rechazar el regalo</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="mt-8 flex justify-center space-x-4">
        <button
          onClick={onBack}
          className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
        >
          Volver a Editar
        </button>
        <button
          onClick={handleCompleteOrder}
          disabled={isProcessing}
          className="bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] text-white px-8 py-3 rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Procesando...
            </div>
          ) : (
            "Confirmar StalkerGift"
          )}
        </button>
      </div>
    </div>
  )
}