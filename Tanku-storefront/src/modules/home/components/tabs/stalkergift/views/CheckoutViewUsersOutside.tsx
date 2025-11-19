"use client"

import { useState } from "react"
import Image from "next/image"
import Script from "next/script"
import { Button } from "@medusajs/ui"
import { 
  useStalkerGift, 
  getContactMethodLabel, 
  getContactMethodIcon,
  ContactMethod
} from "../../../../../../lib/context"
import { CreateStalkerGiftResponse, CreateStalkerGiftData, createStalkerGift } from "../../../actions/create-stalker-gift"
import { retrieveCustomer } from "@lib/data/customer"

// Declaración para TypeScript para el objeto ePayco en window
declare global {
  interface Window {
    ePayco?: {
      checkout: {
        configure: (config: any) => {
          open: (options: any) => void
        }
      }
    }
  }
}

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
  setPaymentEpayco: (config: any) => void
  setCreatedOrder: (order: CreateStalkerGiftResponse) => void
  setPaymentStatus: (status: 'pending' | 'success' | 'failed' | null) => void
  setShowInvitationUrl: (show: boolean) => void
  setIsProcessingPayment: (processing: boolean) => void
  setSelectedPaymentMethod: (method: string) => void
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
  copyToClipboard,
  setPaymentEpayco,
  setCreatedOrder,
  setPaymentStatus,
  setShowInvitationUrl,
  setIsProcessingPayment,
  setSelectedPaymentMethod
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

              {/* Estado del Pago */}
              {paymentStatus === 'success' && paymentDetails && (
                <div className="mt-6 p-6 bg-gradient-to-r from-green-500/20 to-green-600/20 border-2 border-green-500/50 rounded-xl">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl">✅</span>
                    </div>
                    <h3 className="text-xl font-bold text-green-400 mb-2">¡Pago Exitoso!</h3>
                    <p className="text-green-300 text-sm mb-4">
                      Tu regalo anónimo ha sido procesado correctamente
                    </p>
                    
                    <div className="bg-[#262626]/50 rounded-lg p-4 text-left space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">ID Transacción:</span>
                        <span className="text-white font-mono">{paymentDetails.transactionId}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Monto:</span>
                        <span className="text-white">{currency} {paymentDetails.amount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Fecha:</span>
                        <span className="text-white">{paymentDetails.date}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Destinatario:</span>
                        <span className="text-white">{paymentDetails.recipient}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">De parte de:</span>
                        <span className="text-[#66DEDB]">{paymentDetails.alias}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-[#66DEDB]/20 rounded-lg">
                      <p className="text-[#5FE085] text-xs font-medium">
                        🎁 El regalo será enviado de forma anónima. Tu identidad permanecerá en secreto hasta que decidas revelarla.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus === 'pending' && (
                <div className="mt-6 p-6 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/50 rounded-xl">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                    <h3 className="text-xl font-bold text-yellow-400 mb-2">Verificando Pago...</h3>
                    <p className="text-yellow-300 text-sm">
                      Estamos verificando el estado de tu transacción
                    </p>
                  </div>
                </div>
              )}

              {/* Selección de método de pago - Solo mostrar si no hay pago exitoso */}
              {paymentStatus !== 'success' && (
                <div className="mt-6">
                  <h4 className={`text-lg font-semibold mb-4 ${
                    !stalkerGiftData.message?.trim() 
                      ? 'text-gray-500' 
                      : 'text-[#66DEDB]'
                  }`}>
                    Método de Pago
                    {!stalkerGiftData.message?.trim() && (
                      <span className="text-red-400 text-sm ml-2">(Completa el mensaje primero)</span>
                    )}
                  </h4>
                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        if (stalkerGiftData.message?.trim()) {
                          setSelectedPaymentMethod("epayco")
                          setIsProcessingPayment(true)
                          
                          try {
                            const userCustomer = await retrieveCustomer().catch(() => null)
                            
                            if (!userCustomer) {
                              alert("Debe iniciar sesión para realizar el pago")
                              setIsProcessingPayment(false)
                              return
                            }

                            const { total } = calculateTotals()
                            const filledMethods = getFilledContactMethods()
                            
                            // Crear orden real de StalkerGift en el backend
                            const orderData: CreateStalkerGiftData = {
                              total_amount: total,
                              first_name: userCustomer.first_name || "Usuario",
                              phone: filledMethods.find(m => m.type === 'phone')?.value || userCustomer.phone || "000000000",
                              email: userCustomer.email,
                              alias: stalkerGiftData.alias,
                              recipient_name: stalkerGiftData.recipient.name,
                              contact_methods: filledMethods,
                              products: stalkerGiftData.selectedProducts,
                              message: stalkerGiftData.message,
                              customer_giver_id: userCustomer.id,
                              payment_method: "epayco",
                              payment_status: "pending"
                            }
                            
                            // Llamar al backend para crear la orden
                            const response: CreateStalkerGiftResponse = await createStalkerGift(orderData)
                            
                            // Preparar configuración de ePayco
                            const epaycoConfig = {
                              key: 'a5bd3d6eaf8d072b2ad4265bd2dfaed9',
                              test: true,
                              external: false,
                              autoclick: false,
                              lang: 'es',
                              invoice: response.stalkerGift.id.toString(),
                              description: `StalkerGift - ${stalkerGiftData.selectedProducts.length} producto(s)`,
                              value: total.toString(),
                              tax: '0',
                              tax_base: (total * 0.84).toString(),
                              currency: 'COP',
                              country: 'CO',
                              email_billing: userCustomer.email,
                              name_billing: stalkerGiftData.alias || 'Usuario Anónimo',
                              address_billing: 'Dirección de prueba',
                              type_person: '0',
                              mobilephone_billing: filledMethods.find(m => m.type === 'phone')?.value || '3001234567',
                              number_doc_billing: '12345678',
                              response: `${window.location.origin}/stalker-gift/payment-response`,
                              confirmation: `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/stalker-gift/payment-confirmation`,
                              methodsDisable: ['CASH', 'DP']
                            }
                            
                            setPaymentEpayco(epaycoConfig)
                            
                            // Guardar datos de la orden
                            setCreatedOrder(response)
                            
                            setPaymentStatus('success')
                            setShowInvitationUrl(true)
                            
                          } catch (error) {
                            console.error('Error al procesar el pago:', error)
                            setPaymentStatus('failed')
                          } finally {
                            setIsProcessingPayment(false)
                          }
                        }
                      }}
                      disabled={!stalkerGiftData.message?.trim() || isProcessingPayment}
                      className={`w-full flex items-center justify-center space-x-3 p-4 border rounded-lg transition-all duration-300 font-medium ${
                        !stalkerGiftData.message?.trim() || isProcessingPayment
                          ? 'border-gray-600 bg-gray-800/50 cursor-not-allowed opacity-50 text-gray-500'
                          : 'border-[#66DEDB]/30 hover:border-[#66DEDB] hover:bg-[#66DEDB]/10 cursor-pointer text-white hover:scale-105'
                      }`}
                    >
                      {isProcessingPayment ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">💳</span>
                          <span>ePayco - Pago Seguro</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {isProcessingPayment && (
                    <div className="mt-4 p-4 bg-[#66DEDB]/10 rounded-lg border border-[#66DEDB]/30">
                      <p className="text-[#5FE085] font-medium flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5FE085] mr-2"></div>
                        Procesando orden...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Información adicional */}
              <div className="mt-4 p-4 bg-[#66DEDB]/10 rounded-lg">
                <p className="text-[#5FE085] text-xs font-medium flex items-center">
                  <span className="mr-2">🔒</span>
                  Pago seguro • El regalo se enviará de forma anónima
                </p>
              </div>

              {/* Sección de ePayco */}
              {paymentEpayco && (
                <>
                  <Script 
                    id="epayco-script-stalker"
                    src="https://checkout.epayco.co/checkout.js"
                    strategy="afterInteractive"
                  />
                  
                  <div className="mt-4 sm:mt-6">
                    <form id="epayco-payment-form-stalker">
                      <div className="mb-3 sm:mb-4">
                        <label htmlFor="epayco-payment-stalker" className="block text-sm font-medium text-white mb-2">
                          Pago con ePayco 
                        </label>
                        <p className="text-xs sm:text-sm text-gray-300 mb-3 sm:mb-4">Haga clic en el botón a continuación para proceder con el pago seguro a través de ePayco.</p>
                        
                        <div className="flex justify-center sm:justify-end">
                          <Button 
                            type="button"
                            id="epayco-custom-button-stalker"
                            className="w-full sm:w-auto bg-[#3B9BC3] hover:bg-[#66DEDB] hover:text-zinc-800 text-white p-2 sm:p-3 md:p-4 text-sm sm:text-base flex items-center justify-center gap-2 transition-colors"
                            onClick={() => {
                              if (typeof window.ePayco === 'undefined') {
                                console.error('ePayco no está cargado correctamente');
                                alert('Error al cargar el sistema de pago. Por favor, intente nuevamente.');
                                return;
                              }
                              
                              try {
                                const container = document.createElement('div');
                                container.style.display = 'none';
                                container.id = 'epayco-container-stalker';
                                document.body.appendChild(container);
                                
                                const handler = window.ePayco?.checkout.configure({
                                  key: 'a5bd3d6eaf8d072b2ad4265bd2dfaed9',
                                  test: true
                                });
                                
                                if (!handler) {
                                  throw new Error('No se pudo configurar el checkout de ePayco');
                                }
                                
                                handler.open({
                                  amount: paymentEpayco.total_amount,
                                  name: `StalkerGift para ${paymentEpayco.recipient_name}`,
                                  description: `Regalo anónimo de ${paymentEpayco.alias}`,
                                  currency: 'cop',
                                  country: 'co',
                                  external: false,
                                  response: `${process.env.NEXT_PUBLIC_BASE_URL}/home?stalker_payment=success`,
                                  confirmation: `${process.env.NEXT_PUBLIC_MEDUSA_WEBHOOK_URL}/stalker-gift/${paymentEpayco.id}`,
                                  name_billing: paymentEpayco.first_name,
                                  mobilephone_billing: paymentEpayco.phone
                                });
                              } catch (error) {
                                console.error('Error al iniciar el pago con ePayco:', error);
                                alert('Error al iniciar el pago. Por favor, intente nuevamente.');
                              }
                            }}
                          >
                            <span>Pagar con ePayco</span> 
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="20" height="14" x="2" y="5" rx="2" />
                              <line x1="2" x2="22" y1="10" y2="10" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </>
              )}

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
