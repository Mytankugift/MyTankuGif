'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAddresses } from '@/lib/hooks/use-addresses'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CheckoutOrderRequest, CheckoutDataCart, OrderDTO, AddressDTO, CreateAddressDTO } from '@/types/api'
import { AddressSelector } from '@/components/addresses/address-selector'
import { AddressFormModal } from '@/components/addresses/address-form-modal'
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

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, fetchCart, isLoading: cartLoading } = useCartStore()
  const { user, isAuthenticated } = useAuthStore()
  const { addresses, createAddress, updateAddress, deleteAddress, fetchAddresses } = useAddresses()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [buttonTooltip, setButtonTooltip] = useState<string | null>(null)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [epaycoReady, setEpaycoReady] = useState(false)

  // Dirección seleccionada
  const [selectedAddress, setSelectedAddress] = useState<AddressDTO | null>(null)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressDTO | null>(null)

  // Método de pago
  const [paymentMethod, setPaymentMethod] = useState<string>('cash_on_delivery')
  const [email, setEmail] = useState(user?.email || '')

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

  // Redirigir si no hay carrito o está vacío
  useEffect(() => {
    if (!cartLoading && (!cart || cart.items.length === 0)) {
      router.push('/cart')
    }
  }, [cart, cartLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setButtonTooltip(null)

    // Validaciones con tooltips
    if (!cart || cart.items.length === 0) {
      setButtonTooltip('El carrito está vacío')
      return
    }

    if (!email) {
      setButtonTooltip('El email es requerido')
      return
    }

    if (!selectedAddress) {
      setButtonTooltip('Por favor selecciona o crea una dirección de envío')
      return
    }

    // Mostrar modal de confirmación
    setShowConfirmationModal(true)
  }

  const handleConfirmOrder = async () => {
    if (!cart || !selectedAddress) return

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

      // Verificar que se pueda configurar
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

    setIsSubmitting(true)

    try {
      // Preparar dataForm con la dirección seleccionada
      const dataForm: CheckoutOrderRequest = {
        shipping_address: {
          first_name: selectedAddress.firstName,
          last_name: selectedAddress.lastName,
          address_1: selectedAddress.address1,
          address_2: selectedAddress.address2 || undefined,
          city: selectedAddress.city,
          province: selectedAddress.state,
          postal_code: selectedAddress.postalCode,
          country_code: selectedAddress.country,
          phone: selectedAddress.phone || undefined,
        },
        email,
        payment_method: paymentMethod,
        cart_id: cart.id,
      }

      // Preparar dataCart
      const dataCart: CheckoutDataCart = {
        customer_id: user?.id || '',
        cart_id: cart.id,
        producVariants: cart.items.map((item) => ({
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

            // Función para obtener URL del webhook (soporta desarrollo con túnel)
            const getWebhookUrl = () => {
              // En desarrollo, usar variable de entorno o detectar automáticamente
              if (process.env.NODE_ENV === 'development') {
                // Si hay una URL de túnel configurada, usarla
                const tunnelUrl = process.env.NEXT_PUBLIC_EPAYCO_WEBHOOK_URL
                if (tunnelUrl) {
                  return `${tunnelUrl}/api/v1/webhook/epayco/${preparedData.cartId}`
                }
                // Si no, intentar usar localhost (aunque ePayco no podrá alcanzarlo)
                console.warn('[EPAYCO] ⚠️ Usando localhost para webhook - ePayco no podrá alcanzarlo. Configura NEXT_PUBLIC_EPAYCO_WEBHOOK_URL con ngrok')
                return `http://localhost:9000/api/v1/webhook/epayco/${preparedData.cartId}`
              }
              // En producción, usar la URL configurada
              return `${process.env.NEXT_PUBLIC_EPAYCO_WEBHOOK_URL || 'https://www.mytanku.com'}/api/v1/webhook/epayco/${preparedData.cartId}`
            }

            // Preparar opciones para Epayco (usar cartId en lugar de orderId)
            const webhookUrl = getWebhookUrl()
            const epaycoOptions = {
              amount: preparedData.total,
              name: `Orden Tanku ${preparedData.cartId.slice(0, 8)}`,
              description: `Pedido Tanku - ${cart.items.length} producto(s)`,
              currency: 'cop',
              country: 'co',
              external: false,
              response: `${window.location.origin}/checkout/success?cartId=${preparedData.cartId}`,
              confirmation: webhookUrl,
              name_billing: selectedAddress.firstName || '',
              mobilephone_billing: selectedAddress.phone || '',
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
          const order = response.data as OrderDTO
          // Contra entrega - redirigir normalmente
          setShowConfirmationModal(false)
          router.push(`/orders/${order.id}`)
          
          // El carrito ya se limpió en el backend si Dropi fue exitoso
          // Solo actualizar el store del frontend
          setTimeout(() => {
            useCartStore.getState().clearCart()
          }, 100)
        }
      } else {
        setButtonTooltip(response.error?.message || 'Error al procesar el pedido')
        setShowConfirmationModal(false)
      }
    } catch (err: any) {
      console.error('Error en checkout:', err)
      setButtonTooltip(err.message || 'Error al procesar el pedido')
      setShowConfirmationModal(false)
    } finally {
      if (paymentMethod !== 'epayco') {
        setIsSubmitting(false)
      }
    }
  }

  if (cartLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
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
        <h1 className="text-3xl font-bold text-[#66DEDB]">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda: Formularios */}
          <div className="lg:col-span-2 space-y-6">
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

            {/* Dirección de envío */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#66DEDB]">Dirección de envío</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddress(null)
                    setIsAddressModalOpen(true)
                  }}
                  className="text-sm text-[#66DEDB] hover:text-[#5accc9] transition-colors font-medium"
                >
                  + Agregar dirección
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
                    // Actualizar selectedAddress después de eliminar
                    if (selectedAddress?.id === addressId) {
                      // Si era la dirección seleccionada, seleccionar la primera disponible o null
                      const remainingAddresses = addresses.filter(addr => addr.id !== addressId)
                      setSelectedAddress(
                        remainingAddresses.length > 0 
                          ? (remainingAddresses.find(addr => addr.isDefaultShipping) || remainingAddresses[0])
                          : null
                      )
                    }
                  } catch (err) {
                    console.error('Error eliminando dirección:', err)
                  }
                }}
              />
            </div>
          </div>

          {/* Columna derecha: Resumen y Método de pago */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <CheckoutSummary cart={cart} />
              
              {/* Método de pago */}
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-[#66DEDB]">Método de pago</h2>
                <CheckoutPaymentMethod
                  value={paymentMethod}
                  onChange={setPaymentMethod}
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
              {isSubmitting ? 'Procesando...' : 'Completar pedido'}
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

      {/* Modal de dirección */}
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
              // Cuando es creación, todos los campos requeridos están presentes
              // El formulario valida que firstName, lastName, address1, city, state, postalCode existan
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
            // Refrescar lista de direcciones después de crear/actualizar
            await fetchAddresses()
          } catch (err) {
            console.error('Error guardando dirección:', err)
            throw err // Re-lanzar para que el modal maneje el error
          } finally {
            setIsAddressModalOpen(false)
            setEditingAddress(null)
          }
        }}
      />

      {/* Modal de confirmación */}
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

