"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Script from "next/script"
import { Button } from "@medusajs/ui"
import { 
  useStalkerGift, 
  getContactMethodLabel, 
  getContactMethodIcon, 
  getContactMethodPlaceholder,
  ContactMethod,
  Product
} from "../../../../lib/context"
import { fetchListStoreProduct } from "../actions/get-list-store-products"
import { retrieveCustomer } from "@lib/data/customer"
import { createStalkerGift, CreateStalkerGiftData, CreateStalkerGiftResponse } from "../actions/create-stalker-gift"

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

type StalkerGiftOption = 'intro' | 'for-me' | 'for-tanku-user' | 'for-external-user' | 'product-selection' | 'checkout'

export default function StalkerGiftTab() {
  const [currentView, setCurrentView] = useState<StalkerGiftOption>('intro')
  const { 
    stalkerGiftData, 
    isFormValid, 
    setAlias, 
    setRecipientName, 
    updateContactMethod: handleContactMethodChange, 
    toggleProductSelection, 
    setMessage,
    resetForm, 
    validateForm,
    getFilledContactMethods,
    isProductSelected 
  } = useStalkerGift()

  // Estados para productos
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  
  // Estados para botón flotante
  const [isFloatingButtonVisible, setIsFloatingButtonVisible] = useState(false)
  const originalButtonRef = useRef<HTMLDivElement>(null)
  
  // Estados para pago
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [paymentEpayco, setPaymentEpayco] = useState<any>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  
  // Estados para URL de invitación
  const [createdOrder, setCreatedOrder] = useState<CreateStalkerGiftResponse | null>(null)
  const [showInvitationUrl, setShowInvitationUrl] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed' | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)

  // Función para cargar productos
  const loadProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const productList = await fetchListStoreProduct()
      setProducts(productList || [])
    } catch (error) {
      console.error("Error loading products:", error)
      setProducts([])
    } finally {
      setIsLoadingProducts(false)
    }
  }

  // Función para proceder al checkout
  const handleProceedToCheckout = () => {
    setCurrentView('checkout')
  }

  // Función para calcular totales
  const calculateTotals = () => {
    const subtotal = stalkerGiftData.selectedProducts.reduce((total, product) => {
      const price = product.variants?.[0]?.inventory?.price || 0
      return total + price
    }, 0)
    
    const tax = subtotal * 0.16 // 16% IVA
    const shipping = subtotal > 500 ? 0 : 50 // Envío gratis si es mayor a $500
    const total = subtotal + tax + shipping
    
    return { subtotal, tax, shipping, total }
  }

  // Función para seleccionar método de pago
  const handlePaymentMethodSelect = async (method: string) => {
    console.log('Seleccionando método de pago:', method)
    setSelectedPaymentMethod(method)
    
    // Si selecciona ePayco, crear la orden inmediatamente
    if (method === "epayco") {
      console.log('Ejecutando handlePayment...')
      await handlePayment()
    }
  }

  // Función para procesar el pago
  const handlePayment = async () => {
    console.log('=== INICIANDO handlePayment ===')
    console.log('selectedPaymentMethod:', selectedPaymentMethod)
    
    const userCustomer = await retrieveCustomer().catch(() => null)
    console.log('userCustomer:', userCustomer)
    
    if (!userCustomer) {
      alert("Debe iniciar sesión para realizar el pago")
      return
    }

    if (selectedPaymentMethod === "epayco") {
      console.log('Procesando pago con ePayco...')
      setIsProcessingPayment(true)
      try {
        const { total } = calculateTotals()
        const filledMethods = getFilledContactMethods()
        
        console.log('Total calculado:', total)
        console.log('Métodos de contacto:', filledMethods)
        
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
          payment_method: "epayco",
          payment_status: "pending"
        }
        
        console.log('Creando orden en backend:', orderData)
        
        // Llamar al backend para crear la orden
        const response: CreateStalkerGiftResponse = await createStalkerGift(orderData)
        
        console.log('Orden creada exitosamente:', response)
        console.log('URL de invitación:', response.invitationUrl)
        console.log('Texto de invitación:', response.invitationText)
        
        // Preparar datos para ePayco con la orden real
        const stalkerGiftOrder = {
          id: response.stalkerGift.id,
          total_amount: response.stalkerGift.total_amount,
          first_name: response.stalkerGift.first_name,
          phone: response.stalkerGift.phone,
          email: response.stalkerGift.email,
          alias: response.stalkerGift.alias,
          recipient_name: response.stalkerGift.recipient_name,
          contact_methods: response.stalkerGift.contact_methods,
          products: response.stalkerGift.products,
          invitationUrl: response.invitationUrl,
          invitationText: response.invitationText
        }
        
        setPaymentEpayco(stalkerGiftOrder)
        console.log('paymentEpayco establecido con orden real')
        
        // Guardar la respuesta completa y mostrar la URL
        setCreatedOrder(response)
        setShowInvitationUrl(true)
        
      } catch (error) {
        console.error("Error al procesar el pedido:", error)
        alert(`Error al procesar el pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      } finally {
        setIsProcessingPayment(false)
      }
    }
  }

  // Función para copiar URL al portapapeles
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('¡URL copiada al portapapeles!')
    } catch (err) {
      console.error('Error al copiar:', err)
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('¡URL copiada al portapapeles!')
    }
  }

  // Effect para manejar el scroll y botón flotante
  useEffect(() => {
    if (currentView !== 'product-selection') {
      setIsFloatingButtonVisible(false)
      return
    }

    const handleScroll = () => {
      if (originalButtonRef.current) {
        const rect = originalButtonRef.current.getBoundingClientRect()
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
        setIsFloatingButtonVisible(!isVisible)
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state

    return () => window.removeEventListener('scroll', handleScroll)
  }, [currentView])

  // Effect para detectar el retorno del pago de ePayco
  useEffect(() => {
    // Detectar si el usuario regresa de ePayco
    const urlParams = new URLSearchParams(window.location.search)
    const stalkerPayment = urlParams.get('stalker_payment')
    
    if (stalkerPayment === 'success' && paymentEpayco) {
      console.log('Pago exitoso detectado desde ePayco')
      setPaymentStatus('success')
      setPaymentDetails({
        transactionId: `TXN-${Date.now()}`,
        amount: paymentEpayco.total_amount,
        date: new Date().toLocaleString(),
        method: 'ePayco',
        recipient: paymentEpayco.recipient_name,
        alias: paymentEpayco.alias
      })
      
      // Limpiar URL sin recargar la página
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
    } else if (stalkerPayment === 'failed' && paymentEpayco) {
      console.log('Pago fallido detectado desde ePayco')
      setPaymentStatus('failed')
      
      // Limpiar URL sin recargar la página
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
    }
  }, [paymentEpayco])

  // Effect para detectar cuando se cierra el modal de ePayco (focus regresa a la ventana)
  useEffect(() => {
    let focusTimer: NodeJS.Timeout
    
    const handleFocus = () => {
      if (paymentEpayco && paymentStatus === null) {
        console.log('Ventana recuperó el foco, verificando estado del pago...')
        
        // Simular verificación del estado del pago (en producción sería una llamada al backend)
        focusTimer = setTimeout(() => {
          // Por ahora simularemos un pago exitoso
          // En producción, aquí harías una llamada al backend para verificar el estado real
          const success = Math.random() > 0.2 // 80% de éxito simulado
          
          if (success) {
            setPaymentStatus('success')
            setPaymentDetails({
              transactionId: `TXN-${Date.now()}`,
              amount: paymentEpayco.total_amount,
              date: new Date().toLocaleString(),
              method: 'ePayco',
              recipient: paymentEpayco.recipient_name,
              alias: paymentEpayco.alias
            })
          } else {
            setPaymentStatus('failed')
          }
        }, 2000) // Esperar 2 segundos para simular la verificación
      }
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      if (focusTimer) clearTimeout(focusTimer)
    }
  }, [paymentEpayco, paymentStatus])

  // Renderizar vista de introducción
  const renderIntroView = () => (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header con gradiente violeta */}
      <div className="text-center mb-8">
        <div className="inline-block bg-gradient-to-r from-[#81007F] to-[#81007F]/70 rounded-full px-6 py-2 mb-4">
          <h2 className="text-3xl font-bold text-white">#StalkerGift</h2>
        </div>
        <p className="text-gray-300 text-lg mb-6">
          Sorprende a esa persona con un regalo anónimo y crea una nueva conexión
        </p>
        <div className="bg-[#81007F]/20 border border-[#81007F]/50 rounded-2xl p-6 mb-8">
          <p className="text-[#81007F] font-semibold text-lg mb-2">
            🎁 ¿Qué es StalkerGift?
          </p>
          <p className="text-gray-300 leading-relaxed">
            Tu identidad permanecerá en secreto hasta que decidas compartirla. 
            Envía regalos de forma anónima y crea conexiones únicas con otros usuarios.
          </p>
        </div>
      </div>

      {/* Opciones de StalkerGift */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Opción 1: Para mí */}
        <div 
          onClick={() => setCurrentView('for-me')}
          className="group bg-gradient-to-br from-[#262626] to-[#81007F]/10 border-2 border-[#81007F]/30 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-[#81007F] hover:shadow-lg hover:shadow-[#81007F]/20 hover:scale-105"
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#81007F] to-[#FE9600] rounded-full flex items-center justify-center group-hover:animate-pulse">
              <span className="text-2xl">🛍️</span>
            </div>
            <h3 className="text-xl font-bold text-[#81007F] mb-2">Un Producto Para Mí</h3>
            <p className="text-gray-400 text-sm">
              Compra productos para ti mismo de forma privada
            </p>
          </div>
        </div>

        {/* Opción 2: Para usuario de Tanku */}
        <div 
          onClick={() => setCurrentView('for-tanku-user')}
          className="group bg-gradient-to-br from-[#262626] to-[#81007F]/10 border-2 border-[#81007F]/30 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-[#81007F] hover:shadow-lg hover:shadow-[#81007F]/20 hover:scale-105"
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#81007F] to-[#FE9600] rounded-full flex items-center justify-center group-hover:animate-pulse">
              <span className="text-2xl">🎁</span>
            </div>
            <h3 className="text-xl font-bold text-[#81007F] mb-2">Regalo Para Usuario Tanku</h3>
            <p className="text-gray-400 text-sm">
              Envía un regalo anónimo a alguien registrado en Tanku
            </p>
          </div>
        </div>

        {/* Opción 3: Para usuario externo */}
        <div 
          onClick={() => setCurrentView('for-external-user')}
          className="group bg-gradient-to-br from-[#262626] to-[#81007F]/10 border-2 border-[#81007F]/30 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-[#81007F] hover:shadow-lg hover:shadow-[#81007F]/20 hover:scale-105"
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#81007F] to-[#FE9600] rounded-full flex items-center justify-center group-hover:animate-pulse">
              <span className="text-2xl">📮</span>
            </div>
            <h3 className="text-xl font-bold text-[#81007F] mb-2">Regalo Para Usuario Externo</h3>
            <p className="text-gray-400 text-sm">
              Invita a alguien nuevo a Tanku con un regalo sorpresa
            </p>
          </div>
        </div>
      </div>

      {/* Mensaje de confianza */}
      <div className="mt-8 text-center">
        <p className="text-[#81007F]/80 text-sm font-medium">
          ✨ Tu identidad permanecerá en secreto hasta que decidas compartirla ✨
        </p>
      </div>
    </div>
  )

  // Renderizar vista "Para mí"
  const renderForMeView = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button 
          onClick={() => setCurrentView('intro')}
          className="flex items-center text-[#81007F] hover:text-[#FE9600] transition-colors duration-300"
        >
          <span className="mr-2">←</span> Volver a opciones
        </button>
      </div>
      
      <div className="bg-gradient-to-r from-[#81007F]/20 to-[#FE9600]/20 border border-[#81007F]/50 rounded-2xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-[#81007F] to-[#FE9600] rounded-full flex items-center justify-center">
          <span className="text-3xl">🛍️</span>
        </div>
        <h2 className="text-2xl font-bold text-[#81007F] mb-4">Un Producto Para Mí</h2>
        <p className="text-gray-300 text-lg mb-6">
          Aquí podrás comprar productos para ti mismo de forma completamente privada.
        </p>
        <div className="bg-[#262626]/50 rounded-xl p-6">
          <p className="text-gray-400">
            [MÓDULO EN DESARROLLO] - Esta sección permitirá navegar el catálogo de productos 
            y realizar compras privadas sin revelar tu identidad en el historial público.
          </p>
        </div>
      </div>
    </div>
  )

  // Renderizar vista "Para usuario de Tanku"
  const renderForTankuUserView = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button 
          onClick={() => setCurrentView('intro')}
          className="flex items-center text-[#81007F] hover:text-[#FE9600] transition-colors duration-300"
        >
          <span className="mr-2">←</span> Volver a opciones
        </button>
      </div>
      
      <div className="bg-gradient-to-r from-[#81007F]/20 to-[#FE9600]/20 border border-[#81007F]/50 rounded-2xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-[#81007F] to-[#FE9600] rounded-full flex items-center justify-center">
          <span className="text-3xl">🎁</span>
        </div>
        <h2 className="text-2xl font-bold text-[#81007F] mb-4">Regalo Para Usuario Tanku</h2>
        <p className="text-gray-300 text-lg mb-6">
          Sorprende a alguien especial que ya forma parte de la comunidad Tanku.
        </p>
        <div className="bg-[#262626]/50 rounded-xl p-6">
          <p className="text-gray-400">
            [MÓDULO EN DESARROLLO] - Aquí podrás buscar usuarios registrados, 
            seleccionar productos y enviar regalos anónimos que aparecerán en su perfil.
          </p>
        </div>
      </div>
    </div>
  )

  // Renderizar vista "Para usuario externo"
  const renderForExternalUserView = () => {
    const filledMethods = getFilledContactMethods()
    
    // Ya no necesitamos redefinir handleContactMethodChange porque ya lo tenemos del contexto

    const handleSubmit = async () => {
      if (validateForm()) {
        // Cargar productos y cambiar a vista de selección
        await loadProducts()
        setCurrentView('product-selection')
      }
    }

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button 
            onClick={() => setCurrentView('intro')}
            className="flex items-center text-[#81007F] hover:text-[#FE9600] transition-colors duration-300"
          >
            <span className="mr-2">←</span> Volver a opciones
          </button>
        </div>
        
        <div className="bg-gradient-to-r from-[#81007F]/10 to-[#FE9600]/10 border border-[#81007F]/30 rounded-2xl p-6 mb-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#81007F] to-[#FE9600] rounded-full flex items-center justify-center">
              <span className="text-2xl">📮</span>
            </div>
            <h2 className="text-2xl font-bold text-[#81007F] mb-2">Regalo Para Usuario Externo</h2>
            <p className="text-gray-300">
              Invita a alguien nuevo a descubrir Tanku con un regalo sorpresa
            </p>
          </div>

          {/* Formulario */}
          <div className="space-y-6">
            {/* Sección 1: Tu Alias (Modo Incógnito) */}
            <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#81007F]/20">
              <h3 className="text-lg font-semibold text-[#81007F] mb-4 flex items-center">
                <span className="mr-2">🎭</span> Tu Alias (Modo Incógnito)
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Elige un alias para mantener tu identidad en secreto
              </p>
              <input
                type="text"
                value={stalkerGiftData.alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Ej: Admirador Secreto, Amigo Anónimo..."
                className="w-full bg-[#262626] border border-[#81007F]/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#81007F] focus:outline-none transition-colors"
              />
            </div>

            {/* Sección 2: Datos de la Persona */}
            <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#81007F]/20">
              <h3 className="text-lg font-semibold text-[#81007F] mb-4 flex items-center">
                <span className="mr-2">👤</span> Datos de la Persona
              </h3>
              
              {/* Nombre */}
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={stalkerGiftData.recipient.name}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nombre de la persona"
                  className="w-full bg-[#262626] border border-[#81007F]/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#81007F] focus:outline-none transition-colors"
                />
              </div>

              {/* Métodos de Contacto */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Métodos de Contacto * 
                  <span className="text-[#FE9600] text-xs ml-2">
                    (Mínimo 1 requerido)
                  </span>
                </label>
                <div className="bg-[#81007F]/10 border border-[#81007F]/20 rounded-lg p-3 mb-4">
                  <p className="text-[#FEF580] text-xs font-medium flex items-center">
                    <span className="mr-2">💡</span>
                    Entre más datos de contacto proporciones, mayor será la posibilidad de que la persona reciba tu regalo
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {stalkerGiftData.recipient.contactMethods.map((method) => (
                    <div key={method.type} className="space-y-2">
                      <label className="flex items-center text-gray-300 text-sm font-medium mb-2">
                        <span className="mr-2">{getContactMethodIcon(method.type)}</span>
                        {getContactMethodLabel(method.type)}
                      </label>
                      <input
                        type="text"
                        value={method.value}
                        onChange={(e) => handleContactMethodChange(method.type, e.target.value)}
                        placeholder={getContactMethodPlaceholder(method.type)}
                        className="w-full bg-[#262626] border border-[#81007F]/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-[#81007F] focus:outline-none transition-colors text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Estado del Formulario */}
            <div className="bg-[#262626]/30 rounded-xl p-4 border border-[#81007F]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-400">
                    Métodos completados: 
                    <span className={`ml-1 font-semibold ${filledMethods.length >= 1 ? 'text-[#FEF580]' : 'text-[#E73230]'}`}>
                      {filledMethods.length}/5 
                      <span className="text-xs ml-1">
                        ({filledMethods.length >= 1 ? 'Válido' : 'Mín. 1'})
                      </span>
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Formulario: 
                    <span className={`ml-1 font-semibold ${isFormValid ? 'text-[#FEF580]' : 'text-[#E73230]'}`}>
                      {isFormValid ? 'Completo' : 'Incompleto'}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                    isFormValid
                      ? 'bg-gradient-to-r from-[#81007F] to-[#FE9600] text-white hover:scale-105 hover:shadow-lg hover:shadow-[#81007F]/30'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Continuar
                </button>
              </div>
            </div>

            {/* Mensaje motivacional adicional */}
            {filledMethods.length > 0 && filledMethods.length < 3 && (
              <div className="bg-gradient-to-r from-[#FE9600]/10 to-[#FEF580]/10 border border-[#FE9600]/30 rounded-xl p-4 mt-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎯</span>
                  <div>
                    <p className="text-[#FE9600] font-semibold text-sm">
                      ¡Aumenta tus posibilidades de éxito!
                    </p>
                    <p className="text-gray-300 text-xs mt-1">
                      Agregando más métodos de contacto, será más fácil localizar a la persona y entregar tu regalo sorpresa
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mensaje de Confianza */}
        <div className="text-center">
          <p className="text-[#81007F]/80 text-sm font-medium">
            🔒 Toda la información se mantendrá privada y segura
          </p>
        </div>
      </div>
    )
  }

  // Renderizar vista de selección de productos
  const renderProductSelectionView = () => {
    const filledMethods = getFilledContactMethods()
    
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <button 
            onClick={() => setCurrentView('for-external-user')}
            className="flex items-center text-[#81007F] hover:text-[#FE9600] transition-colors duration-300"
          >
            <span className="mr-2">←</span> Volver al formulario
          </button>
        </div>

        {/* Resumen de datos ingresados */}
        <div className="bg-gradient-to-r from-[#81007F]/10 to-[#FE9600]/10 border border-[#81007F]/30 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-[#81007F] mb-6 text-center">
            📋 Resumen de tu Regalo Anónimo
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Información del remitente */}
            <div className="bg-[#262626]/30 rounded-xl p-4 border border-[#81007F]/20">
              <h3 className="text-lg font-semibold text-[#81007F] mb-3 flex items-center">
                <span className="mr-2">🎭</span> Tu Alias
              </h3>
              <p className="text-gray-300">{stalkerGiftData.alias}</p>
            </div>

            {/* Información del destinatario */}
            <div className="bg-[#262626]/30 rounded-xl p-4 border border-[#81007F]/20">
              <h3 className="text-lg font-semibold text-[#81007F] mb-3 flex items-center">
                <span className="mr-2">👤</span> Destinatario
              </h3>
              <p className="text-gray-300 mb-2">{stalkerGiftData.recipient.name}</p>
              <div className="space-y-1">
                {filledMethods.map((method: ContactMethod) => (
                  <div key={method.type} className="flex items-center text-sm text-gray-400">
                    <span className="mr-2">{getContactMethodIcon(method.type)}</span>
                    <span className="mr-2">{getContactMethodLabel(method.type)}:</span>
                    <span>{method.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Selección de productos */}
        <div className="bg-gradient-to-r from-[#81007F]/10 to-[#FE9600]/10 border border-[#81007F]/30 rounded-2xl p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-[#81007F] mb-2">
              🎁 Selecciona los Productos para Regalar
            </h2>
            <p className="text-gray-300">
              Puedes seleccionar múltiples productos para crear el regalo perfecto
            </p>
            {stalkerGiftData.selectedProducts.length > 0 && (
              <p className="text-[#FEF580] text-sm mt-2">
                ✨ {stalkerGiftData.selectedProducts.length} producto(s) seleccionado(s)
              </p>
            )}
          </div>

          {/* Lista de productos */}
          {isLoadingProducts ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#81007F]"></div>
              <p className="text-gray-300 mt-4">Cargando productos...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`relative bg-[#262626]/30 border-2 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-105 ${
                    isProductSelected(product.id)
                      ? 'border-[#81007F] shadow-lg shadow-[#81007F]/20'
                      : 'border-[#81007F]/20 hover:border-[#81007F]/50'
                  }`}
                  onClick={() => toggleProductSelection(product)}
                >
                  {/* Checkbox */}
                  <div className="absolute top-2 right-2 z-10">
                    <input
                      type="checkbox"
                      checked={isProductSelected(product.id)}
                      onChange={() => toggleProductSelection(product)}
                      className="w-5 h-5 text-[#81007F] bg-[#262626] border-[#81007F]/30 rounded focus:ring-[#81007F] focus:ring-2"
                    />
                  </div>

                  {/* Imagen del producto */}
                  <div className="w-full h-32 sm:h-40 relative mb-3 overflow-hidden rounded-lg">
                    <Image
                      src={product.thumbnail || '/placeholder.png'}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Información del producto */}
                  <h3 className="text-sm sm:text-base font-semibold text-white mb-2 line-clamp-2">
                    {product.title}
                  </h3>

                  {/* Precio */}
                  <div className="text-sm sm:text-base font-bold text-[#81007F]">
                    {product.variants?.[0]?.inventory?.currency_code || '$'} {' '}
                    {product.variants?.[0]?.inventory?.price?.toLocaleString() || '0'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No se encontraron productos disponibles</p>
            </div>
          )}

          {/* Botón de continuar original */}
          {stalkerGiftData.selectedProducts.length > 0 && (
            <div ref={originalButtonRef} className="mt-8 text-center">
              <button
                onClick={handleProceedToCheckout}
                className="px-8 py-3 bg-gradient-to-r from-[#81007F] to-[#FE9600] text-white font-semibold rounded-lg hover:scale-105 hover:shadow-lg hover:shadow-[#81007F]/30 transition-all duration-300"
              >
                Continuar con el Envío ({stalkerGiftData.selectedProducts.length} productos)
              </button>
            </div>
          )}
        </div>

        {/* Mensaje de confianza */}
        <div className="mt-6 text-center">
          <p className="text-[#81007F]/80 text-sm font-medium">
            🔒 Tu identidad permanecerá en secreto hasta que decidas revelarla
          </p>
        </div>
      </div>
    )
  }

  // Renderizar vista de checkout
  const renderCheckoutView = () => {
    const filledMethods = getFilledContactMethods()
    const { subtotal, tax, shipping, total } = calculateTotals()
    const currency = stalkerGiftData.selectedProducts[0]?.variants?.[0]?.inventory?.currency_code || '$'
    
    console.log('=== RENDERIZANDO CHECKOUT ===')
    console.log('selectedPaymentMethod:', selectedPaymentMethod)
    console.log('paymentEpayco:', paymentEpayco)
    console.log('¿Mostrar sección ePayco?:', !!paymentEpayco)

    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <button 
            onClick={() => setCurrentView('product-selection')}
            className="flex items-center text-[#81007F] hover:text-[#FE9600] transition-colors duration-300"
          >
            <span className="mr-2">←</span> Volver a selección de productos
          </button>
        </div>

        <div className="bg-gradient-to-r from-[#81007F]/10 to-[#FE9600]/10 border border-[#81007F]/30 rounded-2xl p-6 mb-8">
          <h2 className="text-3xl font-bold text-[#81007F] mb-6 text-center">
            💳 Resumen de Compra - StalkerGift
          </h2>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Columna izquierda - Resumen del regalo */}
            <div className="space-y-6">
              {/* Información del regalo */}
              <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#81007F]/20">
                <h3 className="text-xl font-semibold text-[#81007F] mb-4 flex items-center">
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
              <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#81007F]/20">
                <h3 className="text-xl font-semibold text-[#81007F] mb-4 flex items-center">
                  <span className="mr-2">💌</span> Mensaje Personalizado
                </h3>
                
                <div className="space-y-3">
                  <label className="block text-gray-300 text-sm font-medium">
                    Escribe un mensaje para acompañar tu regalo
                    <span className="text-gray-500 text-xs ml-2">(Opcional)</span>
                  </label>
                  <textarea
                    value={stalkerGiftData.message || ''}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ejemplo: ¡Espero que disfrutes este regalo! Eres una persona muy especial..."
                    className="w-full bg-[#262626] border border-[#81007F]/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#81007F] focus:outline-none transition-colors resize-none"
                    rows={4}
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-gray-500 text-xs">
                      💡 Un mensaje personal hace que el regalo sea más especial
                    </p>
                    <p className="text-gray-400 text-xs">
                      {stalkerGiftData.message?.length || 0}/500
                    </p>
                  </div>
                </div>
              </div>

              {/* Productos seleccionados */}
              <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#81007F]/20">
                <h3 className="text-xl font-semibold text-[#81007F] mb-4 flex items-center">
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
                        <p className="text-[#81007F] font-bold">
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
              <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#81007F]/20 sticky top-6">
                <h3 className="text-xl font-semibold text-[#81007F] mb-6 flex items-center">
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
                        <span className="text-[#FEF580] text-xs">¡Envío gratis!</span>
                      )}
                    </div>
                    <span className="text-white font-medium">
                      {shipping === 0 ? 'Gratis' : `${currency} ${shipping.toLocaleString()}`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-4 border-t-2 border-[#81007F]/30">
                    <span className="text-xl font-bold text-white">Total</span>
                    <span className="text-2xl font-bold text-[#81007F]">{currency} {total.toLocaleString()}</span>
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
                          <span className="text-[#81007F]">{paymentDetails.alias}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-[#81007F]/20 rounded-lg">
                        <p className="text-[#FEF580] text-xs font-medium">
                          🎁 El regalo será enviado de forma anónima. Tu identidad permanecerá en secreto hasta que decidas revelarla.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {paymentStatus === 'failed' && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-red-500/20 to-red-600/20 border-2 border-red-500/50 rounded-xl">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-2xl">❌</span>
                      </div>
                      <h3 className="text-xl font-bold text-red-400 mb-2">Pago Fallido</h3>
                      <p className="text-red-300 text-sm mb-4">
                        Hubo un problema procesando tu pago
                      </p>
                      
                      <button
                        onClick={() => {
                          setPaymentStatus(null)
                          setPaymentDetails(null)
                          setPaymentEpayco(null)
                          setSelectedPaymentMethod("")
                        }}
                        className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        Intentar Nuevamente
                      </button>
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
                    <h4 className="text-lg font-semibold text-[#81007F] mb-4">Método de Pago</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 border border-[#81007F]/30 rounded-lg hover:border-[#81007F] transition-colors cursor-pointer"
                           onClick={() => handlePaymentMethodSelect("epayco")}>
                        <input
                          type="radio"
                          id="epayco-stalker"
                          name="payment-method-stalker"
                          value="epayco"
                          checked={selectedPaymentMethod === "epayco"}
                          onChange={() => handlePaymentMethodSelect("epayco")}
                          className="h-4 w-4 text-[#81007F] bg-[#262626] border-[#81007F]/30 rounded focus:ring-[#81007F] focus:ring-2"
                        />
                        <label htmlFor="epayco-stalker" className="text-white font-medium cursor-pointer">
                          ePayco - Pago Seguro
                        </label>
                      </div>
                    </div>
                    
                    {isProcessingPayment && (
                      <div className="mt-4 p-4 bg-[#81007F]/10 rounded-lg border border-[#81007F]/30">
                        <p className="text-[#FEF580] font-medium flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FEF580] mr-2"></div>
                          Procesando orden...
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Información adicional */}
                <div className="mt-4 p-4 bg-[#81007F]/10 rounded-lg">
                  <p className="text-[#FEF580] text-xs font-medium flex items-center">
                    <span className="mr-2">🔒</span>
                    Pago seguro • El regalo se enviará de forma anónima
                  </p>
                </div>

                {/* Sección de ePayco - Replicando exactamente el ejemplo que funciona */}
                {paymentEpayco && (
                  <>
                    {/* Cargamos el script de ePayco oculto cuando el componente se monta */}
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
                          
                          {/* Botón visible para el usuario */}
                          <div className="flex justify-center sm:justify-end">
                            <Button 
                              type="button"
                              id="epayco-custom-button-stalker"
                              className="w-full sm:w-auto bg-[#3B9BC3] hover:bg-[#66DEDB] hover:text-zinc-800 text-white p-2 sm:p-3 md:p-4 text-sm sm:text-base flex items-center justify-center gap-2 transition-colors"
                              onClick={() => {
                                console.log('=== INICIANDO PAGO STALKER GIFT ===');
                                console.log('paymentEpayco:', paymentEpayco);
                                console.log('window.ePayco:', window.ePayco);
                                
                                // Verificar si ePayco está cargado
                                if (typeof window.ePayco === 'undefined') {
                                  console.error('ePayco no está cargado correctamente');
                                  alert('Error al cargar el sistema de pago. Por favor, intente nuevamente.');
                                  return;
                                }
                                
                                try {
                                  // Crear y configurar el botón de ePayco de forma oculta
                                  const container = document.createElement('div');
                                  container.style.display = 'none';
                                  container.id = 'epayco-container-stalker';
                                  document.body.appendChild(container);
                                  
                                  console.log('Configurando handler de ePayco...');
                                  
                                  // Crear el botón de ePayco
                                  const handler = window.ePayco?.checkout.configure({
                                    key: 'a5bd3d6eaf8d072b2ad4265bd2dfaed9',
                                    test: true
                                  });
                                  
                                  console.log('Handler creado:', handler);
                                  
                                  if (!handler) {
                                    throw new Error('No se pudo configurar el checkout de ePayco');
                                  }
                                  
                                  // Abrir el checkout de ePayco
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
                  <div className="bg-gradient-to-r from-[#FEF580]/10 to-[#FE9600]/10 border border-[#FEF580]/30 rounded-2xl p-6 mt-6">
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">🎁</div>
                      <h3 className="text-2xl font-bold text-[#FEF580] mb-2">
                        ¡Orden Creada Exitosamente!
                      </h3>
                      <p className="text-gray-300 text-sm">
                        Tu StalkerGift ha sido creado. Comparte esta URL con el destinatario:
                      </p>
                    </div>

                    {/* URL de invitación */}
                    <div className="bg-[#262626]/50 rounded-xl p-4 border border-[#FEF580]/20 mb-4">
                      <label className="block text-[#FEF580] text-sm font-medium mb-2">
                        🔗 URL de Invitación:
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={createdOrder.invitationUrl}
                          readOnly
                          className="flex-1 bg-[#1E1E1E] border border-[#FEF580]/30 rounded-lg px-4 py-3 text-white text-sm focus:border-[#FEF580] focus:outline-none"
                        />
                        <button
                          onClick={() => copyToClipboard(createdOrder.invitationUrl)}
                          className="bg-gradient-to-r from-[#FEF580] to-[#FE9600] text-black px-4 py-3 rounded-lg font-semibold hover:scale-105 transition-transform flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copiar</span>
                        </button>
                      </div>
                    </div>

                    {/* Texto de invitación */}
                    <div className="bg-[#262626]/50 rounded-xl p-4 border border-[#FEF580]/20 mb-4">
                      <label className="block text-[#FEF580] text-sm font-medium mb-2">
                        💌 Texto de Invitación:
                      </label>
                      <textarea
                        value={createdOrder.invitationText}
                        readOnly
                        rows={8}
                        className="w-full bg-[#1E1E1E] border border-[#FEF580]/30 rounded-lg px-4 py-3 text-white text-sm focus:border-[#FEF580] focus:outline-none resize-none"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => copyToClipboard(createdOrder.invitationText)}
                          className="bg-gradient-to-r from-[#FEF580] to-[#FE9600] text-black px-4 py-2 rounded-lg font-semibold hover:scale-105 transition-transform flex items-center space-x-2 text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copiar Texto</span>
                        </button>
                      </div>
                    </div>

                    {/* Instrucciones */}
                    <div className="text-center">
                      <p className="text-gray-300 text-sm mb-2">
                        📱 Comparte la URL por WhatsApp, email o redes sociales
                      </p>
                      <p className="text-[#FE9600] text-xs font-medium">
                        ⏰ El destinatario tiene 3 días para reclamar su regalo
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje de confianza */}
        <div className="text-center">
          <p className="text-[#81007F]/80 text-sm font-medium">
            🎭 Tu identidad permanecerá en secreto hasta que decidas revelarla
          </p>
        </div>
      </div>
    )
  }

  // Renderizar vista según el estado actual
  return (
    <>
      {(() => {
        switch (currentView) {
          case 'for-me':
            return renderForMeView()
          case 'for-tanku-user':
            return renderForTankuUserView()
          case 'for-external-user':
            return renderForExternalUserView()
          case 'product-selection':
            return renderProductSelectionView()
          case 'checkout':
            return renderCheckoutView()
          default:
            return renderIntroView()
        }
      })()}

      {/* Botón flotante */}
      {isFloatingButtonVisible && (
        <div className="fixed bottom-6 right-[40%] z-50 animate-bounce">
          <button
            onClick={handleProceedToCheckout}
            className="px-6 py-3 bg-gradient-to-r from-[#81007F] to-[#FE9600] text-white font-semibold rounded-full shadow-2xl hover:scale-110 hover:shadow-[#81007F]/50 transition-all duration-300 flex items-center space-x-2"
          >
            <span>🛒</span>
            <span>Continuar ({stalkerGiftData.selectedProducts.length})</span>
          </button>
        </div>
      )}
    </>
  )
}
