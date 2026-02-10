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
  const recipientIdParam = searchParams.get('recipientId') // Opcional ahora
  const quantityParam = searchParams.get('quantity')
  const quantity = quantityParam ? parseInt(quantityParam) : 1
  
  const [email, setEmail] = useState(user?.email || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productInfo, setProductInfo] = useState<any>(null)
  const [recipientInfo, setRecipientInfo] = useState<any>(null)
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(recipientIdParam)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [eligibility, setEligibility] = useState<{
    canReceive: boolean
    reason?: string
    canSendGift?: boolean
    sendGiftReason?: string
  } | null>(null)
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
  const [epaycoReady, setEpaycoReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Validar parámetros y cargar datos
  useEffect(() => {
    // recipientId ahora es opcional
    if (!variantId) {
      setError('Faltan parámetros requeridos (variantId)')
      setIsLoading(false)
      return
    }

    if (!isAuthenticated) {
      const redirectUrl = `/checkout/gift-direct?variantId=${variantId}&quantity=${quantity}${recipientIdParam ? `&recipientId=${recipientIdParam}` : ''}`
      sessionStorage.setItem('redirect-after-login', redirectUrl)
      router.push('/feed')
      return
    }

    loadProductInfo()
    
    // Si viene recipientId (flujo wishlist), cargar directamente
    if (recipientIdParam) {
      loadRecipientInfo(recipientIdParam)
    }
    // Si NO viene recipientId (flujo feed), mostrar selector
  }, [variantId, recipientIdParam, quantity, isAuthenticated])

  const loadProductInfo = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (variantId) {
        const variantResponse = await apiClient.get<any>(API_ENDPOINTS.PRODUCTS.VARIANT_BY_ID(variantId))
        if (variantResponse.success && variantResponse.data) {
          const variant = variantResponse.data
          
          // Validar stock
          const stock = variant.stock || 0
          if (stock <= 0) {
            setError('Este producto está agotado y no está disponible para regalo')
            return
          }
          if (stock < quantity) {
            setError(`Stock insuficiente. Solo hay ${stock} unidad(es) disponible(s)`)
            return
          }
          
          const price = variant.tankuPrice || variant.price || 0
          setProductInfo({
            variant: {
              id: variant.id,
              title: variant.title,
            },
            product: {
              id: variant.product.id,
              title: variant.product.title,
              thumbnail: variant.product.images?.[0] || null,
            },
            price,
          })
          setTotal(price * quantity)
        } else {
          throw new Error('No se pudo cargar la información del producto')
        }
      }
    } catch (err: any) {
      console.error('Error cargando información:', err)
      setError(err.message || 'Error al cargar la información')
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecipientInfo = async (recipientId: string) => {
    try {
      const recipientResponse = await apiClient.get<any>(API_ENDPOINTS.USERS.BY_ID(recipientId))
      if (recipientResponse.success && recipientResponse.data) {
        const user = (recipientResponse.data as any).user || recipientResponse.data
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
        setRecipientInfo({
          id: user.id,
          name: fullName || user.username || 'Usuario',
          username: user.username,
          avatar: user.profile?.avatar || user.avatar || null,
        })
        setSelectedRecipientId(recipientId)
        
        // Validar elegibilidad cuando se carga el receptor
        await checkEligibility(recipientId)
      }
    } catch (err: any) {
      console.error('Error cargando información del receptor:', err)
      setError(err.message || 'Error al cargar la información del receptor')
    }
  }

  const searchRecipients = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await apiClient.get<any>(`${API_ENDPOINTS.USERS.SEARCH}?q=${encodeURIComponent(query)}`)
      if (response.success && response.data) {
        setSearchResults(response.data.users || response.data || [])
      }
    } catch (err: any) {
      console.error('Error buscando usuarios:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const checkEligibility = async (recipientId: string) => {
    if (!recipientId || !user?.id) return

    setIsCheckingEligibility(true)
    setEligibility(null)
    
    try {
      const response = await apiClient.get<any>(
        `${API_ENDPOINTS.GIFTS.VALIDATE_RECIPIENT}?recipientId=${recipientId}&senderId=${user.id}`
      )
      
      if (response.success && response.data) {
        setEligibility(response.data)
        
        if (!response.data.canReceive || response.data.canSendGift === false) {
          setError(response.data.reason || response.data.sendGiftReason || 'El destinatario no puede recibir regalos')
        } else {
          setError(null)
        }
      }
    } catch (err: any) {
      console.error('Error validando elegibilidad:', err)
      setEligibility({
        canReceive: false,
        reason: err.message || 'Error al validar elegibilidad'
      })
      setError(err.message || 'Error al validar elegibilidad')
    } finally {
      setIsCheckingEligibility(false)
    }
  }

  const handleRecipientSelect = async (recipient: any) => {
    setRecipientSearch('')
    setSearchResults([])
    await loadRecipientInfo(recipient.id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError('El email es requerido')
      return
    }

    const finalRecipientId = selectedRecipientId || recipientIdParam
    if (!variantId || !finalRecipientId) {
      setError('Debes seleccionar un destinatario')
      return
    }

    // Validar elegibilidad antes de continuar
    if (!eligibility || !eligibility.canReceive || eligibility.canSendGift === false) {
      setError(eligibility?.reason || eligibility?.sendGiftReason || 'El destinatario no puede recibir regalos')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await apiClient.post<any>(API_ENDPOINTS.CHECKOUT.GIFT_DIRECT, {
        variant_id: variantId,
        quantity,
        recipient_id: finalRecipientId,
        email,
        payment_method: 'epayco',
      })

      if (response.success && response.data) {
        const data = response.data as any
        
        if (data.orderId) {
          await openEpaycoCheckout(data)
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
      if (typeof window.ePayco === 'undefined') {
        throw new Error('ePayco no está cargado. Por favor, recarga la página.')
      }

      const container = document.createElement('div')
      container.style.display = 'none'
      container.id = 'epayco-container'
      document.body.appendChild(container)

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

      const webhookResponse = await apiClient.get<{ webhookUrl: string }>(
        `/api/v1/checkout/webhook-url?orderId=${orderData.orderId}`
      )

      if (!webhookResponse.success || !webhookResponse.data?.webhookUrl) {
        throw new Error('No se pudo obtener la URL del webhook desde el backend')
      }

      const webhookUrl = webhookResponse.data.webhookUrl
      console.log('[GIFT-DIRECT-CHECKOUT] URL de webhook obtenida:', webhookUrl)

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

  if (isLoading && !productInfo) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (error && !variantId) {
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
            {/* Selector de destinatario - Solo mostrar si NO viene recipientId */}
            {!recipientInfo && !recipientIdParam ? (
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-[#66DEDB]">Elegir destinatario</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Buscar usuario o amigo
                    </label>
                    <input
                      type="text"
                      value={recipientSearch}
                      onChange={(e) => {
                        setRecipientSearch(e.target.value)
                        searchRecipients(e.target.value)
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
                      placeholder="Buscar por nombre o username..."
                    />
                  </div>
                  
                  {isSearching && (
                    <div className="text-center text-gray-400">Buscando...</div>
                  )}
                  
                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => handleRecipientSelect(result)}
                          className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-3 transition-colors"
                        >
                          {result.avatar || result.profile?.avatar ? (
                            <img
                              src={result.avatar || result.profile?.avatar}
                              alt={result.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-lg">👤</span>
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="text-white font-medium">
                              {result.firstName && result.lastName
                                ? `${result.firstName} ${result.lastName}`
                                : result.username || 'Usuario'}
                            </p>
                            {result.username && (
                              <p className="text-sm text-gray-400">@{result.username}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : recipientInfo ? (
              <div className="bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-[#66DEDB]">Destinatario</h2>
                  {/* Solo permitir cambiar si NO vino de wishlist (sin recipientIdParam) */}
                  {!recipientIdParam && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setRecipientInfo(null)
                        setSelectedRecipientId(null)
                        setEligibility(null)
                        setError(null)
                      }}
                    >
                      Cambiar
                    </Button>
                  )}
                </div>
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
                      {recipientInfo.name}
                    </p>
                    {recipientInfo.username && (
                      <p className="text-sm text-gray-400">@{recipientInfo.username}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-1">
                      Este pedido será enviado como regalo. La dirección de envío se obtendrá automáticamente del destinatario.
                    </p>
                  </div>
                </div>
                
                {/* Estado de elegibilidad */}
                {isCheckingEligibility ? (
                  <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
                    <p className="text-gray-400 text-sm">Validando elegibilidad...</p>
                  </div>
                ) : eligibility ? (
                  <div className={`mt-4 p-3 rounded-lg ${
                    eligibility.canReceive && eligibility.canSendGift !== false
                      ? 'bg-green-900/20 border border-green-500'
                      : 'bg-red-900/20 border border-red-500'
                  }`}>
                    {eligibility.canReceive && eligibility.canSendGift !== false ? (
                      <p className="text-green-400 text-sm">✓ Este usuario puede recibir regalos</p>
                    ) : (
                      <p className="text-red-400 text-sm">
                        ✗ {eligibility.reason || eligibility.sendGiftReason || 'No puede recibir regalos'}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Información del producto */}
            {productInfo && (
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-[#66DEDB]">Producto</h2>
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
                    <h3 className="text-white font-semibold mb-1">{productInfo.product?.title}</h3>
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
              </div>
            )}

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
                {productInfo ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Subtotal</span>
                      <span className="text-white">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0,
                        }).format(total)}
                      </span>
                    </div>
                    <div className="border-t border-gray-700 pt-3 flex justify-between">
                      <span className="font-semibold text-white">Total</span>
                      <span className="font-semibold text-[#3B9BC3]">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0,
                        }).format(total)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">* El envío está incluido en el precio</p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Cargando información...</p>
                )}
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
            disabled={
              isSubmitting || 
              !epaycoReady || 
              !productInfo || 
              isLoading || 
              (!selectedRecipientId && !recipientIdParam) ||
              !eligibility ||
              !eligibility.canReceive ||
              eligibility.canSendGift === false
            }
            className="bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Cargando...' : isSubmitting ? 'Procesando...' : 'Completar pedido de regalo'}
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
