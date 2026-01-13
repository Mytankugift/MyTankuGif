'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { OrderDTO } from '@/types/api'

function CheckoutSuccessContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failed' | null>(null)
  const [refPayco, setRefPayco] = useState<string | null>(null)
  const [cartId, setCartId] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    // Obtener parámetros de la URL directamente desde window.location para evitar problemas de prerenderizado
    if (typeof window === 'undefined') return
    
    const urlParams = new URLSearchParams(window.location.search)
    const refPaycoParam = urlParams.get('ref_payco')
    const cartIdParam = urlParams.get('cartId')

    setRefPayco(refPaycoParam)
    setCartId(cartIdParam)

    if (refPaycoParam) {
      // Consultar el estado de la transacción usando ref_payco
      verifyPaymentStatus(refPaycoParam, cartIdParam)
    } else if (cartIdParam) {
      // Si no hay ref_payco, verificar por cartId
      checkOrderStatus(cartIdParam)
    } else {
      setIsLoading(false)
      setPaymentStatus('failed')
      setErrorMessage('No se encontraron parámetros de pago en la URL')
    }
  }, [])

  const verifyPaymentStatus = async (refPayco: string, cartId: string | null) => {
    try {
      console.log('[CHECKOUT-SUCCESS] Verificando pago con ref_payco:', refPayco)
      
      // PRIMERO: Intentar buscar la orden directamente por transactionId (ref_payco)
      // El ref_payco de ePayco es el mismo que x_transaction_id que se guarda en transactionId
      try {
        const orderResponse = await apiClient.get<OrderDTO>(API_ENDPOINTS.ORDERS.BY_TRANSACTION_ID(refPayco))
        if (orderResponse.success && orderResponse.data) {
          const order = orderResponse.data as OrderDTO
          console.log('[CHECKOUT-SUCCESS] Orden encontrada por transactionId:', order.id)
          setOrderId(order.id)
          
          if (order.paymentStatus === 'paid') {
            setPaymentStatus('success')
            setIsLoading(false)
            return
          } else if (order.paymentStatus === 'pending') {
            setPaymentStatus('pending')
            setIsLoading(false)
            return
          }
        }
      } catch (orderError) {
        console.log('[CHECKOUT-SUCCESS] No se encontró orden por transactionId, consultando ePayco...')
      }
      
      // SEGUNDO: Si no encontramos la orden, consultar estado en ePayco
      const response = await fetch(
        `https://secure.epayco.co/validation/v1/reference/${refPayco}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Error al consultar el estado del pago en ePayco')
      }

      const data = await response.json()
      console.log('[CHECKOUT-SUCCESS] Datos de ePayco:', data)

      // ✅ Extraer transaction_id de la respuesta de ePayco (x_transaction_id es el que se guarda)
      // El ref_payco es diferente, necesitamos usar x_transaction_id para buscar
      const transactionId = data.data?.x_transaction_id || data.x_transaction_id
      
      if (!transactionId) {
        console.warn('[CHECKOUT-SUCCESS] No se encontró x_transaction_id, usando ref_payco como fallback')
        // Fallback: si no hay x_transaction_id, usar ref_payco (pero esto no debería pasar)
      }
      
      // Mapear estado de ePayco
      const epaycoResponse = data.data?.x_response || data.x_response
      
      // ✅ Mapear estados de ePayco correctamente
      if (epaycoResponse === 'Aceptada' || epaycoResponse === 'Aprobada' || epaycoResponse === '1') {
        // Intentar buscar la orden por transactionId
        try {
          const orderResponse = await apiClient.get<OrderDTO>(API_ENDPOINTS.ORDERS.BY_TRANSACTION_ID(transactionId))
          if (orderResponse.success && orderResponse.data) {
            const order = orderResponse.data as OrderDTO
            setOrderId(order.id)
            setPaymentStatus('success')
            setIsLoading(false)
            return
          }
        } catch (orderError) {
          console.log('[CHECKOUT-SUCCESS] Orden aún no creada, esperando webhook...')
        }
        
        // Si no encontramos la orden, puede que el webhook aún no haya procesado
        // Esperar un poco y reintentar
        setPaymentStatus('pending')
        setErrorMessage('El pago fue exitoso. La orden está siendo procesada...')
        
        // Reintentar después de 3 segundos
        setTimeout(async () => {
          try {
            const orderResponse = await apiClient.get<OrderDTO>(API_ENDPOINTS.ORDERS.BY_TRANSACTION_ID(transactionId))
            if (orderResponse.success && orderResponse.data) {
              const order = orderResponse.data as OrderDTO
              setOrderId(order.id)
              setPaymentStatus('success')
              setErrorMessage(null)
            }
          } catch (error) {
            console.log('[CHECKOUT-SUCCESS] Orden aún no disponible')
          }
        }, 3000)
        
      } else if (epaycoResponse === 'Pendiente' || epaycoResponse === '2') {
        setPaymentStatus('pending')
        setErrorMessage('El pago está pendiente de confirmación')
      } else if (epaycoResponse === 'Rechazada' || epaycoResponse === 'Rechazado' || epaycoResponse === 'Fallida' || epaycoResponse === '3' || epaycoResponse === '4') {
        // ✅ Manejar pagos rechazados correctamente
        setPaymentStatus('failed')
        setErrorMessage(data.data?.x_response_reason_text || data.x_response_reason_text || 'El pago fue rechazado')
      } else {
        // Estado desconocido - tratar como fallido
        setPaymentStatus('failed')
        setErrorMessage(data.data?.x_response_reason_text || data.x_response_reason_text || `El pago no fue exitoso. Estado: ${epaycoResponse}`)
      }
    } catch (error) {
      console.error('[CHECKOUT-SUCCESS] Error verificando pago:', error)
      setPaymentStatus('pending')
      setErrorMessage('No se pudo verificar el estado del pago. Por favor, verifica más tarde.')
    } finally {
      setIsLoading(false)
    }
  }

  const checkOrderStatus = async (cartIdToCheck: string) => {
    try {
      console.log('[CHECKOUT-SUCCESS] Verificando orden por cartId:', cartIdToCheck)
      
      // Intentar buscar la orden que tenga este cartId en su metadata
      // Primero, intentar obtener todas las órdenes del usuario y buscar por cartId
      const response = await apiClient.get<{ orders: OrderDTO[]; total: number; hasMore: boolean } | OrderDTO[]>(API_ENDPOINTS.ORDERS.LIST)
      
      if (response.success && response.data) {
        const orders = Array.isArray(response.data) 
          ? response.data 
          : (response.data as { orders: OrderDTO[] }).orders || []
        
        // Buscar orden que tenga el cartId en metadata o que coincida
        const order = orders.find((o: any) => {
          return o.metadata?.cartId === cartIdToCheck || 
                 o.cartId === cartIdToCheck ||
                 o.id === cartIdToCheck
        })

        if (order) {
          setOrderId(order.id)
          if (order.paymentStatus === 'paid') {
            setPaymentStatus('success')
          } else if (order.paymentStatus === 'pending') {
            setPaymentStatus('pending')
          } else {
            setPaymentStatus('failed')
          }
          return
        }
      }

      // Si no encontramos la orden, puede estar pendiente (el webhook aún no procesó)
      // O puede que el cartId sea en realidad un orderId
      try {
        const orderResponse = await apiClient.get<OrderDTO>(API_ENDPOINTS.ORDERS.BY_ID(cartIdToCheck))
        if (orderResponse.success && orderResponse.data) {
          const order = orderResponse.data as OrderDTO
          setOrderId(order.id)
          if (order.paymentStatus === 'paid') {
            setPaymentStatus('success')
          } else if (order.paymentStatus === 'pending') {
            setPaymentStatus('pending')
          } else {
            setPaymentStatus('failed')
          }
          return
        }
      } catch (orderError) {
        console.log('[CHECKOUT-SUCCESS] No se encontró orden con ese ID')
      }

      // Si no encontramos la orden, puede estar pendiente
      setPaymentStatus('pending')
      setErrorMessage('La orden está siendo procesada. Te notificaremos cuando esté lista.')
    } catch (error: any) {
      console.error('[CHECKOUT-SUCCESS] Error verificando orden:', error)
      setPaymentStatus('pending')
      setErrorMessage('No se pudo verificar el estado de la orden. Por favor, verifica más tarde.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66DEDB] mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando estado del pago...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {paymentStatus === 'success' && (
          <div className="bg-gray-800/50 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#66DEDB] mb-2">
              ¡Pago exitoso!
            </h1>
            <p className="text-gray-300 mb-6">
              Tu pago ha sido procesado correctamente. Tu orden está siendo procesada.
            </p>
            {refPayco && (
              <p className="text-sm text-gray-400 mb-2">
                Referencia de pago: <span className="font-mono text-[#66DEDB]">{refPayco}</span>
              </p>
            )}
            {orderId && (
              <p className="text-sm text-gray-400 mb-6">
                ID de orden: <span className="font-mono text-[#66DEDB]">{orderId}</span>
              </p>
            )}
            <div className="flex gap-4 justify-center">
              {orderId && (
                <Link href={`/profile?tab=MIS_COMPRAS&orderId=${orderId}`}>
                  <Button className="bg-[#66DEDB] hover:bg-[#5accc9] text-black">
                    Ver mi pedido
                  </Button>
                </Link>
              )}
              <Link href="/profile?tab=MIS_COMPRAS">
                <Button className="bg-[#66DEDB] hover:bg-[#5accc9] text-black">
                  Ver mis pedidos
                </Button>
              </Link>
              <Link href="/">
                <Button variant="secondary">Volver al inicio</Button>
              </Link>
            </div>
          </div>
        )}

        {paymentStatus === 'pending' && (
          <div className="bg-gray-800/50 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-yellow-400 mb-2">
              Pago pendiente
            </h1>
            <p className="text-gray-300 mb-6">
              {errorMessage || 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.'}
            </p>
            {refPayco && (
              <p className="text-sm text-gray-400 mb-2">
                Referencia de pago: <span className="font-mono text-[#66DEDB]">{refPayco}</span>
              </p>
            )}
            {cartId && (
              <p className="text-sm text-gray-400 mb-6">
                ID de carrito: <span className="font-mono text-[#66DEDB]">{cartId}</span>
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <Link href="/profile?tab=MIS_COMPRAS">
                <Button className="bg-[#66DEDB] hover:bg-[#5accc9] text-black">
                  Ver mis pedidos
                </Button>
              </Link>
              <Link href="/">
                <Button variant="secondary">Volver al inicio</Button>
              </Link>
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="bg-gray-800/50 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-red-400 mb-2">
              Pago no procesado
            </h1>
            <p className="text-gray-300 mb-6">
              {errorMessage || 'Hubo un problema al procesar tu pago. Por favor, intenta nuevamente.'}
            </p>
            {refPayco && (
              <p className="text-sm text-gray-400 mb-2">
                Referencia de pago: <span className="font-mono text-gray-500">{refPayco}</span>
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <Link href="/checkout">
                <Button className="bg-[#66DEDB] hover:bg-[#5accc9] text-black">
                  Intentar nuevamente
                </Button>
              </Link>
              <Link href="/cart">
                <Button variant="secondary">Volver al carrito</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66DEDB] mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando...</p>
          </div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}

