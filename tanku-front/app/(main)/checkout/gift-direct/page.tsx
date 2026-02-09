'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import Script from 'next/script'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import type { ProductDTO } from '@/types/api'

// Declaración para TypeScript para el objeto ePayco en window
declare global {
  interface Window {
    ePayco?: {
      checkout: {
        configure: (config: { key: string; test: boolean }) => {
          open: (options: {
            amount: number
            name: string
            description: string
            currency: string
            country: string
            external: boolean
            response: string
            confirmation: string
            name_billing: string
            mobilephone_billing: string
          }) => void
        }
      }
    }
  }
}

// Componente interno que usa useSearchParams
function GiftDirectCheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuthStore()
  
  const variantId = searchParams.get('variantId')
  const recipientId = searchParams.get('recipientId')
  const quantityParam = searchParams.get('quantity')
  const quantity = quantityParam ? parseInt(quantityParam) : 1
  
  const [email, setEmail] = useState(user?.email || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productInfo, setProductInfo] = useState<any>(null)
  const [recipientInfo, setRecipientInfo] = useState<any>(null)
  const [epaycoReady, setEpaycoReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Validar parámetros y cargar datos
  useEffect(() => {
    if (!variantId || !recipientId) {
      setError('Faltan parámetros requeridos')
      setIsLoading(false)
      return
    }

    if (!isAuthenticated) {
      const redirectUrl = `/checkout/gift-direct?variantId=${variantId}&recipientId=${recipientId}&quantity=${quantity}`
      sessionStorage.setItem('redirect-after-login', redirectUrl)
      router.push('/feed')
      return
    }

    loadProductAndRecipientInfo()
  }, [variantId, recipientId, quantity, isAuthenticated])

  const loadProductAndRecipientInfo = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Cargar información del destinatario
      if (recipientId) {
        const recipientResponse = await apiClient.get(API_ENDPOINTS.USERS.BY_ID(recipientId))
        if (recipientResponse.success && recipientResponse.data) {
          const user = recipientResponse.data.user || recipientResponse.data
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
          setRecipientInfo({
            id: user.id,
            name: fullName || user.username || 'Usuario',
            username: user.username,
            avatar: user.profile?.avatar || user.avatar || null,
          })
        }
      }

      // La información del producto se obtendrá cuando se cree la orden
      // Por ahora, solo mostramos un placeholder
      // El precio se calculará en el backend
    } catch (err: any) {
      console.error('Error cargando información:', err)
      setError(err.message || 'Error al cargar la información')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError('El email es requerido')
      return
    }

    if (!variantId || !recipientId) {
      setError('Faltan parámetros requeridos')
      return
    }

    setIsSubmitting(true)

    try {
      // Llamar al nuevo endpoint directo (sin carrito)
      const response = await apiClient.post(API_ENDPOINTS.CHECKOUT.GIFT_DIRECT, {
        variant_id: variantId,
        quantity,
        recipient_id: recipientId,
        email,
        payment_method: 'epayco',
      })

      if (response.success && response.data) {
        // Guardar información del producto desde la respuesta
        if (response.data.productInfo) {
          setProductInfo(response.data.productInfo)
          setTotal(response.data.total)
        }
        
        // Si es Epayco, abrir pasarela de pago
        if (response.data.orderId) {
          await openEpaycoCheckout(response.data)
        }
      } else {
        setError(response.error?.message || 'Error al procesar el regalo')
      }
    } catch (err: any) {
      console.error('Error procesando regalo:', err)
      setError(err.message || 'Error al procesar el regalo')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEpaycoCheckout = async (orderData: any) => {
    try {
      // Verificar que Epayco esté cargado
      if (typeof window.ePayco === 'undefined') {
        throw new Error('ePayco no está cargado. Por favor, recarga la página.')
      }

      // Crear contenedor para Epayco
      const container = document.createElement('div')
      container.style.display = 'none'
      container.id = 'epayco-container'
      document.body.appendChild(container)

      // Configurar Epayco
      const epaycoKey = process.env.NEXT_PUBLIC_EPAYCO_KEY
      if (!epaycoKey) {
        throw new Error('NEXT_PUBLIC_EPAYCO_KEY no está configurada en las variables de entorno')
      }
      const epaycoTestMode = process.env.NEXT_PUBLIC_EPAYCO_TEST_MODE !== 'false'
      const handler = window.ePayco.checkout.configure({
        key: epaycoKey,
        test: epaycoTestMode,
      })

      if (!handler) {
        throw new Error('No se pudo configurar el checkout de ePayco')
      }

      // Obtener URL del webhook desde el backend (usando orderId en lugar de cartId)
      const webhookResponse = await apiClient.get<{ webhookUrl: string }>(
        `/api/v1/checkout/webhook-url?orderId=${orderData.orderId}`
      )

      if (!webhookResponse.success || !webhookResponse.data?.webhookUrl) {
        throw new Error('No se pudo obtener la URL del webhook desde el backend')
      }

      const webhookUrl = webhookResponse.data.webhookUrl
      console.log('[GIFT-DIRECT-CHECKOUT] URL de webhook obtenida:', webhookUrl)

      // Preparar opciones para Epayco
      const epaycoOptions = {
        amount: orderData.total,
        name: `Regalo Tanku ${orderData.orderId.slice(0, 8)}`,
        description: `Regalo Tanku - ${productInfo?.product?.title || 'Producto'}`,
        currency: 'cop',
        country: 'co',
        external: false,
        response: `${window.location.origin}/checkout/success`,
        confirmation: webhookUrl,
        name_billing: user?.firstName || '',
        mobilephone_billing: user?.phone || '',
      }

      console.log('[GIFT-DIRECT-CHECKOUT] Abriendo pasarela de pago...')
      handler.open(epaycoOptions)
      console.log('[GIFT-DIRECT-CHECKOUT] Pasarela de pago abierta exitosamente')
    } catch (epaycoError: any) {
      console.error('[GIFT-DIRECT-CHECKOUT] Error abriendo Epayco:', epaycoError)
      setError(epaycoError.message || 'Error al abrir la pasarela de pago')
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (error && (!variantId || !recipientId)) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/feed">
            <Button>Volver al feed</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/feed">
          <Button type="button" variant="secondary" size="sm">
            ← Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-[#66DEDB]">Comprar como regalo</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda: Formularios */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información del destinatario */}
            {recipientInfo && (
              <div className="bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  {recipientInfo.avatar ? (
                    <div className="flex-shrink-0">
                      <img
                        src={recipientInfo.avatar}
                        alt={recipientInfo.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-[#66DEDB]"
                      />
                    </div>
                  ) : (
                    <span className="text-3xl flex-shrink-0">🎁</span>
                  )}
                  <div className="flex-1">
                    <p className="text-[#66DEDB] font-semibold text-lg">
                      Enviando regalo a {recipientInfo.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      Este pedido será enviado como regalo. La dirección de envío se obtendrá automáticamente del destinatario.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Información del producto */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-[#66DEDB]">Producto</h2>
              {productInfo ? (
                <div className="flex gap-4">
                  {productInfo.product?.thumbnail && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-700/30 flex-shrink-0">
                      <Image
                        src={productInfo.product.thumbnail}
                        alt={productInfo.product.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">{productInfo.product?.title || 'Producto'}</h3>
                    {productInfo.variant?.title && (
                      <p className="text-sm text-gray-400 mb-2">{productInfo.variant.title}</p>
                    )}
                    <p className="text-lg font-bold text-[#3B9BC3]">
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                      }).format(productInfo.price || 0)}
                    </p>
                    <p className="text-sm text-gray-400 mt-2">Cantidad: {quantity}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">La información del producto se cargará al procesar el pedido</p>
              )}
            </div>

            {/* Información de contacto */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-[#66DEDB]">Información de contacto</h2>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Columna derecha: Resumen */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-[#66DEDB]">Resumen</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white">
                      {total > 0 ? (
                        new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0,
                        }).format(total)
                      ) : (
                        'Se calculará'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Envío</span>
                    <span className="text-white">Se calculará después</span>
                  </div>
                  <div className="border-t border-gray-700 pt-3 flex justify-between">
                    <span className="font-semibold text-white">Total</span>
                    <span className="font-semibold text-[#3B9BC3]">
                      {total > 0 ? (
                        new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0,
                        }).format(total)
                      ) : (
                        'Se calculará'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Método de pago */}
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-[#66DEDB]">Método de pago</h2>
                <p className="text-sm text-gray-400">
                  Los regalos solo se pueden pagar con Epayco
                </p>
                <div className="mt-4 p-3 bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-lg">
                  <p className="text-[#66DEDB] font-medium">💳 Epayco</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-8 flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !epaycoReady}
            className="bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold px-8 py-3"
          >
            {isSubmitting ? 'Procesando...' : 'Completar pedido de regalo'}
          </Button>
        </div>
      </form>

      {/* Script de Epayco */}
      <Script
        id="epayco-script"
        src={process.env.NEXT_PUBLIC_EPAYCO_CHECKOUT_URL || 'https://checkout.epayco.co/checkout.js'}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[EPAYCO] Script cargado exitosamente')
          setEpaycoReady(true)
        }}
        onError={(e) => {
          console.error('[EPAYCO] Error cargando script:', e)
          setEpaycoReady(false)
        }}
        onReady={() => {
          console.log('[EPAYCO] Script listo')
          if (typeof window.ePayco !== 'undefined') {
            setEpaycoReady(true)
          }
        }}
      />
    </div>
  )
}

// Componente principal con Suspense boundary
export default function GiftDirectCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-gray-400">Cargando...</div>
      </div>
    }>
      <GiftDirectCheckoutContent />
    </Suspense>
  )
}

