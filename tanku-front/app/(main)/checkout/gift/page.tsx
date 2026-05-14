'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CheckoutOrderRequest, CheckoutDataCart, OrderDTO } from '@/types/api'
import { CheckoutPaymentMethod } from '@/components/checkout/checkout-payment-method'
import { CheckoutProductList } from '@/components/checkout/checkout-product-list'
import { CheckoutSummary } from '@/components/checkout/checkout-summary'
import { CheckoutConfirmationModal } from '@/components/checkout/checkout-confirmation-modal'
import Script from 'next/script'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BaseNav } from '@/components/layout/base-nav'
import {
  CHECKOUT_TANKU_INPUT,
  CHECKOUT_TANKU_PAGE_BG,
  CHECKOUT_TANKU_SCROLL_INNER,
  CHECKOUT_TANKU_SECTION_LABEL,
  CHECKOUT_TANKU_SURFACE,
} from '@/lib/checkout-tanku-design'
import { isEpaycoSmartMode, getEpaycoScriptUrlForMode } from '@/lib/epayco/config'
import { openEpaycoSmartCheckout } from '@/lib/epayco/open-smart-checkout'

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
  const [giftMessage, setGiftMessage] = useState('')
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
        ...(giftMessage.trim()
          ? { gift_message: giftMessage.trim().slice(0, 500) }
          : {}),
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

      if (isEpaycoSmartMode()) {
        setShowConfirmationModal(false)
        try {
          const smartRes = await apiClient.post<{ sessionId: string; test?: boolean }>(
            API_ENDPOINTS.CHECKOUT.EPAYCO_SMART_SESSION,
            { flow: 'cart', dataForm, dataCart }
          )
          if (!smartRes.success || !smartRes.data?.sessionId) {
            throw new Error(
              (smartRes as { error?: { message?: string } }).error?.message ||
                'No se pudo crear la sesión de pago'
            )
          }
          openEpaycoSmartCheckout(smartRes.data.sessionId, 'gift_cart', smartRes.data.test)
        } catch (epaycoSmartErr: any) {
          console.error('[GIFT CHECKOUT] [EPAYCO-SMART]', epaycoSmartErr)
          setButtonTooltip(epaycoSmartErr.message || 'Error al iniciar el pago')
          setShowConfirmationModal(false)
        } finally {
          setIsSubmitting(false)
        }
        return
      }

      // Llamar al endpoint de checkout (classic)
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

  const navBack = (
    <Link
      href="/cart"
      aria-label="Volver al carrito"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
    >
      <Image
        src="/icons_tanku/mobile_tanku_menu_ir_atras_Universal.svg"
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 object-contain"
        unoptimized
      />
    </Link>
  )

  if (cartLoading) {
    return (
      <>
        <BaseNav
          showStories={false}
          canHide={false}
          isVisible={true}
          pageTitle="Regalo"
          pageTitleColor="#FFFFFF"
          startContent={navBack}
          mobileBackCenterTitleCartOnly
          mobileTranslucentNav
        />
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden" id="checkout-gift-scroll-root">
          <div className={CHECKOUT_TANKU_SCROLL_INNER} style={CHECKOUT_TANKU_PAGE_BG}>
            <div className="mx-auto max-w-4xl text-center text-zinc-500">
              <div className={`${CHECKOUT_TANKU_SURFACE} mx-auto max-w-md px-8 py-14`}>
                <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#73FFA2] border-t-transparent" />
                <span className="text-sm">Cargando…</span>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!giftCart || giftCart.items.length === 0) {
    return null // El useEffect redirigirá
  }

  return (
    <>
      <BaseNav
        showStories={false}
        canHide={false}
        isVisible={true}
        pageTitle="Regalo"
        pageTitleColor="#FFFFFF"
        startContent={navBack}
        mobileBackCenterTitleCartOnly
        mobileTranslucentNav
      />
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden" id="checkout-gift-scroll-root">
        <div className={CHECKOUT_TANKU_SCROLL_INNER} style={CHECKOUT_TANKU_PAGE_BG}>
          <div className="mx-auto max-w-4xl">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 lg:items-start">
                <div className="space-y-8 lg:col-span-7">
                  {giftCart?.giftRecipientId && (
                    <div className="rounded-2xl border border-[#66DEDB]/25 bg-[#66DEDB]/[0.08] p-4 backdrop-blur-md ring-1 ring-inset ring-[#66DEDB]/15">
                      <p className={CHECKOUT_TANKU_SECTION_LABEL}>Destinatario</p>
                      <div className="mt-1 flex items-start gap-3">
                        {recipientAvatar ? (
                          <div className="flex-shrink-0">
                            <img
                              src={recipientAvatar}
                              alt={recipientName || 'Destinatario'}
                              className="h-12 w-12 rounded-full border-2 border-[#66DEDB] object-cover"
                            />
                          </div>
                        ) : (
                          <span className="flex-shrink-0 text-2xl">🎁</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#66DEDB]">
                            {recipientName ? recipientName : 'Regalo a un amigo'}
                          </p>
                          <p className="mt-1 text-sm text-zinc-400">La dirección de envío la tomamos del destinatario.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <CheckoutProductList items={giftCart.items} />

                  <div className={CHECKOUT_TANKU_SURFACE}>
                    <p className={CHECKOUT_TANKU_SECTION_LABEL}>Mensaje para tu amigo (opcional)</p>
                    <p className="mb-2 text-xs text-zinc-500">
                      Aparecerá en el correo que recibe al confirmarse el pago. Máximo 500 caracteres.
                    </p>
                    <textarea
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value.slice(0, 500))}
                      rows={4}
                      maxLength={500}
                      className={`${CHECKOUT_TANKU_INPUT} resize-y min-h-[100px]`}
                      placeholder="Ej.: Espero que te guste, lo elegí pensando en ti…"
                    />
                    <p className="mt-1 text-right text-xs text-zinc-500">{giftMessage.length}/500</p>
                  </div>

                  <div className={CHECKOUT_TANKU_SURFACE}>
                    <p className={CHECKOUT_TANKU_SECTION_LABEL}>Contacto</p>
                    <div>
                      <label className="mb-2 block text-xs font-medium text-zinc-500">Correo (facturación) *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={CHECKOUT_TANKU_INPUT}
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="space-y-6 lg:sticky lg:top-28">
                    <CheckoutSummary cart={giftCart} isGiftCart={true} showLineItems={false} />

                    <div className={CHECKOUT_TANKU_SURFACE}>
                      <p className={CHECKOUT_TANKU_SECTION_LABEL}>Pago</p>
                      <p className="mb-4 text-sm text-zinc-500">Pasarela segura con Epayco.</p>
                      <CheckoutPaymentMethod
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        isGiftCart={true}
                      />
                    </div>

                    <div className="relative">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 font-semibold text-sm hover:!bg-[#5ac8c4] disabled:cursor-not-allowed disabled:opacity-50 sm:py-3 sm:text-base"
                        style={{
                          backgroundColor: '#66DEDB',
                          color: '#2C3137',
                          borderRadius: '25px',
                          boxShadow: '0px 4px 4px 0px #00000040 inset',
                        }}
                      >
                        {isSubmitting ? 'Procesando...' : 'Completar pedido de regalo'}
                      </Button>
                      {buttonTooltip && (
                        <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-xl animate-fade-in">
                          {buttonTooltip}
                          <div className="absolute top-full right-4 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-red-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <Script
              id="epayco-script"
              src={getEpaycoScriptUrlForMode()}
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
        </div>
      </div>

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
    </>
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

