'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, ArrowLeftIcon, ArrowRightIcon, GiftIcon } from '@heroicons/react/24/outline'
import { FriendsPageSearchBar } from '@/components/friends/friends-page-search-bar'
import { ReceiverSelector, type ReceiverData } from './receiver-selector'
import { ProductSelector } from './product-selector'
import { GiftConfig } from './gift-config'
import { GiftSummary } from './gift-summary'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { ProductDTO } from '@/types/api'
import type { FeedItem } from '@/lib/types/feed.types'
import { isEpaycoSmartMode, getEpaycoScriptUrlForMode } from '@/lib/epayco/config'
import { openEpaycoSmartCheckout } from '@/lib/epayco/open-smart-checkout'
import { fetchFeedFirstProducts } from '@/components/stalkergift/stalkergift-product-feed-utils'

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

type Step = 1 | 2 | 3 | 4

interface StalkerGiftModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface GiftData {
  receiver: ReceiverData | null
  product: ProductDTO | null
  variantId: string | null
  quantity: number
  senderAlias: string
  senderMessage: string
}

export function StalkerGiftModal({ isOpen, onClose, onSuccess }: StalkerGiftModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [giftData, setGiftData] = useState<GiftData>({
    receiver: null,
    product: null,
    variantId: null,
    quantity: 1,
    senderAlias: '',
    senderMessage: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [epaycoReady, setEpaycoReady] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [noticeModal, setNoticeModal] = useState<string | null>(null)
  const [prefetchedTopFeed, setPrefetchedTopFeed] = useState<FeedItem[] | null>(null)
  /** Evita desmontar el paso de productos al avanzar (p. ej. paso 3 → atrás debe ser instantáneo). */
  const [stashProductStepMounted, setStashProductStepMounted] = useState(false)
  const contentScrollRef = useRef<HTMLDivElement>(null)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  /** Al cambiar de paso (p. ej. producto → configuración en móvil), volver arriba del scroll */
  useEffect(() => {
    const el = contentScrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [currentStep])

  // Resetear modal cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1)
      setGiftData({
        receiver: null,
        product: null,
        variantId: null,
        quantity: 1,
        senderAlias: '',
        senderMessage: '',
      })
      setIsSubmitting(false)
      setProductSearchQuery('')
      setNoticeModal(null)
      setPrefetchedTopFeed(null)
      setStashProductStepMounted(false)
    }
  }, [isOpen])

  useEffect(() => {
    let cancelled = false
    if (!isOpen) return

    ;(async () => {
      try {
        const top = await fetchFeedFirstProducts(30, 2)
        if (!cancelled) setPrefetchedTopFeed(top)
      } catch {
        if (!cancelled) setPrefetchedTopFeed([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isOpen])

  useEffect(() => {
    if (currentStep >= 2) setStashProductStepMounted(true)
  }, [currentStep])

  useEffect(() => {
    if (giftData.receiver?.user?.id) {
      setStashProductStepMounted(true)
    }
  }, [giftData.receiver?.user?.id])

  useEffect(() => {
    if (currentStep !== 2) setProductSearchQuery('')
  }, [currentStep])

  const handleNext = () => {
    if (currentStep < 4) {
      // Validaciones por paso
      if (currentStep === 1 && (!giftData.receiver || !giftData.receiver.user)) {
        setNoticeModal(
          'Indica quién recibirá este StalkerGift: elige un destinatario en la lista o búscalo arriba.',
        )
        return
      }
      if (currentStep === 2 && !giftData.product) {
        setNoticeModal(
          'Aún no elegiste un producto. Explora la lista o usa el buscador y toca un artículo.',
        )
        return
      }
      if (currentStep === 3) {
        if (!giftData.senderAlias.trim()) {
          setNoticeModal(
            'Falta tu alias: es el nombre con el que te verá el receptor (puede ser un apodo o “Anónimo”).',
          )
          return
        }
        const vs = giftData.product?.variants
        if (vs && vs.length > 1 && !giftData.variantId) {
          setNoticeModal(
            'Elige una variante del producto: toca el bloque «Variante» sobre el alias.',
          )
          return
        }
      }

      setCurrentStep((step) => (step + 1) as Step)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((step) => (step - 1) as Step)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const isContinueDisabled =
    isSubmitting || (currentStep === 2 && !giftData.product)

  const handleSubmit = async () => {
    if (!giftData.receiver?.user || !giftData.product || !giftData.senderAlias.trim()) {
      return
    }
    const pv = giftData.product.variants
    if (pv && pv.length > 1 && !giftData.variantId) {
      alert('Elige una variante del producto')
      return
    }

    // Validar ePayco antes de proceder
    if (!epaycoReady) {
      alert('ePayco aún no está listo. Por favor, espera un momento y vuelve a intentar.')
      return
    }

    if (typeof window.ePayco === 'undefined') {
      alert('ePayco no está cargado. Por favor, recarga la página.')
      return
    }

    setIsSubmitting(true)

    try {
      // Preparar datos para checkout
      const checkoutData = {
        receiverId: giftData.receiver.user.id,
        externalReceiverData: undefined,
        productId: giftData.product.id,
        variantId: giftData.variantId || undefined,
        quantity: giftData.quantity,
        senderAlias: giftData.senderAlias.trim(),
        senderMessage: giftData.senderMessage.trim() || undefined,
      }

      if (isEpaycoSmartMode()) {
        const smartRes = await apiClient.post<{ sessionId: string }>(
          API_ENDPOINTS.CHECKOUT.EPAYCO_SMART_SESSION,
          { flow: 'stalker_gift', ...checkoutData }
        )
        if (!smartRes.success || !smartRes.data?.sessionId) {
          throw new Error(
            (smartRes as { error?: { message?: string } }).error?.message ||
              'No se pudo crear la sesión de pago'
          )
        }
        onClose()
        openEpaycoSmartCheckout(smartRes.data.sessionId)
        onSuccess?.()
        setIsSubmitting(false)
        return
      }

      // Llamar al endpoint de checkout (classic)
      const response = await apiClient.post<any>(
        API_ENDPOINTS.STALKER_GIFT.CHECKOUT,
        checkoutData
      )

      if (response.success && response.data) {
        const preparedData = response.data

        // Verificar que la respuesta tiene cartId
        if (!preparedData.cartId) {
          throw new Error('El backend no retornó los datos esperados para ePayco')
        }

        try {
          // Obtener URL del webhook desde el backend
          const webhookResponse = await apiClient.get<{ webhookUrl: string }>(
            `/api/v1/checkout/webhook-url?cartId=${preparedData.cartId}`
          )

          if (!webhookResponse.success || !webhookResponse.data?.webhookUrl) {
            throw new Error('No se pudo obtener la URL del webhook desde el backend')
          }

          const webhookUrl = webhookResponse.data.webhookUrl

          // Crear contenedor para Epayco
          const container = document.createElement('div')
          container.style.display = 'none'
          container.id = 'epayco-container-stalkergift'
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

          // Obtener datos del receptor para billing
          const receiverName =
            `${giftData.receiver.user.firstName || ''} ${giftData.receiver.user.lastName || ''}`.trim() ||
            giftData.receiver.user.email?.split('@')[0] ||
            'Receptor'

          const receiverPhone = giftData.receiver.user.phone || ''

          // Obtener URL base del frontend (usar variable de entorno si existe, sino usar window.location.origin)
          // Usar NEXT_PUBLIC_FRONTEND_URL para producción, o window.location.origin como fallback
          const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 
                              (typeof window !== 'undefined' ? window.location.origin : 'https://www.mytanku.com')
          
          // Preparar opciones para Epayco
          // Agregar stalkerGiftId y cartId como query params para facilitar la búsqueda en la página de éxito
          const responseUrl = `${frontendUrl}/stalkergift/success?stalkerGiftId=${preparedData.stalkerGiftId}&cartId=${preparedData.cartId}`
          
          const epaycoOptions = {
            amount: preparedData.total,
            name: `StalkerGift ${preparedData.stalkerGiftId.slice(0, 8)}`,
            description: `Regalo anónimo - ${giftData.product.title} (x${giftData.quantity})`,
            currency: 'cop',
            country: 'co',
            external: false,
            response: responseUrl,
            confirmation: webhookUrl,
            name_billing: receiverName,
            mobilephone_billing: receiverPhone,
          }
          
          console.log('[EPAYCO-STALKERGIFT] URL de respuesta configurada:', responseUrl)

          console.log('[EPAYCO-STALKERGIFT] Abriendo pasarela de pago...', epaycoOptions)

          // Cerrar modal antes de abrir ePayco
          onClose()

          // Abrir pasarela de pago
          handler.open(epaycoOptions)

          // Llamar onSuccess después de abrir ePayco
          onSuccess?.()
        } catch (epaycoError: any) {
          console.error('[EPAYCO-STALKERGIFT] Error abriendo Epayco:', epaycoError)
          alert(epaycoError.message || 'Error al abrir la pasarela de pago')
          setIsSubmitting(false)
        }
      } else {
        // Manejar error del backend (incluye stock insuficiente)
        const errorMessage = response.error?.message || 'Error al crear el regalo'
        alert(errorMessage)
        setIsSubmitting(false)
      }
    } catch (error: any) {
      console.error('Error creando StalkerGift:', error)
      alert(error.message || 'Error al crear el regalo')
      setIsSubmitting(false)
    }
  }

  // Cargar script de ePayco solo cuando el modal esté abierto
  useEffect(() => {
    if (!isOpen) return

    // Verificar si el script ya está cargado
    const existingScript = document.getElementById('epayco-script-stalkergift')
    if (existingScript) {
      if (typeof window.ePayco !== 'undefined') {
        setEpaycoReady(true)
      }
      return
    }

    // Crear y cargar script
    const script = document.createElement('script')
    script.id = 'epayco-script-stalkergift'
    script.src = getEpaycoScriptUrlForMode()
    script.async = true

    script.onload = () => {
      console.log('[EPAYCO-STALKERGIFT] Script cargado exitosamente')
      if (typeof window.ePayco !== 'undefined') {
        setEpaycoReady(true)
      }
    }

    script.onerror = (e) => {
      console.error('[EPAYCO-STALKERGIFT] Error cargando script:', e)
      setEpaycoReady(false)
    }

    document.body.appendChild(script)

    // Cleanup
    return () => {
      // No remover el script, se puede reutilizar
    }
  }, [isOpen])

  if (!isOpen) return null

  /** Sin portal, `fixed` queda limitado por `<main className="z-0">` y el sidebar (`z-50`) tapa el modal en tablet/desktop */
  if (!portalReady || typeof document === 'undefined') return null

  const stepTitles = [
    '¿Para quién es el regalo?',
    'Selecciona un producto',
    'Configura el regalo',
    'Resumen y pago',
  ]

  return createPortal(
    <>
    <div className="fixed inset-0 z-[2000000] flex items-center justify-center p-4 sm:p-6">
      {/* Capa transparente: cerrar al pulsar fuera, sin oscurecer el fondo */}
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
        aria-label="Cerrar"
        onClick={handleClose}
        disabled={isSubmitting}
      />
      <div
        className="relative z-10 flex h-[min(44rem,min(92dvh,90vh))] min-h-[20rem] w-full max-w-4xl flex-col overflow-hidden rounded-[25px] border border-[#FE9600]/50 bg-[#121212] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <GiftIcon className="h-5 w-5 shrink-0 text-[#FE9600]" />
            <h2 className="truncate text-base font-bold text-[#FE9600]">
              Crear StalkerGift
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="shrink-0 rounded-[25px] p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Marca a la izquierda, pasos a la derecha; título del paso debajo (compacto) */}
        <div className="shrink-0 border-b border-white/10 px-4 py-2.5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-left text-base font-bold leading-snug sm:text-lg">
              <span className="text-[#66DEDB]">Crea tu </span>
              <span className="text-[#FE9600]">#StalkerGift</span>
            </p>
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5" aria-hidden>
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`h-1.5 w-9 rounded-full transition-all duration-300 sm:h-2 sm:w-10 ${
                      step < currentStep
                        ? 'bg-[#FE9600]'
                        : step === currentStep
                          ? 'bg-[#66DEDB]'
                          : 'bg-gray-600'
                    }`}
                  />
                  {step < 4 ? <div className="w-1 sm:w-1.5" /> : null}
                </div>
              ))}
            </div>
          </div>
          <h2 className="mt-1.5 text-left text-base font-semibold leading-tight text-[#FE9600]">
            {stepTitles[currentStep - 1]}
          </h2>
          {currentStep === 2 && giftData.receiver?.user ? (
            <div className="mt-3 border-t border-white/10 pt-3">
              <FriendsPageSearchBar
                searchQuery={productSearchQuery}
                onSearchChange={setProductSearchQuery}
                searchPlaceholder="Busca el regalo ideal…"
              />
            </div>
          ) : null}
        </div>

        {/* Un solo scroll: grillas/listas debajo del buscador junto al título */}
        <div
          ref={contentScrollRef}
          className={
            currentStep === 2
              ? 'stalkergift-modal-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4 pt-3'
              : 'stalkergift-modal-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4'
          }
        >
          {currentStep === 1 && (
            <ReceiverSelector
              receiver={giftData.receiver}
              onSelect={(receiver) =>
                setGiftData((prev) => ({ ...prev, receiver }))
              }
            />
          )}

          {giftData.receiver?.user &&
          (currentStep === 2 || stashProductStepMounted) ? (
            <div
              className={currentStep !== 2 ? 'hidden min-h-0' : 'min-h-0'}
              aria-hidden={currentStep !== 2}
            >
              <ProductSelector
                receiver={giftData.receiver}
                product={giftData.product}
                variantId={giftData.variantId}
                prefetchedTopFeed={prefetchedTopFeed}
                modalSearch={{
                  query: productSearchQuery,
                  onQueryChange: setProductSearchQuery,
                }}
                onSelect={(product, variantId) =>
                  setGiftData((prev) => ({ ...prev, product, variantId }))
                }
              />
            </div>
          ) : null}

          {currentStep === 3 && (
            <GiftConfig
              product={giftData.product}
              variantId={giftData.variantId}
              senderAlias={giftData.senderAlias}
              senderMessage={giftData.senderMessage}
              onChange={(updates) => setGiftData({ ...giftData, ...updates })}
            />
          )}

          {currentStep === 4 && (
            <GiftSummary
              giftData={giftData}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            <Button
              onClick={handlePrevious}
              disabled={currentStep === 1 || isSubmitting}
              className="flex items-center gap-1.5 !rounded-[25px] border-0 !bg-transparent px-3 py-1.5 text-xs !text-gray-400 hover:!bg-white/5 hover:!text-white max-md:min-h-0 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Atrás
            </Button>

            <div className="shrink-0 px-2 text-xs text-gray-400 sm:px-4 sm:text-sm">
              {currentStep} de 4
            </div>

            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={isContinueDisabled}
                className="flex items-center gap-1.5 !rounded-[25px] border border-[#3db5b2]/80 px-4 py-2 text-xs font-semibold !text-[#0B1217] shadow-[inset_0_2px_6px_rgba(255,255,255,0.35),inset_0_-2px_6px_rgba(0,0,0,0.22)] !bg-[#66DEDB] hover:!bg-[#66DEDB] active:!bg-[#66DEDB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66DEDB]/45 disabled:opacity-50 max-md:min-h-0 sm:gap-2 sm:px-8 sm:py-3.5 sm:text-sm"
              >
                Continuar
                <ArrowRightIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="!rounded-[25px] border border-[#3db5b2]/80 px-4 py-2 text-xs font-semibold !text-[#0B1217] shadow-[inset_0_2px_6px_rgba(255,255,255,0.35),inset_0_-2px_6px_rgba(0,0,0,0.22)] !bg-[#66DEDB] hover:!bg-[#66DEDB] active:!bg-[#66DEDB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66DEDB]/45 disabled:opacity-50 max-md:min-h-0 sm:px-8 sm:py-3.5 sm:text-sm"
              >
                {isSubmitting ? 'Procesando...' : 'Pagar'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>

      {noticeModal ? (
        <div
          className="fixed inset-0 z-[2000020] flex min-h-0 items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stalkergift-notice-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0 bg-black/50 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none"
            aria-label="Cerrar"
            onClick={() => setNoticeModal(null)}
          />
          <div
            className="relative z-10 w-full max-w-[min(20rem,calc(100vw-2rem))] rounded-[22px] border border-[#FE9600]/45 bg-[#161616] px-5 py-6 shadow-[0_24px_64px_rgba(0,0,0,0.55)] ring-1 ring-white/5 md:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="stalkergift-notice-title"
              className="text-center text-[15px] leading-snug text-zinc-100"
            >
              {noticeModal}
            </p>
            <Button
              type="button"
              onClick={() => setNoticeModal(null)}
              className="mt-4 w-full !rounded-[25px] border border-[#3db5b2]/80 px-5 py-2 text-xs font-semibold !text-[#0B1217] shadow-[inset_0_2px_6px_rgba(255,255,255,0.35),inset_0_-2px_6px_rgba(0,0,0,0.22)] !bg-[#66DEDB] hover:!bg-[#66DEDB] active:!bg-[#66DEDB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66DEDB]/45 sm:mt-5 sm:py-2.5 sm:text-sm"
            >
              Entendido
            </Button>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  )
}

