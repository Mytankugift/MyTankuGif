'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { OrderDTO } from '@/types/api'

const PAID_STATUSES = new Set(['paid', 'captured'])
const PENDING_PAYMENT_STATUSES = new Set(['awaiting', 'pending', 'not_paid'])
const FAILED_PAYMENT_STATUSES = new Set(['cancelled', 'failed', 'declined'])

function isNumericEpaycoRef(value: string): boolean {
  return /^\d+$/.test(value.trim())
}

function applyOrderResult(
  order: OrderDTO,
  setters: {
    setOrderId: (v: string) => void
    setOrderRef: (v: string | null) => void
    setPaymentStatus: (v: 'success' | 'pending' | 'failed') => void
    setErrorMessage: (v: string | null) => void
    setIsLoading: (v: boolean) => void
  }
): 'paid' | 'pending' | 'failed' {
  setters.setOrderId(order.id)
  setters.setOrderRef(order.ref ?? null)

  if (PAID_STATUSES.has(order.paymentStatus)) {
    setters.setPaymentStatus('success')
    setters.setErrorMessage(null)
    setters.setIsLoading(false)
    return 'paid'
  }

  if (FAILED_PAYMENT_STATUSES.has(order.paymentStatus)) {
    setters.setPaymentStatus('failed')
    setters.setErrorMessage('El pago no fue confirmado. Revisa tu método de pago o intenta de nuevo.')
    setters.setIsLoading(false)
    return 'failed'
  }

  if (PENDING_PAYMENT_STATUSES.has(order.paymentStatus)) {
    return 'pending'
  }

  return 'pending'
}

function CheckoutSuccessContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failed' | null>(null)
  const [refPayco, setRefPayco] = useState<string | null>(null)
  const [cartId, setCartId] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderRef, setOrderRef] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    const refPaycoParam = urlParams.get('ref_payco')
    const cartIdParam = urlParams.get('cartId')
    const orderIdParam = urlParams.get('orderId')
    const orderRefParam = urlParams.get('orderRef')

    if (orderIdParam && !refPaycoParam && !orderRefParam && !cartIdParam) {
      router.push(`/profile?tab=MIS_TANKUS&orderId=${orderIdParam}`)
      return
    }

    setRefPayco(refPaycoParam)
    setCartId(cartIdParam)

    const setters = {
      setOrderId,
      setOrderRef,
      setPaymentStatus,
      setErrorMessage,
      setIsLoading,
    }

    const tankuOrderKey = orderRefParam || orderIdParam

    if (tankuOrderKey) {
      void pollOrderByKey(tankuOrderKey, setters)
      return
    }

    if (cartIdParam) {
      void pollOrderByCartId(cartIdParam, setters)
      return
    }

    if (refPaycoParam && isNumericEpaycoRef(refPaycoParam)) {
      void verifyViaEpaycoApi(refPaycoParam, setters)
      return
    }

    if (refPaycoParam) {
      setPaymentStatus('pending')
      setErrorMessage(
        'Tu pago está siendo confirmado. Revisa Mis pedidos en unos momentos.'
      )
      setIsLoading(false)
      return
    }

    router.push('/profile?tab=MIS_TANKUS')
  }, [router])

  const pollOrderByKey = async (
    orderKey: string,
    setters: Parameters<typeof applyOrderResult>[1],
    retryCount = 0
  ) => {
    try {
      const orderResponse = await apiClient.get<OrderDTO>(API_ENDPOINTS.ORDERS.BY_ID(orderKey))

      if (orderResponse.success && orderResponse.data) {
        const result = applyOrderResult(orderResponse.data as OrderDTO, setters)
        if (result === 'pending' && retryCount < 15) {
          setPaymentStatus('pending')
          setErrorMessage('Confirmando tu pago…')
          setTimeout(() => pollOrderByKey(orderKey, setters, retryCount + 1), 2000)
        } else if (result === 'pending') {
          setPaymentStatus('pending')
          setErrorMessage(
            'El pago puede estar en proceso. Revisa Mis pedidos en unos minutos.'
          )
          setIsLoading(false)
        }
        return
      }
    } catch {
      // reintentar
    }

    if (retryCount < 15) {
      setPaymentStatus('pending')
      setErrorMessage('Confirmando tu pago…')
      setTimeout(() => pollOrderByKey(orderKey, setters, retryCount + 1), 2000)
    } else {
      setPaymentStatus('pending')
      setErrorMessage('No pudimos confirmar el pago aún. Revisa Mis pedidos.')
      setIsLoading(false)
    }
  }

  const pollOrderByCartId = async (
    cartIdToCheck: string,
    setters: Parameters<typeof applyOrderResult>[1],
    retryCount = 0
  ) => {
    try {
      const listResponse = await apiClient.get<
        { orders: OrderDTO[]; total: number; hasMore: boolean } | OrderDTO[]
      >(API_ENDPOINTS.ORDERS.LIST)

      if (listResponse.success && listResponse.data) {
        const orders = Array.isArray(listResponse.data)
          ? listResponse.data
          : listResponse.data.orders || []

        const order = orders.find((o: OrderDTO) => {
          const meta = o.metadata as Record<string, unknown> | undefined
          return meta?.cartId === cartIdToCheck || o.id === cartIdToCheck
        })

        if (order) {
          const result = applyOrderResult(order, setters)
          if (result === 'pending' && retryCount < 15) {
            setPaymentStatus('pending')
            setErrorMessage('Confirmando tu pago…')
            setTimeout(() => pollOrderByCartId(cartIdToCheck, setters, retryCount + 1), 2000)
          } else if (result === 'pending') {
            setPaymentStatus('pending')
            setErrorMessage('El pago puede estar en proceso. Revisa Mis pedidos.')
            setIsLoading(false)
          }
          return
        }
      }
    } catch {
      // reintentar
    }

    if (retryCount < 15) {
      setPaymentStatus('pending')
      setErrorMessage('Procesando tu pedido…')
      setTimeout(() => pollOrderByCartId(cartIdToCheck, setters, retryCount + 1), 2000)
    } else {
      setPaymentStatus('pending')
      setErrorMessage('Tu pedido está tardando en confirmarse. Revisa Mis pedidos.')
      setIsLoading(false)
    }
  }

  const verifyViaEpaycoApi = async (
    epaycoRef: string,
    setters: Parameters<typeof applyOrderResult>[1]
  ) => {
    try {
      const response = await fetch(
        `https://secure.epayco.co/validation/v1/reference/${epaycoRef}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      )

      if (!response.ok) {
        throw new Error('Error al consultar ePayco')
      }

      const data = await response.json()
      const transactionId = data.data?.x_transaction_id || data.x_transaction_id
      const epaycoResponse = data.data?.x_response || data.x_response
      const isSuccess =
        epaycoResponse === 'Aceptada' ||
        epaycoResponse === 'Aprobada' ||
        epaycoResponse === '1'

      if (!isSuccess) {
        setPaymentStatus('failed')
        setErrorMessage(
          data.data?.x_response_reason_text ||
            data.x_response_reason_text ||
            'El pago no fue exitoso en ePayco'
        )
        setIsLoading(false)
        return
      }

      if (transactionId) {
        await pollOrderByTransactionId(String(transactionId), setters)
      } else {
        setPaymentStatus('success')
        setErrorMessage(null)
        setIsLoading(false)
      }
    } catch {
      setPaymentStatus('pending')
      setErrorMessage('No se pudo verificar el pago. Revisa Mis pedidos.')
      setIsLoading(false)
    }
  }

  const pollOrderByTransactionId = async (
    transactionId: string,
    setters: Parameters<typeof applyOrderResult>[1],
    retryCount = 0
  ) => {
    try {
      const orderResponse = await apiClient.get<OrderDTO>(
        API_ENDPOINTS.ORDERS.BY_TRANSACTION_ID(transactionId)
      )

      if (orderResponse.success && orderResponse.data) {
        const result = applyOrderResult(orderResponse.data as OrderDTO, setters)
        if (result === 'pending' && retryCount < 10) {
          setTimeout(() => pollOrderByTransactionId(transactionId, setters, retryCount + 1), 3000)
        } else if (result === 'pending') {
          setPaymentStatus('success')
          setErrorMessage(null)
          setIsLoading(false)
        }
        return
      }
    } catch {
      // reintentar
    }

    if (retryCount < 10) {
      setTimeout(() => pollOrderByTransactionId(transactionId, setters, retryCount + 1), 3000)
    } else {
      setPaymentStatus('success')
      setErrorMessage(null)
      setIsLoading(false)
    }
  }

  const orderProfileQuery = orderRef
    ? `orderId=${encodeURIComponent(orderRef)}`
    : orderId
      ? `orderId=${encodeURIComponent(orderId)}`
      : ''

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
              ¡Pago aprobado!
            </h1>
            <p className="text-gray-300 mb-6">
              Tu pago fue confirmado correctamente. Estamos preparando tu pedido.
            </p>
            {orderRef && (
              <p className="text-sm text-gray-400 mb-2">
                Pedido:{' '}
                <span className="font-mono text-[#66DEDB]">{orderRef}</span>
              </p>
            )}
            {refPayco && isNumericEpaycoRef(refPayco) && (
              <p className="text-sm text-gray-400 mb-2">
                Referencia ePayco:{' '}
                <span className="font-mono text-[#66DEDB]">{refPayco}</span>
              </p>
            )}
            <div className="flex gap-4 justify-center flex-wrap">
              {orderProfileQuery && (
                <Link href={`/profile?tab=MIS_TANKUS&${orderProfileQuery}`}>
                  <Button className="bg-[#66DEDB] hover:bg-[#5accc9] text-black">
                    Ver mi pedido
                  </Button>
                </Link>
              )}
              <Link href="/profile?tab=MIS_TANKUS">
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
            <h1 className="text-3xl font-bold text-yellow-400 mb-2">Confirmando pago</h1>
            <p className="text-gray-300 mb-6">
              {errorMessage || 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.'}
            </p>
            {orderRef && (
              <p className="text-sm text-gray-400 mb-2">
                Pedido: <span className="font-mono text-[#66DEDB]">{orderRef}</span>
              </p>
            )}
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/profile?tab=MIS_TANKUS">
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
            <h1 className="text-3xl font-bold text-red-400 mb-2">Pago no procesado</h1>
            <p className="text-gray-300 mb-6">
              {errorMessage || 'Hubo un problema al procesar tu pago. Por favor, intenta nuevamente.'}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
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
