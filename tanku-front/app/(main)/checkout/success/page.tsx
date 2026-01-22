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
    const orderIdParam = urlParams.get('orderId')

    setRefPayco(refPaycoParam)
    setCartId(cartIdParam)

    if (orderIdParam) {
      // ✅ Caso de contraentrega: buscar orden directamente por orderId
      checkOrderByOrderId(orderIdParam)
    } else if (refPaycoParam) {
      // Consultar el estado de la transacción usando ref_payco (ePayco)
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
      
      // PASO 1: Verificar primero que el pago de Epayco fue exitoso
      console.log('[CHECKOUT-SUCCESS] PASO 1: Verificando estado del pago en Epayco...')
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

      // Extraer transaction_id de la respuesta de ePayco
      const transactionId = data.data?.x_transaction_id || data.x_transaction_id
      const epaycoResponse = data.data?.x_response || data.x_response
      
      // Verificar que el pago de Epayco fue exitoso
      const isEpaycoSuccess = epaycoResponse === 'Aceptada' || epaycoResponse === 'Aprobada' || epaycoResponse === '1'
      
      if (!isEpaycoSuccess) {
        // El pago de Epayco NO fue exitoso
        if (epaycoResponse === 'Pendiente' || epaycoResponse === '2') {
          setPaymentStatus('pending')
          setErrorMessage('El pago está pendiente de confirmación en Epayco')
        } else if (epaycoResponse === 'Rechazada' || epaycoResponse === 'Rechazado' || epaycoResponse === 'Fallida' || epaycoResponse === '3' || epaycoResponse === '4') {
          setPaymentStatus('failed')
          setErrorMessage(data.data?.x_response_reason_text || data.x_response_reason_text || 'El pago fue rechazado en Epayco')
        } else {
          setPaymentStatus('failed')
          setErrorMessage(data.data?.x_response_reason_text || data.x_response_reason_text || `El pago no fue exitoso en Epayco. Estado: ${epaycoResponse}`)
        }
        setIsLoading(false)
        return
      }
      
      // ✅ PASO 1 COMPLETADO: El pago de Epayco fue exitoso
      console.log('[CHECKOUT-SUCCESS] ✅ PASO 1 COMPLETADO: Pago de Epayco exitoso')
      
      // PASO 2: Verificar que la orden existe y que Dropi fue exitoso
      console.log('[CHECKOUT-SUCCESS] PASO 2: Verificando orden y estado de Dropi...')
      
      const verifyDropiStatus = async (txId: string, retryCount = 0): Promise<void> => {
        try {
          const orderResponse = await apiClient.get<OrderDTO>(API_ENDPOINTS.ORDERS.BY_TRANSACTION_ID(txId))
          
          if (orderResponse.success && orderResponse.data) {
            const order = orderResponse.data as OrderDTO
            console.log('[CHECKOUT-SUCCESS] Orden encontrada:', order.id)
            setOrderId(order.id)
            
            // Verificar que Dropi fue exitoso
            const metadata = order.metadata || {}
            const dropiOrderIds = metadata.dropi_order_ids || []
            
            if (dropiOrderIds.length > 0) {
              // ✅ PASO 2 COMPLETADO: Dropi también fue exitoso
              console.log('[CHECKOUT-SUCCESS] ✅ PASO 2 COMPLETADO: Dropi exitoso, dropiOrderIds:', dropiOrderIds)
              setPaymentStatus('success')
              setErrorMessage(null)
              setIsLoading(false)
            } else {
              // Pago de Epayco exitoso pero Dropi pendiente
              console.log('[CHECKOUT-SUCCESS] ⏳ Dropi pendiente, reintentando... (intento', retryCount + 1, ')')
              setPaymentStatus('pending')
              setErrorMessage('El pago fue exitoso en Epayco. La orden está siendo procesada en Dropi...')
              
              // Reintentar después de 3 segundos (máximo 10 intentos)
              if (retryCount < 10) {
                setTimeout(() => {
                  verifyDropiStatus(txId, retryCount + 1)
                }, 3000)
              } else {
                setErrorMessage('El pago fue exitoso en Epayco, pero la orden en Dropi está tardando más de lo esperado. Por favor, verifica más tarde.')
                setIsLoading(false)
              }
            }
          } else {
            // Orden aún no creada, esperar un poco
            if (retryCount < 10) {
              console.log('[CHECKOUT-SUCCESS] ⏳ Orden aún no creada, esperando webhook... (intento', retryCount + 1, ')')
              setPaymentStatus('pending')
              setErrorMessage('El pago fue exitoso en Epayco. La orden está siendo procesada...')
              
              setTimeout(() => {
                verifyDropiStatus(txId, retryCount + 1)
              }, 3000)
            } else {
              setErrorMessage('El pago fue exitoso en Epayco, pero la orden está tardando en crearse. Por favor, verifica más tarde.')
              setIsLoading(false)
            }
          }
        } catch (orderError: any) {
          console.log('[CHECKOUT-SUCCESS] Error buscando orden:', orderError?.message)
          
          if (retryCount < 10) {
            setTimeout(() => {
              verifyDropiStatus(txId, retryCount + 1)
            }, 3000)
          } else {
            setErrorMessage('El pago fue exitoso en Epayco, pero no se pudo verificar la orden. Por favor, verifica más tarde.')
            setIsLoading(false)
          }
        }
      }
      
      // Iniciar verificación de Dropi
      if (transactionId) {
        await verifyDropiStatus(transactionId)
      } else {
        // Si no hay transactionId, intentar con refPayco como fallback
        console.warn('[CHECKOUT-SUCCESS] No se encontró x_transaction_id, usando ref_payco como fallback')
        await verifyDropiStatus(refPayco)
      }
      
    } catch (error) {
      console.error('[CHECKOUT-SUCCESS] Error verificando pago:', error)
      setPaymentStatus('pending')
      setErrorMessage('No se pudo verificar el estado del pago. Por favor, verifica más tarde.')
      setIsLoading(false)
    }
  }

  const checkOrderByOrderId = async (orderIdToCheck: string) => {
    try {
      console.log('[CHECKOUT-SUCCESS] Verificando orden por orderId:', orderIdToCheck)
      
      const orderResponse = await apiClient.get<OrderDTO>(API_ENDPOINTS.ORDERS.BY_ID(orderIdToCheck))
      
      if (orderResponse.success && orderResponse.data) {
        const order = orderResponse.data as OrderDTO
        setOrderId(order.id)
        
        // Verificar si es contra entrega y tiene dropiOrderIds
        if (order.paymentMethod === 'cash_on_delivery') {
          const metadata = order.metadata as Record<string, any> || {}
          const dropiOrderIds = metadata.dropi_order_ids || []
          
          if (dropiOrderIds.length > 0) {
            // Dropi exitoso - mostrar success
            setPaymentStatus('success')
            setErrorMessage(null)
          } else {
            // Dropi pendiente o falló - mostrar pending y reintentar
            setPaymentStatus('pending')
            setErrorMessage('La orden está siendo procesada en Dropi. Te notificaremos cuando esté lista.')
            
            // Reintentar después de 3 segundos
            setTimeout(() => {
              checkOrderByOrderId(orderIdToCheck)
            }, 3000)
          }
          return
        }
        
        // Para otros métodos de pago (Epayco)
        if (order.paymentStatus === 'paid') {
          // Verificar también que Dropi fue exitoso
          const metadata = order.metadata as Record<string, any> || {}
          const dropiOrderIds = metadata.dropi_order_ids || []
          
          if (dropiOrderIds.length > 0) {
            setPaymentStatus('success')
          } else {
            // Pago exitoso pero Dropi pendiente
            setPaymentStatus('pending')
            setErrorMessage('El pago fue exitoso. La orden está siendo procesada en Dropi...')
            
            // Reintentar después de 3 segundos
            setTimeout(() => {
              checkOrderByOrderId(orderIdToCheck)
            }, 3000)
          }
        } else if (order.paymentStatus === 'pending') {
          setPaymentStatus('pending')
        } else {
          setPaymentStatus('failed')
        }
        return
      }

      // Si no encontramos la orden
      setPaymentStatus('failed')
      setErrorMessage('No se encontró la orden')
    } catch (error: any) {
      console.error('[CHECKOUT-SUCCESS] Error verificando orden por orderId:', error)
      setPaymentStatus('pending')
      setErrorMessage('No se pudo verificar el estado de la orden. Por favor, verifica más tarde.')
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
              ¡Orden creada exitosamente!
            </h1>
            <p className="text-gray-300 mb-6">
              {orderId && !refPayco 
                ? 'Tu orden ha sido creada correctamente. El pago se realizará al momento de la entrega (contraentrega).'
                : 'Tu pago ha sido procesado correctamente. Tu orden está siendo procesada.'}
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

