"use client"

import Image from "next/image"
import Script from "next/script"
import { Button } from "@medusajs/ui"
import { 
  useStalkerGift, 
  getContactMethodLabel, 
  getContactMethodIcon,
  ContactMethod
} from "../../../../../../lib/context"
import { CreateStalkerGiftResponse } from "../../../actions/create-stalker-gift"

interface CheckoutViewProps {
  onBack: () => void
  calculateTotals: () => { subtotal: number; tax: number; shipping: number; total: number }
  selectedPaymentMethod: string
  paymentEpayco: any
  isProcessingPayment: boolean
  createdOrder: CreateStalkerGiftResponse | null
  showInvitationUrl: boolean
  paymentStatus: 'pending' | 'success' | 'failed' | null
  paymentDetails: any
  onPaymentMethodSelect: (method: string) => Promise<void>
  copyToClipboard: (text: string) => Promise<void>
}

export default function CheckoutView({
  onBack,
  calculateTotals,
  selectedPaymentMethod,
  paymentEpayco,
  isProcessingPayment,
  createdOrder,
  showInvitationUrl,
  paymentStatus,
  paymentDetails,
  onPaymentMethodSelect,
  copyToClipboard
}: CheckoutViewProps) {
  const { 
    stalkerGiftData, 
    setMessage,
    getFilledContactMethods
  } = useStalkerGift()

  const filledMethods = getFilledContactMethods()
  const { subtotal, tax, shipping, total } = calculateTotals()
  const currency = stalkerGiftData.selectedProducts[0]?.variants?.[0]?.inventory?.currency_code || '$'

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-[#66DEDB] hover:text-[#5FE085] transition-colors duration-300"
        >
          <span className="mr-2">←</span> Volver a selección de productos
        </button>
      </div>

      <div className="bg-gradient-to-r from-[#66DEDB]/10 to-[#5FE085]/10 border border-[#66DEDB]/30 rounded-2xl p-6 mb-8">
        <h2 className="text-3xl font-bold text-[#66DEDB] mb-6 text-center">
          💳 Resumen de Compra - StalkerGift
        </h2>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Columna izquierda - Resumen del regalo */}
          <div className="space-y-6">
            {/* Información del regalo */}
            <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
              <h3 className="text-xl font-semibold text-[#66DEDB] mb-4 flex items-center">
                <span className="mr-2">🎁</span> Detalles del Regalo Anónimo
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">De:</p>
                  <p className="text-white font-medium">{stalkerGiftData.alias}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Para:</p>
                  <p className="text-white font-medium">{stalkerGiftData.recipient.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Métodos de contacto:</p>
                  <div className="space-y-1 mt-1">
                    {filledMethods.map((method: ContactMethod) => (
                      <div key={method.type} className="flex items-center text-sm text-gray-300">
                        <span className="mr-2">{getContactMethodIcon(method.type)}</span>
                        <span className="mr-2">{getContactMethodLabel(method.type)}:</span>
                        <span>{method.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mensaje personalizado */}
            <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
              <h3 className="text-xl font-semibold text-[#66DEDB] mb-4 flex items-center">
                <span className="mr-2">💌</span> Mensaje Personalizado
              </h3>
              
              <div className="space-y-3">
                <label className="block text-gray-300 text-sm font-medium">
                  Escribe un mensaje para acompañar tu regalo
                  <span className="text-red-400 text-xs ml-2">*Requerido</span>
                </label>
                <textarea
                  value={stalkerGiftData.message || ''}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ejemplo: ¡Espero que disfrutes este regalo! Eres una persona muy especial..."
                  className="w-full bg-[#262626] border border-[#66DEDB]/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#66DEDB] focus:outline-none transition-colors resize-none"
                  rows={4}
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <p className={`text-xs ${
                    !stalkerGiftData.message?.trim() 
                      ? 'text-red-400 font-medium' 
                      : 'text-gray-500'
                  }`}>
                    {!stalkerGiftData.message?.trim() 
                      ? '⚠️ El mensaje es requerido para continuar' 
                      : '💡 Un mensaje personal hace que el regalo sea más especial'
                    }
                  </p>
                  <p className="text-gray-400 text-xs">
                    {stalkerGiftData.message?.length || 0}/500
                  </p>
                </div>
              </div>
            </div>

            {/* Productos seleccionados */}
            <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
              <h3 className="text-xl font-semibold text-[#66DEDB] mb-4 flex items-center">
                <span className="mr-2">📦</span> Productos Seleccionados ({stalkerGiftData.selectedProducts.length})
              </h3>
              
              <div className="space-y-4">
                {stalkerGiftData.selectedProducts.map((product) => (
                  <div key={product.id} className="flex items-center space-x-4 p-3 bg-[#262626]/50 rounded-lg">
                    <div className="w-16 h-16 relative overflow-hidden rounded-lg flex-shrink-0">
                      <Image
                        src={product.thumbnail || '/placeholder.png'}
                        alt={product.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm line-clamp-2">{product.title}</h4>
                      <p className="text-gray-400 text-xs mt-1">Cantidad: 1</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#66DEDB] font-bold">
                        {currency} {(product.variants?.[0]?.inventory?.price || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Columna derecha - Resumen de precios */}
          <div className="space-y-6">
            {/* Totales */}
            <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20 sticky top-6">
              <h3 className="text-xl font-semibold text-[#66DEDB] mb-6 flex items-center">
                <span className="mr-2">🧾</span> Resumen de Compra
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-600">
                  <span className="text-gray-300">Subtotal ({stalkerGiftData.selectedProducts.length} productos)</span>
                  <span className="text-white font-medium">{currency} {subtotal.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-600">
                  <span className="text-gray-300">IVA (16%)</span>
                  <span className="text-white font-medium">{currency} {tax.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-600">
                  <div className="flex flex-col">
                    <span className="text-gray-300">Envío</span>
                    {shipping === 0 && (
                      <span className="text-[#5FE085] text-xs">¡Envío gratis!</span>
                    )}
                  </div>
                  <span className="text-white font-medium">
                    {shipping === 0 ? 'Gratis' : `${currency} ${shipping.toLocaleString()}`}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-4 border-t-2 border-[#66DEDB]/30">
                  <span className="text-xl font-bold text-white">Total</span>
                  <span className="text-2xl font-bold text-[#66DEDB]">{currency} {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Estados de pago y métodos de pago se renderizan aquí */}
              {/* ... resto del contenido del checkout ... */}
              
              {/* Información adicional */}
              <div className="mt-4 p-4 bg-[#66DEDB]/10 rounded-lg">
                <p className="text-[#5FE085] text-xs font-medium flex items-center">
                  <span className="mr-2">🔒</span>
                  Pago seguro • El regalo se enviará de forma anónima
                </p>
              </div>

              {/* Sección de URL de Invitación */}
              {showInvitationUrl && createdOrder && (
                <div className="bg-gradient-to-r from-[#5FE085]/10 to-[#5FE085]/10 border border-[#5FE085]/30 rounded-2xl p-6 mt-6">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🎁</div>
                    <h3 className="text-2xl font-bold text-[#5FE085] mb-2">
                      ¡Orden Creada Exitosamente!
                    </h3>
                    <p className="text-gray-300 text-sm">
                      Tu StalkerGift ha sido creado. Comparte esta URL con el destinatario:
                    </p>
                  </div>

                  {/* URL de invitación */}
                  <div className="bg-[#262626]/50 rounded-xl p-4 border border-[#5FE085]/20 mb-4">
                    <label className="block text-[#5FE085] text-sm font-medium mb-2">
                      🔗 URL de Invitación:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={createdOrder.invitationUrl}
                        readOnly
                        className="flex-1 bg-[#1E1E1E] border border-[#5FE085]/30 rounded-lg px-4 py-3 text-white text-sm focus:border-[#5FE085] focus:outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(createdOrder.invitationUrl)}
                        className="bg-gradient-to-r from-[#5FE085] to-[#5FE085] text-black px-4 py-3 rounded-lg font-semibold hover:scale-105 transition-transform flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copiar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de confianza */}
      <div className="text-center">
        <p className="text-[#66DEDB]/80 text-sm font-medium">
          🎭 Tu identidad permanecerá en secreto hasta que decidas revelarla
        </p>
      </div>
    </div>
  )
}
