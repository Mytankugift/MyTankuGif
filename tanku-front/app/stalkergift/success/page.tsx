'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { StalkerGiftDTO } from '@/types/api'
import { CheckCircleIcon, XCircleIcon, ClockIcon, ShareIcon } from '@heroicons/react/24/outline'

function StalkerGiftSuccessContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failed' | null>(null)
  const [refPayco, setRefPayco] = useState<string | null>(null)
  const [cartId, setCartId] = useState<string | null>(null)
  const [stalkerGift, setStalkerGift] = useState<StalkerGiftDTO | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    // Obtener parámetros de la URL directamente desde window.location
    if (typeof window === 'undefined') return
    
    const urlParams = new URLSearchParams(window.location.search)
    const refPaycoParam = urlParams.get('ref_payco')
    const cartIdParam = urlParams.get('cartId')

    setRefPayco(refPaycoParam)
    setCartId(cartIdParam)

    if (refPaycoParam) {
      // Consultar el estado de la transacción usando ref_payco (ePayco)
      verifyPaymentStatus(refPaycoParam, cartIdParam)
    } else if (cartIdParam) {
      // Si no hay ref_payco, verificar por cartId
      checkStalkerGiftStatus(cartIdParam)
    } else {
      setIsLoading(false)
      setPaymentStatus('failed')
      setErrorMessage('No se encontraron parámetros de pago en la URL')
    }
  }, [])

  const verifyPaymentStatus = async (refPayco: string, cartId: string | null) => {
    try {
      console.log('[STALKERGIFT-SUCCESS] Verificando pago con ref_payco:', refPayco)
      
      // Buscar StalkerGift por cartId en metadata
      if (cartId) {
        await loadStalkerGiftByCartId(cartId)
      }

      // Consultar estado en ePayco
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
      console.log('[STALKERGIFT-SUCCESS] Datos de ePayco:', data)

      // Mapear estado de ePayco
      const epaycoResponse = data.data?.x_response || data.x_response
      
      if (epaycoResponse === 'Aceptada' || epaycoResponse === 'Aprobada' || epaycoResponse === '1') {
        // Pago exitoso
        setPaymentStatus('success')
        
        // Si no tenemos el StalkerGift aún, esperar un poco y reintentar
        if (!stalkerGift && cartId) {
          setTimeout(async () => {
            await loadStalkerGiftByCartId(cartId)
          }, 3000)
        }
      } else if (epaycoResponse === 'Pendiente' || epaycoResponse === '2') {
        setPaymentStatus('pending')
        setErrorMessage('El pago está pendiente de confirmación')
      } else if (epaycoResponse === 'Rechazada' || epaycoResponse === 'Rechazado' || epaycoResponse === 'Fallida' || epaycoResponse === '3' || epaycoResponse === '4') {
        setPaymentStatus('failed')
        setErrorMessage(data.data?.x_response_reason_text || data.x_response_reason_text || 'El pago fue rechazado')
      } else {
        setPaymentStatus('failed')
        setErrorMessage(data.data?.x_response_reason_text || data.x_response_reason_text || `El pago no fue exitoso. Estado: ${epaycoResponse}`)
      }
    } catch (error) {
      console.error('[STALKERGIFT-SUCCESS] Error verificando pago:', error)
      setPaymentStatus('pending')
      setErrorMessage('No se pudo verificar el estado del pago. Por favor, verifica más tarde.')
    } finally {
      setIsLoading(false)
    }
  }

  const checkStalkerGiftStatus = async (cartIdToCheck: string) => {
    try {
      console.log('[STALKERGIFT-SUCCESS] Verificando StalkerGift por cartId:', cartIdToCheck)
      await loadStalkerGiftByCartId(cartIdToCheck)
    } catch (error: any) {
      console.error('[STALKERGIFT-SUCCESS] Error verificando StalkerGift:', error)
      setPaymentStatus('pending')
      setErrorMessage('No se pudo verificar el estado del regalo. Por favor, verifica más tarde.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadStalkerGiftByCartId = async (cartIdToLoad: string) => {
    try {
      // Buscar StalkerGift desde los enviados del usuario (el que tiene este cartId en metadata)
      const response = await apiClient.get<StalkerGiftDTO[]>(API_ENDPOINTS.STALKER_GIFT.SENT)

      if (response.success && response.data) {
        // Buscar el StalkerGift que tiene este cartId en su metadata
        // Nota: En el backend, el cartId se guarda en el carrito temporal, no directamente en StalkerGift
        // Necesitamos buscar el StalkerGift más reciente del usuario
        const gifts = response.data as StalkerGiftDTO[]
        const recentGift = gifts.length > 0 ? gifts[0] : null // El más reciente debería ser el que acabamos de crear

        if (recentGift) {
          setStalkerGift(recentGift)
          
          // Actualizar estado según el estado del StalkerGift
          if (recentGift.estado === 'WAITING_ACCEPTANCE' || recentGift.estado === 'PAID') {
            setPaymentStatus('success')
          } else if (recentGift.estado === 'CREATED') {
            setPaymentStatus('pending')
            setErrorMessage('El pago está siendo procesado...')
          } else {
            setPaymentStatus('failed')
            setErrorMessage('El regalo no se pudo crear correctamente')
          }
        }
      }
    } catch (error: any) {
      console.error('[STALKERGIFT-SUCCESS] Error cargando StalkerGift:', error)
    }
  }

  const copyLinkToClipboard = async () => {
    if (stalkerGift?.uniqueLink) {
      try {
        await navigator.clipboard.writeText(stalkerGift.uniqueLink)
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 3000)
      } catch (error) {
        console.error('Error copiando link:', error)
      }
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
              <CheckCircleIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#66DEDB] mb-2">
              ¡StalkerGift pagado exitosamente!
            </h1>
            <p className="text-gray-300 mb-6">
              Tu regalo ha sido pagado correctamente. Ahora puedes compartir el link con el receptor.
            </p>
            
            {stalkerGift?.uniqueLink && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400 mb-2">Link único del regalo:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={stalkerGift.uniqueLink}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white font-mono"
                  />
                  <button
                    onClick={copyLinkToClipboard}
                    className="px-4 py-2 bg-[#66DEDB] hover:bg-[#5accc9] text-black rounded transition-colors"
                  >
                    <ShareIcon className="w-5 h-5" />
                  </button>
                </div>
                {linkCopied && (
                  <p className="text-sm text-[#73FFA2] mt-2">¡Link copiado al portapapeles!</p>
                )}
              </div>
            )}

            {refPayco && (
              <p className="text-sm text-gray-400 mb-2">
                Referencia de pago: <span className="font-mono text-[#66DEDB]">{refPayco}</span>
              </p>
            )}
            
            {stalkerGift && (
              <p className="text-sm text-gray-400 mb-6">
                ID del regalo: <span className="font-mono text-[#66DEDB]">{stalkerGift.id.slice(0, 8)}</span>
              </p>
            )}

            <div className="flex gap-4 justify-center flex-wrap">
              {stalkerGift?.uniqueLink && (
                <Button
                  onClick={copyLinkToClipboard}
                  className="bg-[#66DEDB] hover:bg-[#5accc9] text-black"
                >
                  {linkCopied ? '✓ Copiado' : 'Copiar link'}
                </Button>
              )}
              <Link href="/stalkergift">
                <Button className="bg-[#66DEDB] hover:bg-[#5accc9] text-black">
                  Ver mis StalkerGifts
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
              <ClockIcon className="w-8 h-8 text-white" />
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
              <Link href="/stalkergift">
                <Button className="bg-[#66DEDB] hover:bg-[#5accc9] text-black">
                  Ver mis StalkerGifts
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
              <XCircleIcon className="w-8 h-8 text-white" />
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
              <Link href="/stalkergift">
                <Button className="bg-[#66DEDB] hover:bg-[#5accc9] text-black">
                  Intentar nuevamente
                </Button>
              </Link>
              <Link href="/">
                <Button variant="secondary">Volver al inicio</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StalkerGiftSuccessPage() {
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
      <StalkerGiftSuccessContent />
    </Suspense>
  )
}
