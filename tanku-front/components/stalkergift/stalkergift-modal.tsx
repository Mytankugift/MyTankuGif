'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { XMarkIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { ReceiverSelector } from './receiver-selector'
import { ProductSelector } from './product-selector'
import { GiftConfig } from './gift-config'
import { GiftSummary } from './gift-summary'
import { Button } from '@/components/ui/button'
import Script from 'next/script'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { User, ProductDTO } from '@/types/api'

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

type ReceiverType = 'tanku' | 'external'

interface ReceiverData {
  type: ReceiverType
  user?: User
  externalData?: {
    email?: string
    instagram?: string
    phone?: string
    name?: string
  }
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
  const router = useRouter()
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
  const { user } = useAuthStore()

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
    }
  }, [isOpen])

  const handleNext = () => {
    if (currentStep < 4) {
      // Validaciones por paso
      if (currentStep === 1 && !giftData.receiver) {
        alert('Por favor selecciona un receptor')
        return
      }
      if (currentStep === 2 && !giftData.product) {
        alert('Por favor selecciona un producto')
        return
      }
      if (currentStep === 3 && !giftData.senderAlias.trim()) {
        alert('Por favor ingresa tu alias')
        return
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

  const handleSubmit = async () => {
    if (!giftData.receiver || !giftData.product || !giftData.senderAlias.trim()) {
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
        receiverId: giftData.receiver.type === 'tanku' ? giftData.receiver.user?.id : undefined,
        externalReceiverData: giftData.receiver.type === 'external' ? giftData.receiver.externalData : undefined,
        productId: giftData.product.id,
        variantId: giftData.variantId || undefined,
        quantity: giftData.quantity,
        senderAlias: giftData.senderAlias.trim(),
        senderMessage: giftData.senderMessage.trim() || undefined,
      }

      // Llamar al endpoint de checkout
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
          const receiverName = giftData.receiver.type === 'tanku' && giftData.receiver.user
            ? `${giftData.receiver.user.firstName || ''} ${giftData.receiver.user.lastName || ''}`.trim() || giftData.receiver.user.email?.split('@')[0] || 'Receptor'
            : giftData.receiver.externalData?.name || giftData.receiver.externalData?.instagram || 'Receptor'

          const receiverPhone = giftData.receiver.type === 'tanku' && giftData.receiver.user?.profile?.phone
            ? giftData.receiver.user.profile.phone
            : giftData.receiver.externalData?.phone || ''

          // Preparar opciones para Epayco
          const epaycoOptions = {
            amount: preparedData.total,
            name: `StalkerGift ${preparedData.stalkerGiftId.slice(0, 8)}`,
            description: `Regalo anónimo - ${giftData.product.title} (x${giftData.quantity})`,
            currency: 'cop',
            country: 'co',
            external: false,
            response: `${window.location.origin}/stalkergift/success`,
            confirmation: webhookUrl,
            name_billing: receiverName,
            mobilephone_billing: receiverPhone,
          }

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
    script.src = process.env.NEXT_PUBLIC_EPAYCO_CHECKOUT_URL || 'https://checkout.epayco.co/checkout.js'
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

  const stepTitles = [
    '¿Para quién es el regalo?',
    'Selecciona un producto',
    'Configura el regalo',
    'Resumen y pago',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <div>
            <h2 className="text-2xl font-bold text-[#66DEDB]">Enviar StalkerGift</h2>
            <p className="text-sm text-gray-400 mt-1">
              Paso {currentStep} de 4: {stepTitles[currentStep - 1]}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step <= currentStep
                      ? 'bg-[#73FFA2] text-black'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step < currentStep ? 'bg-[#73FFA2]' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <ReceiverSelector
              receiver={giftData.receiver}
              onSelect={(receiver) => setGiftData({ ...giftData, receiver })}
            />
          )}

          {currentStep === 2 && (
            <ProductSelector
              receiver={giftData.receiver}
              product={giftData.product}
              variantId={giftData.variantId}
              onSelect={(product, variantId) =>
                setGiftData({ ...giftData, product, variantId })
              }
            />
          )}

          {currentStep === 3 && (
            <GiftConfig
              product={giftData.product}
              variantId={giftData.variantId}
              quantity={giftData.quantity}
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
        <div className="flex items-center justify-between p-6 border-t border-gray-700 sticky bottom-0 bg-gray-800">
          <Button
            onClick={handlePrevious}
            disabled={currentStep === 1 || isSubmitting}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Anterior
          </Button>

          <div className="text-sm text-gray-400">
            Paso {currentStep} de 4
          </div>

          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="bg-[#73FFA2] hover:bg-[#66DEDB] text-black font-semibold flex items-center gap-2"
            >
              Siguiente
              <ArrowRightIcon className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#73FFA2] hover:bg-[#66DEDB] text-black font-semibold"
            >
              {isSubmitting ? 'Procesando...' : 'Pagar con ePayco'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

