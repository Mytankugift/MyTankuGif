'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CheckoutOrderRequest, CheckoutDataCart, OrderDTO } from '@/types/api'
import { CheckoutPaymentMethod } from '@/components/checkout/checkout-payment-method'
import { CheckoutSummary } from '@/components/checkout/checkout-summary'
import { CheckoutConfirmationModal } from '@/components/checkout/checkout-confirmation-modal'
import Script from 'next/script'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
function GiftCheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { giftCart, fetchGiftCart, isLoading: cartLoading } = useCartStore()
  const { user, isAuthenticated } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [buttonTooltip, setButtonTooltip] = useState<string | null>(null)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [epaycoReady, setEpaycoReady] = useState(false)
  
  // Obtener cartId de la URL (simplificado - solo cartId)
  const cartId = searchParams.get('cartId')

  // Método de pago (solo Epayco para regalos)
  const [paymentMethod, setPaymentMethod] = useState<string>('epayco')
  const [email, setEmail] = useState(user?.email || '')
  const [recipientName, setRecipientName] = useState<string | null>(null)
  const [recipientAvatar, setRecipientAvatar] = useState<string | null>(null)

  // Cargar carrito de regalos al montar
  useEffect(() => {
    if (!giftCart) {
      fetchGiftCart()
    }
  }, [giftCart, fetchGiftCart])

  // Obtener nombre y avatar del destinatario
  useEffect(() => {
    const fetchRecipientInfo = async () => {
      if (giftCart?.giftRecipientId) {
        try {
          const response = await apiClient.get<any>(API_ENDPOINTS.USERS.BY_ID(giftCart.giftRecipientId))
          if (response.success && response.data) {
            const user = response.data.user || response.data
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
            setRecipientName(fullName || user.username || 'Usuario')
            // Obtener avatar del perfil
            const avatarUrl = user.profile?.avatar || user.avatar || null
            if (avatarUrl) {
              setRecipientAvatar(avatarUrl)
            } else {
              // Generar avatar con iniciales si no hay avatar
              const initials = fullName 
                ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : 'U'
              setRecipientAvatar(`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'Usuario')}&background=66DEDB&color=1E1E1E&size=64`)
            }
          } else {
            setRecipientName('Usuario')
            setRecipientAvatar(`https://ui-avatars.com/api/?name=Usuario&background=66DEDB&color=1E1E1E&size=64`)
          }
        } catch (error) {
          console.error('Error obteniendo información del destinatario:', error)
          setRecipientName('Usuario')
          setRecipientAvatar(`https://ui-avatars.com/api/?name=Usuario&background=66DEDB&color=1E1E1E&size=64`)
        }
      }
    }
    if (giftCart?.giftRecipientId) {
      fetchRecipientInfo()
    }
  }, [giftCart?.giftRecipientId])

  // Redirigir si no hay carrito o no hay items
  useEffect(() => {
    if (!cartLoading && (!giftCart || giftCart.items.length === 0)) {
      router.push('/cart')
    }
  }, [giftCart, cartLoading, router])

  // Redirigir al login si no hay usuario autenticado
  useEffect(() => {
    if (!cartLoading && giftCart && giftCart.items.length > 0 && !isAuthenticated) {
      console.log('[GIFT CHECKOUT] Usuario no autenticado, redirigiendo al login...')
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirect-after-login', `/checkout/gift?cartId=${cartId || giftCart.id}`)
      }
      router.push('/feed')
    }
  }, [giftCart, cartLoading, isAuthenticated, router, cartId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setButtonTooltip(null)

    // Verificar que el usuario esté autenticado
    if (!isAuthenticated || !user) {
      console.log('[GIFT CHECKOUT] Usuario no autenticado, redirigiendo al login...')
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirect-after-login', `/checkout/gift?cartId=${cartId || giftCart?.id}`)
      }
      router.push('/feed')
      return
    }

    // Validaciones
    if (!giftCart || giftCart.items.length === 0) {
      setButtonTooltip('No hay productos en el carrito de regalos')
      return
    }

    if (!email) {
      setButtonTooltip('El email es requerido')
      return
    }

    // Los regalos solo se pueden pagar con Epayco
    if (paymentMethod !== 'epayco') {
      setButtonTooltip('Los regalos solo se pueden pagar con Epayco')
      return
    }

    // Mostrar modal de confirmación
    setShowConfirmationModal(true)
  }

  const handleConfirmOrder = async () => {
    if (!giftCart) return

    console.log('[GIFT CHECKOUT] Iniciando confirmación de pedido de regalo')

    // Validar que Epayco esté disponible
    if (!epaycoReady) {
      setButtonTooltip('ePayco aún no está listo. Por favor, espera un momento y vuelve a intentar.')
      console.warn('[GIFT CHECKOUT] Epayco no está listo todavía')
      return
    }

    if (typeof window.ePayco === 'undefined') {
      setButtonTooltip('ePayco no está cargado. Por favor, recarga la página.')
      console.error('[GIFT CHECKOUT] window.ePayco no está definido')
      return
    }

    setIsSubmitting(true)

    try {
      // Preparar dataForm (para regalos, la dirección se obtiene del destinatario en el backend)
      const dataForm: CheckoutOrderRequest = {
        shipping_address: {
          // Placeholder - el backend ignorará esto y usará la dirección del destinatario
          first_name: '',
          last_name: '',
          address_1: '',
          city: '',
          province: '',
          postal_code: '',
          country_code: 'CO',
        },
        email,
        payment_method: 'epayco',
        cart_id: giftCart.id,
      }

      // Preparar dataCart
      const dataCart: CheckoutDataCart = {
        customer_id: user?.id || '',
        cart_id: giftCart.id,
        producVariants: giftCart.items.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
          original_total: item.total,
          unit_price: item.unitPrice,
        })),
      }

      // Llamar al endpoint de checkout
      const response = await apiClient.post<any>(
        API_ENDPOINTS.CHECKOUT.ADD_ORDER,
        {
          dataForm,
          dataCart,
        }
      )

      if (response.success && response.data) {
        console.log('[GIFT CHECKOUT] Respuesta del backend recibida:', response.data)

        // Para regalos, siempre es Epayco
        if (!response.data.cartId) {
          console.error('[GIFT CHECKOUT] Error: Respuesta del backend no tiene cartId para Epayco:', response.data)
          setButtonTooltip('Error: El backend no retornó los datos esperados para Epayco.')
          setIsSubmitting(false)
          setShowConfirmationModal(false)
          return
        }

        const preparedData = response.data
        console.log('[GIFT CHECKOUT] Datos preparados para Epayco:', preparedData)
        
        try {
          // Cerrar modal de confirmación
          setShowConfirmationModal(false)

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

          // Obtener URL del webhook desde el backend
          const webhookResponse = await apiClient.get<{ webhookUrl: string }>(
            `/api/v1/checkout/webhook-url?cartId=${preparedData.cartId}`
          )

          if (!webhookResponse.success || !webhookResponse.data?.webhookUrl) {
            throw new Error('No se pudo obtener la URL del webhook desde el backend')
          }

          const webhookUrl = webhookResponse.data.webhookUrl
          console.log('[GIFT CHECKOUT] URL de webhook obtenida del backend:', webhookUrl)

          // Preparar opciones para Epayco
          const epaycoOptions = {
            amount: preparedData.total,
            name: `Regalo Tanku ${preparedData.cartId.slice(0, 8)}`,
            description: `Regalo Tanku - ${giftCart.items.length} producto(s)`,
            currency: 'cop',
            country: 'co',
            external: false,
            response: `${window.location.origin}/checkout/success`,
            confirmation: webhookUrl,
            name_billing: user?.firstName || '',
            mobilephone_billing: user?.phone || '',
          }

          console.log('[GIFT CHECKOUT] Opciones configuradas:', epaycoOptions)

          // Abrir pasarela de pago
          console.log('[GIFT CHECKOUT] Abriendo pasarela de pago...')
          handler.open(epaycoOptions)
          console.log('[GIFT CHECKOUT] Pasarela de pago abierta exitosamente')
        } catch (epaycoError: any) {
          console.error('[GIFT CHECKOUT] Error abriendo Epayco:', epaycoError)
          setButtonTooltip(epaycoError.message || 'Error al abrir la pasarela de pago')
          setIsSubmitting(false)
          setShowConfirmationModal(false)
        }
      } else {
        let errorMessage = response.error?.message || 'Error al procesar el pedido de regalo'
        
        if (errorMessage.includes('no puede recibir regalos') || errorMessage.includes('dirección')) {
          errorMessage = 'El destinatario ya no puede recibir regalos o no tiene una dirección configurada. Por favor, verifica la configuración del destinatario.'
        } else if (errorMessage.includes('No puedes enviar regalos')) {
          errorMessage = 'No puedes enviar regalos a este usuario. Su perfil es privado y no eres su amigo.'
        }
        
        setButtonTooltip(errorMessage)
        setShowConfirmationModal(false)
      }
    } catch (err: any) {
      console.error('Error en checkout de regalo:', err)
      let errorMessage = err.message || 'Error al procesar el pedido de regalo'
      setButtonTooltip(errorMessage)
      setShowConfirmationModal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (cartLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (!giftCart || giftCart.items.length === 0) {
    return null // El useEffect redirigirá
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/cart">
          <Button type="button" variant="secondary" size="sm">
            ← Volver al carrito
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-[#66DEDB]">Checkout de Regalo</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda: Formularios */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información de contacto */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-[#66DEDB]">Información de contacto</h2>
              
              {/* Mensaje informativo para regalos */}
              {giftCart?.giftRecipientId && (
                <div className="mb-6 bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    {recipientAvatar ? (
                      <div className="flex-shrink-0">
                        <img
                          src={recipientAvatar}
                          alt={recipientName || 'Destinatario'}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#66DEDB]"
                        />
                      </div>
                    ) : (
                      <span className="text-2xl flex-shrink-0">🎁</span>
                    )}
                    <div className="flex-1">
                      <p className="text-[#66DEDB] font-semibold">
                        Enviando regalo {recipientName ? `a ${recipientName}` : 'a un amigo'}
                      </p>
                      <p className="text-sm text-gray-400">
                        Este pedido será enviado como regalo. La dirección de envío se obtendrá automáticamente del destinatario.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
          </div>

          {/* Columna derecha: Resumen y Método de pago */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <CheckoutSummary cart={giftCart} isGiftCart={true} />
              
              {/* Método de pago */}
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-[#66DEDB]">Método de pago</h2>
                <CheckoutPaymentMethod
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  isGiftCart={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-8 flex justify-end">
          <div className="relative">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold px-8 py-3"
            >
              {isSubmitting ? 'Procesando...' : 'Completar pedido de regalo'}
            </Button>
            {buttonTooltip && (
              <div className="absolute bottom-full right-0 mb-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg shadow-xl whitespace-nowrap z-50 animate-fade-in pointer-events-none">
                {buttonTooltip}
                <div className="absolute top-full right-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-red-600"></div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Modal de confirmación */}
      {giftCart && (
        <CheckoutConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            if (!isSubmitting) {
              setShowConfirmationModal(false)
            }
          }}
          onConfirm={handleConfirmOrder}
          cart={giftCart}
          paymentMethod={paymentMethod}
          isSubmitting={isSubmitting}
          selectedItems={giftCart.items}
        />
      )}

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
export default function GiftCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-gray-400">Cargando...</div>
      </div>
    }>
      <GiftCheckoutContent />
    </Suspense>
  )
}

