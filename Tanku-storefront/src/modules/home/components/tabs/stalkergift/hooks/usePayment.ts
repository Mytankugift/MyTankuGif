"use client"

import { useState, useEffect } from "react"
import { retrieveCustomer } from "@lib/data/customer"
import { createStalkerGift, CreateStalkerGiftData, CreateStalkerGiftResponse } from "../../../actions/create-stalker-gift"
import { useStalkerGift } from "../../../../../../lib/context"

export function usePayment() {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [paymentEpayco, setPaymentEpayco] = useState<any>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<CreateStalkerGiftResponse | null>(null)
  const [showInvitationUrl, setShowInvitationUrl] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed' | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)

  const { stalkerGiftData, getFilledContactMethods } = useStalkerGift()

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

  // Función para procesar el pago
  const handlePayment = async () => {
    const userCustomer = await retrieveCustomer().catch(() => null)
    
    if (!userCustomer) {
      alert("Debe iniciar sesión para realizar el pago")
      return
    }

    if (selectedPaymentMethod === "epayco") {
      setIsProcessingPayment(true)
      try {
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

  // Función para seleccionar método de pago
  const handlePaymentMethodSelect = async (method: string) => {
    // Validar que el mensaje esté completo
    if (!stalkerGiftData.message?.trim()) {
      return
    }
    
    setSelectedPaymentMethod(method)
    
    // Si selecciona ePayco, crear la orden inmediatamente
    if (method === "epayco") {
      await handlePayment()
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

  // Effect para detectar el retorno del pago de ePayco
  useEffect(() => {
    // Detectar si el usuario regresa de ePayco
    const urlParams = new URLSearchParams(window.location.search)
    const stalkerPayment = urlParams.get('stalker_payment')
    
    if (stalkerPayment === 'success' && paymentEpayco) {
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

  return {
    selectedPaymentMethod,
    paymentEpayco,
    isProcessingPayment,
    createdOrder,
    showInvitationUrl,
    paymentStatus,
    paymentDetails,
    calculateTotals,
    handlePayment,
    handlePaymentMethodSelect,
    copyToClipboard,
    setPaymentEpayco
  }
}
