"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}

export default function OrderConfirmedPage({ params }: Props) {
  const router = useRouter()
  
  // Redirigir automáticamente a Mis compras en el perfil ya que esta página no está funcionando
  useEffect(() => {
    // Establecer la pestaña en localStorage antes de navegar
    if (typeof window !== 'undefined') {
      localStorage.setItem('tanku_profile_tab', 'MIS COMPRAS')
    }
    router.replace('/profile?tab=MIS_COMPRAS')
  }, [router])
  
  // Mostrar un mensaje de carga mientras redirige
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#73FFA2] mb-4"></div>
        <p className="text-white">Redirigiendo a Mis compras...</p>
      </div>
    </div>
  )
  
  /* Código original comentado para referencia futura cuando se arregle la página
  
  import { CheckCircleSolid, ShoppingBag, CreditCard } from "@medusajs/icons"
  import { useEffect, useState, use } from "react"
  import { retrieveOrder } from "@lib/data/orders"
  import { convertToLocale } from "@lib/util/money"
  import LocalizedClientLink from "@modules/common/components/localized-client-link"
  import { useNavigateToOrders } from "@lib/hooks/use-navigate-to-orders"
  import { clearCartAfterPurchase } from "@lib/data/cart-cleanup"
  
  const resolvedParams = use(params)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { navigateToOrders } = useNavigateToOrders()

  useEffect(() => {
    const loadOrder = async () => {
      try {
        // ✅ Usar useCache: false para obtener la versión más reciente con shipping_total actualizado
        const orderData = await retrieveOrder(resolvedParams.id, false)
        setOrder(orderData)
        
        // Debug: Log para verificar datos de la orden
        console.log("🔍 [ORDER-CONFIRMED] Datos de la orden:", {
          id: orderData?.id,
          shipping_total: orderData?.shipping_total,
          total: orderData?.total,
          subtotal: orderData?.subtotal,
          payment_status: orderData?.payment_status,
          payment_method: orderData?.payment_method,
          hasShippingAddress: !!orderData?.shipping_address,
          shippingAddress: orderData?.shipping_address ? {
            first_name: orderData.shipping_address.first_name,
            last_name: orderData.shipping_address.last_name,
            address_1: orderData.shipping_address.address_1,
            city: orderData.shipping_address.city,
            province: orderData.shipping_address.province,
          } : null,
          metadata: orderData?.metadata
        })
        
        // ✅ Eliminar carrito después de confirmar la orden
        // Intentar obtener cart_id de la orden o del localStorage
        if (orderData) {
          const cartIdRaw = orderData.metadata?.cart_id || 
                           (typeof window !== 'undefined' ? localStorage.getItem('cart_id') : null)
          // Asegurar que cartId sea un string
          const cartId = typeof cartIdRaw === 'string' ? cartIdRaw : null
          
          if (cartId) {
            console.log("🧹 [ORDER-CONFIRMED] Eliminando carrito después de confirmar orden...")
            try {
              await clearCartAfterPurchase(cartId)
            } catch (error) {
              console.warn("⚠️ [ORDER-CONFIRMED] No se pudo eliminar carrito:", error)
              // No fallar por esto, es mejor que la página se muestre
            }
          } else {
            // Si no hay cart_id, al menos limpiar localStorage
            if (typeof window !== 'undefined') {
              localStorage.removeItem('cart_id')
              localStorage.removeItem('cart')
              window.dispatchEvent(new CustomEvent('cartCleared'))
            }
          }
        }
      } catch (error: any) {
        console.error('Error loading order:', error)
        setError(error?.message || 'No se pudo cargar la orden')
        setOrder(null)
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [resolvedParams.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Orden no encontrada</h2>
            <p className="text-gray-300 mb-6">
              {error || 'No se pudo cargar la información de la orden. Por favor, verifica el ID de la orden.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => router.push('/account/orders')}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Ver mis órdenes
            </button>
            <button 
              onClick={() => router.push('/')}
              className="flex-1 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] hover:from-[#5accc9] hover:to-[#66e68f] text-black font-semibold py-3 px-6 rounded-xl transition-all"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Detectar método de pago de múltiples formas
  const paymentMethod = order.metadata?.payment_method || order.payment_method
  
  // ✅ Obtener shipping_total con fallback a metadata
  // Si shipping_total está en 0 o no existe, intentar obtenerlo de metadata
  const shippingTotal = Number(order.shipping_total) > 0 
    ? Number(order.shipping_total)
    : Number(order.metadata?.shipping_total || order.metadata?.shipping_amount || 0)
  
  // Debug: Log para ver qué valores tenemos
  console.log("🔍 [ORDER-CONFIRMED] Detección de método de pago:", {
    payment_method_from_metadata: order.metadata?.payment_method,
    payment_method_from_order: order.payment_method,
    payment_status: order.payment_status,
    final_payment_method: paymentMethod
  })
  
  console.log("🔍 [ORDER-CONFIRMED] Shipping total:", {
    shipping_total: order.shipping_total,
    metadata_shipping_total: order.metadata?.shipping_total,
    metadata_shipping_amount: order.metadata?.shipping_amount,
    final_shipping_total: shippingTotal
  })
  
  // ✅ Detectar contra entrega:
  // 1. Si payment_method es explícitamente "cash_on_delivery"
  // 2. Si payment_status es "not_paid" y no hay evidencia de ePayco (no hay transaction_id de ePayco)
  const isCashOnDelivery = paymentMethod === "cash_on_delivery" || 
                           (order.payment_status === "not_paid" && 
                            paymentMethod !== "epayco" && 
                            !order.metadata?.epayco_transaction_id &&
                            !order.metadata?.epayco_ref)
  
  // Para contra entrega, el payment_status es "not_paid" pero NO es rechazado
  const isPaymentCompleted = order.payment_status === "captured" || 
                            (isCashOnDelivery && order.payment_status === "not_paid")
  const isEpayco = !isCashOnDelivery
  
  // ✅ Solo considerar rechazado si es ePayco Y el estado es explícitamente rechazado
  // NO considerar rechazado si es contra entrega (que tiene payment_status = "not_paid")
  const isPaymentRejected = isEpayco && 
                           order.payment_status !== "captured" && 
                           order.payment_status !== "awaiting" &&
                           order.payment_status !== "not_paid" && // ✅ Excluir "not_paid" porque es contra entrega
                           (order.payment_status === "rejected" || order.payment_status === "failed" || order.payment_status === "canceled")

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensaje de confirmación */}
        <div className="text-center mb-8">
          <div className="relative w-10 h-10 rounded-full bg-green-500/20 mb-4 mx-auto">
            <CheckCircleSolid className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">¡Orden Confirmada!</h2>
          <p className="text-gray-300 text-lg">
            Tu orden <span className="text-[#66DEDB] font-semibold">{order.id}</span> ha sido procesada exitosamente
          </p>
        </div>

        {/* Layout en dos columnas */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Columna izquierda - Estado de pago e información de envío */}
          <div className="space-y-6">
        {/* Estado del pago */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20">
                  <CreditCard className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Estado del Pago</h3>
              {isCashOnDelivery ? (
                    <p className="text-yellow-400">Contra entrega</p>
              ) : isPaymentCompleted ? (
                    <p className="text-green-400">Pago exitoso</p>
              ) : isPaymentRejected ? (
                <p className="text-red-400">Pago rechazado</p>
              ) : (
                <p className="text-yellow-400">Procesando pago...</p>
              )}
            </div>
          </div>
        </div>

        {/* Información de envío */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 flex-shrink-0">
                  <ShoppingBag className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-4">Información de Envío</h3>
              
              {/* Dirección */}
              <div className="mb-4 pb-4 border-b border-gray-700/50">
                <p className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Dirección de entrega</p>
                {(order.shipping_address || order.address) ? (
                  <div className="space-y-1">
                    <p className="text-white font-medium">
                      {(order.shipping_address?.first_name || order.address?.firstName || '')} {(order.shipping_address?.last_name || order.address?.lastName || '')}
                    </p>
                    <p className="text-gray-300 text-sm">
                      {order.shipping_address?.address_1 || order.address?.address1 || ''}
                      {(order.shipping_address?.address_2 || order.address?.address2) && `, ${order.shipping_address?.address_2 || order.address?.address2}`}
                    </p>
                    <p className="text-gray-300 text-sm">
                      {order.shipping_address?.city || order.address?.city || ''}, {order.shipping_address?.province || order.address?.state || ''}
                    </p>
                    {(order.shipping_address?.postal_code || order.address?.postalCode) && (
                      <p className="text-gray-300 text-sm">{order.shipping_address?.postal_code || order.address?.postalCode}</p>
                    )}
                    {(order.shipping_address?.phone || order.address?.phone) && (
                      <p className="text-gray-300 text-sm">Tel: {order.shipping_address?.phone || order.address?.phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No hay dirección disponible</p>
                )}
              </div>

              {/* Método y costo */}
              <div className="space-y-2">
                <div>
                  <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Método de envío</p>
                  <p className="text-white text-sm">Envío estándar</p>
                </div>
                {shippingTotal > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Costo de envío</p>
                    <p className="text-white text-sm font-medium">
                      {convertToLocale({
                        amount: shippingTotal,
                        currency_code: order.currency_code,
                        locale: "es-CO",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                  </div>
                )}
                {order.metadata?.dropi_order_id && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Orden Dropi</p>
                    <p className="text-[#66DEDB] text-sm font-medium">dropi_{order.metadata.dropi_order_id}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
          </div>

          {/* Columna derecha - Resumen de orden y próximos pasos */}
          <div className="space-y-6">
        {/* Resumen de la orden */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Resumen de tu orden</h3>
          
          {/* Items */}
              <div className="space-y-3 mb-6">
            {order.items && Array.isArray(order.items) && order.items.length > 0 ? order.items.map((item: any) => {
              // ✅ Obtener imagen del producto desde variant.product.thumbnail o item.thumbnail
              const productImage = item.variant?.product?.thumbnail || 
                                   item.product?.thumbnail || 
                                   item.thumbnail || 
                                   null
              
              // ✅ Obtener nombre del producto (no usar item.title que contiene "Product variant_...")
              const productName = item.variant?.product?.title || 
                                  item.product?.title || 
                                  item.product_title ||
                                  (item.title && !item.title.startsWith("Product variant") ? item.title : null) ||
                                  "Producto"
              
              // ✅ Obtener variante title si existe y es diferente al nombre del producto
              const variantTitle = item.variant?.title || item.variant_title
              const showVariantTitle = variantTitle && variantTitle !== productName
              
              return (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
                    <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {productImage ? (
                        <img 
                          src={productImage} 
                          alt={productName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">IMG</span>
                      )}
                </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm truncate">{productName}</h4>
                  {showVariantTitle && (
                        <p className="text-gray-400 text-xs">{variantTitle}</p>
                  )}
                      <p className="text-gray-400 text-xs">Cantidad: {item.quantity}</p>
                </div>
                <div className="text-right">
                      <p className="text-white font-medium text-sm">
                        {(() => {
                          // Usar finalPrice * quantity si está disponible, sino calcular desde final_price o price
                          const basePrice = item.unit_price || item.price || 0
                          const itemTotal = item.total || 
                                           (item.finalPrice ? item.finalPrice * item.quantity : null) ||
                                           (item.final_price ? item.final_price * item.quantity : null) ||
                                           (basePrice > 0 ? Math.round((basePrice * 1.15) + 10000) * item.quantity : 0); // Fallback con incremento (15% + $10,000)
                          return convertToLocale({
                            amount: itemTotal,
                            currency_code: order.currency_code || 'COP',
                            locale: "es-CO",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          });
                        })()}
                  </p>
                </div>
              </div>
            )
            }) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No hay items en esta orden</p>
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="border-t border-gray-700 pt-4 space-y-2">
                {(() => {
                  // Calcular subtotal real desde items (con finalPrice)
                  const realSubtotal = order.items?.reduce((sum: number, item: any) => {
                    const basePrice = item.unit_price || item.price || 0
                    const itemTotal = item.total || 
                                     (item.finalPrice ? item.finalPrice * item.quantity : 0) ||
                                     (item.final_price ? item.final_price * item.quantity : 0) ||
                                     (basePrice > 0 ? Math.round((basePrice * 1.15) + 10000) * item.quantity : 0); // Fallback con incremento (15% + $10,000)
                    return sum + itemTotal;
                  }, 0) || Number(order.subtotal) || 0;
                  
                  return realSubtotal > 0 ? (
                    <div className="flex justify-between text-gray-300 text-sm">
                      <span>Subtotal:</span>
                      <span>
                        {convertToLocale({
                          amount: realSubtotal,
                          currency_code: order.currency_code || 'COP',
                          locale: "es-CO",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </span>
                    </div>
                  ) : null;
                })()}
            {shippingTotal > 0 && (
                  <div className="flex justify-between text-gray-300 text-sm">
                <span>Envío:</span>
                <span>
                  {convertToLocale({
                    amount: shippingTotal,
                    currency_code: order.currency_code,
                        locale: "es-CO",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                  })}
                </span>
              </div>
            )}
            {Number(order.tax_total) > 0 && (
                  <div className="flex justify-between text-gray-300 text-sm">
                <span>Impuestos:</span>
                <span>
                  {convertToLocale({
                    amount: Number(order.tax_total),
                    currency_code: order.currency_code,
                        locale: "es-CO",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                  })}
                </span>
              </div>
            )}
            {Number(order.discount_total) > 0 && (
                  <div className="flex justify-between text-green-400 text-sm">
                <span>Descuentos:</span>
                <span>
                  -{convertToLocale({
                    amount: Number(order.discount_total),
                    currency_code: order.currency_code,
                        locale: "es-CO",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                  })}
                </span>
              </div>
            )}
                {Number(order.total) > 0 && (
                  <div className="flex justify-between text-white font-bold border-t border-gray-700 pt-2">
              <span>Total:</span>
              <span className="text-[#66DEDB]">
                {convertToLocale({
                        amount: Number(order.total),
                  currency_code: order.currency_code,
                        locale: "es-CO",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                })}
              </span>
            </div>
                )}
          </div>
        </div>
        </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={navigateToOrders}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl text-center transition-colors"
          >
            Ver mis órdenes
          </button>
          <LocalizedClientLink 
            href="/" 
            className="flex-1 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] hover:from-[#5accc9] hover:to-[#66e68f] text-black font-semibold py-3 px-6 rounded-xl text-center transition-all"
          >
            Seguir comprando
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
  */
}