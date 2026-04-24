'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAddresses } from '@/lib/hooks/use-addresses'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CheckoutOrderRequest, CheckoutDataCart, OrderDTO, AddressDTO, CreateAddressDTO } from '@/types/api'
import { AddressSelector } from '@/components/addresses/address-selector'
import { AddressFormModal } from '@/components/addresses/address-form-modal'
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
function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { cart, fetchCart, isLoading: cartLoading, removeItems } = useCartStore()
  const { user, isAuthenticated } = useAuthStore()
  const { addresses, createAddress, updateAddress, deleteAddress, fetchAddresses } = useAddresses()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [buttonTooltip, setButtonTooltip] = useState<string | null>(null)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [epaycoReady, setEpaycoReady] = useState(false)
  
  // Obtener items seleccionados de la URL
  const selectedItemIds = new Set(
    searchParams.get('items')?.split(',').filter(Boolean) || []
  )

  // Dirección seleccionada
  const [selectedAddress, setSelectedAddress] = useState<AddressDTO | null>(null)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressDTO | null>(null)

  // Método de pago
  const [paymentMethod, setPaymentMethod] = useState<string>('cash_on_delivery')
  const [email, setEmail] = useState(user?.email || '')
  
  // Detectar si es carrito de regalos
  const isGiftCart = cart?.isGiftCart === true
  const giftRecipientId = cart?.giftRecipientId

  // Cargar carrito y direcciones al montar
  useEffect(() => {
    if (!cart) {
      fetchCart()
    }
    fetchAddresses()
  }, [cart, fetchCart, fetchAddresses])

  // Seleccionar dirección por defecto si existe
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddress = addresses.find((addr) => addr.isDefaultShipping) || addresses[0]
      setSelectedAddress(defaultAddress)
    }
    // También actualizar selectedAddress si la dirección seleccionada fue eliminada o actualizada
    if (selectedAddress && addresses.length > 0) {
      const found = addresses.find((addr) => addr.id === selectedAddress.id)
      if (found) {
        setSelectedAddress(found) // Actualizar con la versión más reciente
      } else if (addresses.length > 0) {
        // Si la dirección seleccionada ya no existe, seleccionar la primera disponible
        setSelectedAddress(addresses.find((addr) => addr.isDefaultShipping) || addresses[0])
      }
    }
  }, [addresses, selectedAddress])

  // Filtrar items seleccionados
  const selectedItems = cart && selectedItemIds.size > 0
    ? cart.items.filter(item => selectedItemIds.has(item.id))
    : cart?.items || []

  // Redirigir si no hay carrito o no hay items seleccionados
  useEffect(() => {
    if (!cartLoading && (!cart || selectedItems.length === 0)) {
      router.push('/cart')
    }
  }, [cart, cartLoading, router, selectedItems.length])

  // Redirigir al login si no hay usuario autenticado
  useEffect(() => {
    if (!cartLoading && cart && cart.items.length > 0 && !isAuthenticated) {
      console.log('[CHECKOUT] Usuario no autenticado, redirigiendo al login...')
      // Guardar el cartId en localStorage para recuperarlo después del login
      if (cart?.id) {
        localStorage.setItem('guest-cart-id', cart.id)
      }
      // Guardar redirección en sessionStorage para volver al checkout después del login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirect-after-login', '/checkout')
      }
      // Redirigir al feed con mensaje (el botón de login está ahí)
      router.push('/feed')
    }
  }, [cart, cartLoading, isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setButtonTooltip(null)

    // Verificar que el usuario esté autenticado
    if (!isAuthenticated || !user) {
      console.log('[CHECKOUT] Usuario no autenticado, redirigiendo al login...')
      // Guardar el cartId en localStorage para recuperarlo después del login
      if (cart?.id) {
        localStorage.setItem('guest-cart-id', cart.id)
      }
      // Guardar redirección en sessionStorage para volver al checkout después del login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirect-after-login', '/checkout')
      }
      // Redirigir al feed (el botón de login está ahí)
      router.push('/feed')
      return
    }

    // Validaciones con tooltips
    if (!cart || selectedItems.length === 0) {
      setButtonTooltip('No hay productos seleccionados')
      return
    }

    if (!email) {
      setButtonTooltip('El email es requerido')
      return
    }

    // Para carritos normales, validar dirección
    // Para carritos de regalos, la dirección se obtiene automáticamente del destinatario
    if (!isGiftCart && !selectedAddress) {
      setButtonTooltip('Por favor selecciona o crea una dirección de envío')
      return
    }

    // Mostrar modal de confirmación
    setShowConfirmationModal(true)
  }

  const handleConfirmOrder = async () => {
    if (!cart) return
    // Para carritos normales, validar dirección
    // Para carritos de regalos, la dirección se obtiene automáticamente del destinatario
    if (!isGiftCart && !selectedAddress) return

    console.log('[CHECKOUT] Iniciando confirmación de pedido')
    console.log('[CHECKOUT] Método de pago seleccionado:', paymentMethod)
    console.log('[CHECKOUT] Epayco listo (estado):', epaycoReady)
    console.log('[CHECKOUT] window.ePayco disponible:', typeof window.ePayco !== 'undefined')

    // Para Epayco: validar que esté disponible ANTES de crear la orden
    if (paymentMethod === 'epayco') {
      // Verificar que el script esté cargado
      if (!epaycoReady) {
        setButtonTooltip('ePayco aún no está listo. Por favor, espera un momento y vuelve a intentar.')
        console.warn('[CHECKOUT] Epayco no está listo todavía')
        return
      }

      // Verificar que Epayco esté cargado
      if (typeof window.ePayco === 'undefined') {
        setButtonTooltip('ePayco no está cargado. Por favor, recarga la página.')
        console.error('[CHECKOUT] window.ePayco no está definido')
        return
      }

      // Checkout clásico: validar llave pública. Smart usa sessionId del backend (Apify).
      if (!isEpaycoSmartMode()) {
        try {
          const epaycoKey = process.env.NEXT_PUBLIC_EPAYCO_KEY
          if (!epaycoKey) {
            setButtonTooltip('Error: NEXT_PUBLIC_EPAYCO_KEY no está configurada en las variables de entorno.')
            console.error('[CHECKOUT] NEXT_PUBLIC_EPAYCO_KEY no está configurada')
            return
          }
          const epaycoTestMode = process.env.NEXT_PUBLIC_EPAYCO_TEST_MODE !== 'false'
          console.log('[CHECKOUT] Validando Epayco con key:', epaycoKey)
          console.log('[CHECKOUT] Test mode:', epaycoTestMode)
          const testHandler = window.ePayco.checkout.configure({
            key: epaycoKey,
            test: epaycoTestMode,
          })
          if (!testHandler) {
            setButtonTooltip('No se pudo configurar ePayco. Por favor, intenta de nuevo.')
            console.error('[CHECKOUT] No se pudo configurar el handler de Epayco')
            return
          }
          console.log('[CHECKOUT] Epayco validado exitosamente')
        } catch (epaycoTestError: any) {
          console.error('[CHECKOUT] Error validando Epayco:', epaycoTestError)
          setButtonTooltip('Error al validar ePayco: ' + (epaycoTestError?.message || 'Error desconocido'))
          return
        }
      }
    }

    setIsSubmitting(true)

    try {
      // Preparar dataForm
      // Para carritos de regalos, la dirección se obtiene automáticamente del destinatario en el backend
      // Para carritos normales, usar la dirección seleccionada
      const dataForm: CheckoutOrderRequest = {
        shipping_address: isGiftCart && selectedAddress
          ? {
              // Para regalos, el backend ignorará esta dirección y usará la del destinatario
              // Pero necesitamos enviar algo para que el tipo sea válido
              first_name: selectedAddress.firstName,
              last_name: selectedAddress.lastName,
              address_1: selectedAddress.address1,
              address_2: selectedAddress.address2 || undefined,
              city: selectedAddress.city,
              province: selectedAddress.state,
              postal_code: selectedAddress.postalCode,
              country_code: selectedAddress.country,
              phone: selectedAddress.phone || undefined,
            }
          : selectedAddress
          ? {
              first_name: selectedAddress.firstName,
              last_name: selectedAddress.lastName,
              address_1: selectedAddress.address1,
              address_2: selectedAddress.address2 || undefined,
              city: selectedAddress.city,
              province: selectedAddress.state,
              postal_code: selectedAddress.postalCode,
              country_code: selectedAddress.country,
              phone: selectedAddress.phone || undefined,
            }
          : {
              // Placeholder - no debería llegar aquí por las validaciones
              first_name: '',
              last_name: '',
              address_1: '',
              city: '',
              province: '',
              postal_code: '',
              country_code: 'CO',
            },
        email,
        payment_method: paymentMethod,
        cart_id: cart.id,
      }

      // Preparar dataCart (userId viene del backend ahora que requiere autenticación)
      const dataCart: CheckoutDataCart = {
        customer_id: user?.id || '', // Ya no es crítico porque el backend usa userId del token
        cart_id: cart.id,
        producVariants: selectedItems.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
          original_total: item.total,
          unit_price: item.unitPrice,
        })),
      }

      if (paymentMethod === 'epayco' && isEpaycoSmartMode()) {
        setShowConfirmationModal(false)
        try {
          const smartRes = await apiClient.post<{ sessionId: string }>(
            API_ENDPOINTS.CHECKOUT.EPAYCO_SMART_SESSION,
            { flow: 'cart', dataForm, dataCart }
          )
          if (!smartRes.success || !smartRes.data?.sessionId) {
            throw new Error(
              (smartRes as { error?: { message?: string } }).error?.message ||
                'No se pudo crear la sesión de pago'
            )
          }
          if (typeof window !== 'undefined' && selectedItemIds.size > 0) {
            localStorage.setItem('epayco-selected-items', JSON.stringify(Array.from(selectedItemIds)))
          }
          openEpaycoSmartCheckout(smartRes.data.sessionId)
        } catch (epaycoSmartErr: any) {
          console.error('[EPAYCO-SMART]', epaycoSmartErr)
          setButtonTooltip(epaycoSmartErr.message || 'Error al iniciar el pago')
          setShowConfirmationModal(false)
        } finally {
          setIsSubmitting(false)
        }
        return
      }

      // Llamar al endpoint de checkout (classic / contra entrega)
      const response = await apiClient.post<any>(
        API_ENDPOINTS.CHECKOUT.ADD_ORDER,
        {
          dataForm,
          dataCart,
        }
      )

      if (response.success && response.data) {
        console.log('[CHECKOUT] Respuesta del backend recibida:', response.data)
        console.log('[CHECKOUT] Tipo de respuesta:', response.data?.paymentMethod || 'No tiene paymentMethod')
        console.log('[CHECKOUT] Tiene cartId:', !!response.data?.cartId)
        console.log('[CHECKOUT] Tiene id (orden):', !!response.data?.id)

        // Si es Epayco, solo se prepararon los datos (no se creó orden)
        if (paymentMethod === 'epayco') {
          // Verificar que la respuesta tiene cartId (no id, que sería de una orden)
          if (!response.data.cartId) {
            console.error('[CHECKOUT] Error: Respuesta del backend no tiene cartId para Epayco:', response.data)
            setButtonTooltip('Error: El backend no retornó los datos esperados para Epayco. ¿El método de pago es correcto?')
            setIsSubmitting(false)
            setShowConfirmationModal(false)
            return
          }

          const preparedData = response.data
          console.log('[CHECKOUT] Datos preparados para Epayco:', preparedData)
          
          // Guardar items seleccionados para el webhook
          if (typeof window !== 'undefined' && selectedItemIds.size > 0) {
            localStorage.setItem('epayco-selected-items', JSON.stringify(Array.from(selectedItemIds)))
          }
          
          try {
            // Cerrar modal de confirmación
            setShowConfirmationModal(false)

            // Verificar que Epayco esté cargado (ya validado antes, pero por seguridad)
            if (typeof window.ePayco === 'undefined') {
              throw new Error('ePayco no está cargado. Por favor, recarga la página.')
            }

            console.log('[EPAYCO] Iniciando configuración de Epayco...')
            console.log('[EPAYCO] Cart ID:', preparedData.cartId)
            console.log('[EPAYCO] Total:', preparedData.total)

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
            console.log('[EPAYCO] Configurando checkout con key:', epaycoKey)
            console.log('[EPAYCO] Test mode:', epaycoTestMode)
            const handler = window.ePayco.checkout.configure({
              key: epaycoKey,
              test: epaycoTestMode,
            })

            if (!handler) {
              throw new Error('No se pudo configurar el checkout de ePayco')
            }

            console.log('[EPAYCO] Handler configurado exitosamente')

            // ✅ Obtener URL del webhook desde el backend
            // El backend genera la URL correcta según el entorno (proxy en producción, ngrok en desarrollo)
            const webhookResponse = await apiClient.get<{ webhookUrl: string }>(
              `/api/v1/checkout/webhook-url?cartId=${preparedData.cartId}`
            )

            if (!webhookResponse.success || !webhookResponse.data?.webhookUrl) {
              throw new Error('No se pudo obtener la URL del webhook desde el backend')
            }

            const webhookUrl = webhookResponse.data.webhookUrl
            console.log('[EPAYCO] URL de webhook obtenida del backend:', webhookUrl)

            // Preparar opciones para Epayco (usar cartId en lugar de orderId)
            const epaycoOptions = {
              amount: preparedData.total,
              name: `Orden Tanku ${preparedData.cartId.slice(0, 8)}`,
              description: `Pedido Tanku - ${selectedItems.length} producto(s)`,
              currency: 'cop',
              country: 'co',
              external: false,
              // Epayco añadirá automáticamente ref_payco como parámetro de query
              response: `${window.location.origin}/checkout/success`,
              confirmation: webhookUrl,
              name_billing: selectedAddress?.firstName || '',
              mobilephone_billing: selectedAddress?.phone || '',
            }

            console.log('[EPAYCO] Opciones configuradas:', epaycoOptions)
            console.log('[EPAYCO] URL de webhook:', webhookUrl)
            console.log('[EPAYCO] Modo:', process.env.NODE_ENV)

            // Abrir pasarela de pago
            console.log('[EPAYCO] Abriendo pasarela de pago...')
            handler.open(epaycoOptions)
            console.log('[EPAYCO] Pasarela de pago abierta exitosamente')
            
            // NO limpiar el carrito aquí - se limpiará en el webhook cuando el pago sea confirmado
          } catch (epaycoError: any) {
            console.error('[EPAYCO] Error abriendo Epayco:', epaycoError)
            console.error('[EPAYCO] Error stack:', epaycoError?.stack)
            console.error('[EPAYCO] Error details:', {
              message: epaycoError?.message,
              name: epaycoError?.name,
              type: typeof epaycoError,
            })
            
            // NO hay orden que eliminar, y el carrito NO se vació
            setButtonTooltip(epaycoError.message || 'Error al abrir la pasarela de pago')
            setIsSubmitting(false)
            setShowConfirmationModal(false)
            // El carrito mantiene los items, el usuario puede reintentar
          }
        } else {
          // Contra entrega - se creó la orden
          const order = response.data as OrderDTO & { 
            dropiSuccess?: boolean
            dropiOrderIds?: number[]
          }
          
          // Verificar si Dropi fue exitoso antes de redirigir
          if (!order.dropiSuccess) {
            setButtonTooltip('Error al crear orden en Dropi. Por favor, intenta nuevamente.')
            setShowConfirmationModal(false)
            setIsSubmitting(false)
            return
          }
          
          // Dropi exitoso - redirigir directamente a la tab de mis compras en el perfil
          setShowConfirmationModal(false)
          router.push(`/profile?tab=MIS_TANKUS&orderId=${order.id}`)
          
          // Limpiar selección guardada
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cart-selected-items')
          }
          
          // El backend ya eliminó solo los items seleccionados
          // Solo recargar el carrito para actualizar UI
          setTimeout(() => {
            fetchCart()
          }, 100)
        }
      } else {
        // Mejorar mensajes de error para regalos
        let errorMessage = response.error?.message || 'Error al procesar el pedido'
        
        if (isGiftCart) {
          if (errorMessage.includes('contraentrega') || errorMessage.includes('cash_on_delivery')) {
            errorMessage = 'Los regalos solo se pueden pagar con Epayco. El método de pago contraentrega no está disponible para regalos.'
          } else if (errorMessage.includes('no puede recibir regalos') || errorMessage.includes('dirección')) {
            errorMessage = 'El destinatario ya no puede recibir regalos o no tiene una dirección configurada. Por favor, verifica la configuración del destinatario.'
          } else if (errorMessage.includes('No puedes enviar regalos')) {
            errorMessage = 'No puedes enviar regalos a este usuario. Su perfil es privado y no eres su amigo.'
          }
        }
        
        setButtonTooltip(errorMessage)
        setShowConfirmationModal(false)
      }
    } catch (err: any) {
      console.error('Error en checkout:', err)
      
      // Mejorar mensajes de error para regalos
      let errorMessage = err.message || 'Error al procesar el pedido'
      
      if (isGiftCart) {
        if (errorMessage.includes('contraentrega') || errorMessage.includes('cash_on_delivery')) {
          errorMessage = 'Los regalos solo se pueden pagar con Epayco. El método de pago contraentrega no está disponible para regalos.'
        } else if (errorMessage.includes('no puede recibir regalos') || errorMessage.includes('dirección')) {
          errorMessage = 'El destinatario ya no puede recibir regalos o no tiene una dirección configurada. Por favor, verifica la configuración del destinatario.'
        } else if (errorMessage.includes('No puedes enviar regalos')) {
          errorMessage = 'No puedes enviar regalos a este usuario. Su perfil es privado y no eres su amigo.'
        }
      }
      
      setButtonTooltip(errorMessage)
      setShowConfirmationModal(false)
    } finally {
      if (paymentMethod !== 'epayco') {
        setIsSubmitting(false)
      }
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
          pageTitle="Checkout"
          pageTitleColor="#FFFFFF"
          startContent={navBack}
          mobileBackCenterTitleCartOnly
          mobileTranslucentNav
        />
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden" id="checkout-scroll-root">
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

  if (!cart || selectedItems.length === 0) {
    return null // El useEffect redirigirá
  }

  return (
    <>
      <BaseNav
        showStories={false}
        canHide={false}
        isVisible={true}
        pageTitle="Checkout"
        pageTitleColor="#FFFFFF"
        startContent={navBack}
        mobileBackCenterTitleCartOnly
        mobileTranslucentNav
      />
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden" id="checkout-scroll-root">
        <div className={CHECKOUT_TANKU_SCROLL_INNER} style={CHECKOUT_TANKU_PAGE_BG}>
          <div className="mx-auto max-w-4xl">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 lg:items-start">
                <div className="space-y-8 lg:col-span-7">
                  {isGiftCart && (
                    <div className="rounded-2xl border border-[#66DEDB]/25 bg-[#66DEDB]/[0.08] p-4 backdrop-blur-md ring-1 ring-inset ring-[#66DEDB]/15">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">🎁</span>
                        <div>
                          <p className="font-semibold text-[#66DEDB]">Enviando regalo</p>
                          <p className="mt-1 text-sm text-zinc-400">
                            La dirección de envío se obtendrá automáticamente del destinatario.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isGiftCart && (
                    <div className={CHECKOUT_TANKU_SURFACE}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className={`${CHECKOUT_TANKU_SECTION_LABEL} !mb-0`}>Dirección de envío</p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddress(null)
                            setIsAddressModalOpen(true)
                          }}
                          className="shrink-0 text-xs font-medium text-[#66DEDB] transition-opacity hover:opacity-80"
                        >
                          + Agregar
                        </button>
                      </div>
                      <AddressSelector
                        addresses={addresses}
                        isLoading={false}
                        selectedAddressId={selectedAddress?.id || null}
                        onSelectAddress={(address) => setSelectedAddress(address)}
                        onEdit={(address) => {
                          setEditingAddress(address)
                          setIsAddressModalOpen(true)
                        }}
                        onDelete={async (addressId) => {
                          try {
                            await deleteAddress(addressId)
                            if (selectedAddress?.id === addressId) {
                              const remainingAddresses = addresses.filter((addr) => addr.id !== addressId)
                              setSelectedAddress(
                                remainingAddresses.length > 0
                                  ? remainingAddresses.find((addr) => addr.isDefaultShipping) || remainingAddresses[0]
                                  : null,
                              )
                            }
                          } catch (err) {
                            console.error('Error eliminando dirección:', err)
                          }
                        }}
                        variant="tanku"
                      />
                    </div>
                  )}

                  <CheckoutProductList items={selectedItems} />

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
                    <CheckoutSummary
                      cart={{ ...cart, items: selectedItems }}
                      isGiftCart={isGiftCart}
                      showLineItems={false}
                    />

                    <div className={CHECKOUT_TANKU_SURFACE}>
                      <p className={CHECKOUT_TANKU_SECTION_LABEL}>Pago</p>
                      <p className="mb-4 text-sm text-zinc-500">
                        {isGiftCart
                          ? 'Pasarela segura con Epayco.'
                          : 'Pasarela segura con Epayco, o pago contra entrega al recibir.'}
                      </p>
                      <CheckoutPaymentMethod
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        isGiftCart={isGiftCart}
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
                        {isSubmitting ? 'Procesando...' : 'Completar pedido'}
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

      <AddressFormModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false)
          setEditingAddress(null)
        }}
        address={editingAddress}
        onSubmit={async (data) => {
          try {
            if (editingAddress) {
              const updated = await updateAddress(editingAddress.id, data)
              if (selectedAddress?.id === editingAddress.id) {
                setSelectedAddress(updated)
              }
            } else {
              const createData: CreateAddressDTO = {
                firstName: data.firstName!,
                lastName: data.lastName!,
                phone: data.phone,
                address1: data.address1!,
                address2: data.address2,
                city: data.city!,
                state: data.state!,
                postalCode: data.postalCode!,
                country: data.country,
                isDefaultShipping: data.isDefaultShipping,
                metadata: data.metadata,
              }
              const newAddress = await createAddress(createData)
              setSelectedAddress(newAddress)
            }
            await fetchAddresses()
          } catch (err) {
            console.error('Error guardando dirección:', err)
            throw err
          } finally {
            setIsAddressModalOpen(false)
            setEditingAddress(null)
          }
        }}
      />

      {cart && (
        <CheckoutConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            if (!isSubmitting) {
              setShowConfirmationModal(false)
            }
          }}
          onConfirm={handleConfirmOrder}
          cart={cart}
          paymentMethod={paymentMethod}
          isSubmitting={isSubmitting}
          selectedItems={selectedItems}
        />
      )}
    </>
  )
}

// Componente principal con Suspense boundary
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-gray-400">Cargando...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

