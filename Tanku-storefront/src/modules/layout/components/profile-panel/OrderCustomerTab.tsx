"use client"

import React, { useState, useEffect } from 'react'
import { ShoppingBag, CheckCircle, XCircle, Clock, Eye } from "@medusajs/icons"
import { getCustomerOrders, CustomerOrder } from '../actions/get-customer-orders'

interface OrderCustomerTabProps {
  customerId: string
}

const OrderCustomerTab: React.FC<OrderCustomerTabProps> = ({ customerId }) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [dropiStatus, setDropiStatus] = useState<any>(null)
  const [loadingDropiStatus, setLoadingDropiStatus] = useState(false)
  const [itemDropiStatus, setItemDropiStatus] = useState<Record<string, any>>({})
  const [loadingItemDropiStatus, setLoadingItemDropiStatus] = useState<Record<string, boolean>>({})

  const loadOrders = async () => {
    try {
      setLoading(true)
      const customerOrders = await getCustomerOrders(customerId)
      setOrders(customerOrders || [])
    } catch (error) {
      console.error('Error al cargar órdenes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (customerId) {
      loadOrders()
    }
  }, [customerId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Clock className="w-4 h-4 text-yellow-400" />
      case 'procesando':
        return <Eye className="w-4 h-4 text-blue-400" />
      case 'enviado':
        return <ShoppingBag className="w-4 h-4 text-purple-400" />
      case 'entregado':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'cancelado':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30'
      case 'procesando':
        return 'bg-blue-900/20 text-blue-400 border-blue-400/30'
      case 'enviado':
        return 'bg-purple-900/20 text-purple-400 border-purple-400/30'
      case 'entregado':
        return 'bg-green-900/20 text-green-400 border-green-400/30'
      case 'cancelado':
        return 'bg-red-900/20 text-red-400 border-red-400/30'
      default:
        return 'bg-gray-900/20 text-gray-400 border-gray-400/30'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'COP'
    }).format(amount)
  }

  const handleViewOrder = (order: CustomerOrder) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
    setDropiStatus(null) // Reset Dropi status when opening new order
  }

  const closeOrderDetails = () => {
    setSelectedOrder(null)
    setShowOrderDetails(false)
    setDropiStatus(null)
  }

  const fetchDropiStatus = async (orderId: string) => {
    if (!orderId) return
    
    setLoadingDropiStatus(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
      const response = await fetch(
        `${backendUrl}/store/order/${orderId}/dropi-status`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al obtener estado de Dropi")
      }

      const data = await response.json()
      setDropiStatus(data)
    } catch (error: any) {
      console.error("Error al obtener estado de Dropi:", error)
      setDropiStatus({ error: error.message })
    } finally {
      setLoadingDropiStatus(false)
    }
  }

  const fetchDropiStatusByItem = async (itemId: string) => {
    if (!itemId) return
    
    setLoadingItemDropiStatus(prev => ({ ...prev, [itemId]: true }))
    try {
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
      const response = await fetch(
        `${backendUrl}/store/order/item/${itemId}/dropi-status`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al obtener estado de Dropi")
      }

      const data = await response.json()
      setItemDropiStatus(prev => ({ ...prev, [itemId]: data }))
    } catch (error: any) {
      console.error("Error al obtener estado de Dropi:", error)
      setItemDropiStatus(prev => ({ ...prev, [itemId]: { error: error.message } }))
    } finally {
      setLoadingItemDropiStatus(prev => ({ ...prev, [itemId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
        <span className="ml-2 text-white">Cargando órdenes...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="w-6 h-6 text-[#73FFA2]" />
        <h3 className="text-xl font-bold text-[#73FFA2]">MIS COMPRAS</h3>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-white text-lg font-medium mb-2">No hay órdenes</h4>
          <p className="text-gray-400 text-sm">Cuando realices compras, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-700">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Orden
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Dropi ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        #{order.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-400">
                        {order.email}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status.status)}`}>
                        {getStatusIcon(order.status.status)}
                        {order.status.status.charAt(0).toUpperCase() + order.status.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {order.orderVariants.length} producto(s)
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {(order as any).dropi_order_id ? (
                        <span className="text-[#73FFA2] font-medium">#{(order as any).dropi_order_id}</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-[#73FFA2] hover:text-[#66DEDB] transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-medium text-white">
                      #{order.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(order.created_at)}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status.status)}`}>
                    {getStatusIcon(order.status.status)}
                    {order.status.status.charAt(0).toUpperCase() + order.status.status.slice(1)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm text-gray-300">
                    {order.orderVariants.length} producto(s)
                  </div>
                  <div className="text-sm font-medium text-white">
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>

                <button
                  onClick={() => handleViewOrder(order)}
                  className="w-full bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 px-4 py-2 rounded-lg font-medium text-sm hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver detalles
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#73FFA2]">
                  Detalles de la Orden #{selectedOrder.id.slice(-8).toUpperCase()}
                </h3>
                <button
                  onClick={closeOrderDetails}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-[#73FFA2] mb-2">Información de la Orden</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fecha:</span>
                      <span className="text-white">{formatDate(selectedOrder.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Estado:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.status.status)}`}>
                        {getStatusIcon(selectedOrder.status.status)}
                        {selectedOrder.status.status.charAt(0).toUpperCase() + selectedOrder.status.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total:</span>
                      <span className="text-white font-medium">{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Método de Pago:</span>
                      <span className="text-white">{selectedOrder.payment_method}</span>
                    </div>
                    {(selectedOrder as any).dropi_order_id && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Orden Dropi:</span>
                        <span className="text-white font-medium">#{(selectedOrder as any).dropi_order_id}</span>
                      </div>
                    )}
                    {(selectedOrder as any).shipping_total > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Envío:</span>
                        <span className="text-white">{formatCurrency((selectedOrder as any).shipping_total)}</span>
                      </div>
                    )}
                    {(selectedOrder as any).dropi_order_id && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={() => fetchDropiStatus(selectedOrder.id)}
                          disabled={loadingDropiStatus}
                          className="w-full bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 px-4 py-2 rounded-lg font-medium text-sm hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loadingDropiStatus ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                              Consultando...
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-4 h-4" />
                              Consultar Estado en Dropi
                            </>
                          )}
                        </button>
                        {dropiStatus && (
                          <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                            {dropiStatus.error ? (
                              <div className="text-red-400 text-sm">{dropiStatus.error}</div>
                            ) : (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Estado Dropi:</span>
                                  <span className="text-white font-medium">{dropiStatus.status || 'N/A'}</span>
                                </div>
                                {dropiStatus.shipping_guide && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Guía de Envío:</span>
                                    <span className="text-[#73FFA2] font-medium">{dropiStatus.shipping_guide}</span>
                                  </div>
                                )}
                                {dropiStatus.shipping_company && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Transportadora:</span>
                                    <span className="text-white">{dropiStatus.shipping_company}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-[#73FFA2] mb-2">Dirección de Envío</h4>
                  <div className="text-sm text-gray-300">
                    <div>{selectedOrder.shipping_address.first_name} {selectedOrder.shipping_address.last_name}</div>
                    <div>{selectedOrder.shipping_address.address_1}</div>
                    {selectedOrder.shipping_address.address_2 && <div>{selectedOrder.shipping_address.address_2}</div>}
                    <div>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.province}</div>
                    <div>{selectedOrder.shipping_address.postal_code}</div>
                    <div>{selectedOrder.shipping_address.phone}</div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-sm font-medium text-[#73FFA2] mb-4">Productos</h4>
                <div className="space-y-3">
                  {selectedOrder.orderVariants.map((variant) => {
                    const productTitle = variant.product?.title || variant.variant?.title || `Producto ${variant.variant_id}`
                    const finalPrice = variant.finalPrice || variant.unit_price
                    const totalPrice = finalPrice * variant.quantity
                    const itemStatus = itemDropiStatus[variant.id]
                    const isLoading = loadingItemDropiStatus[variant.id]

                    return (
                      <div key={variant.id} className="p-3 bg-gray-800 rounded-lg space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">
                              {productTitle}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Cantidad: {variant.quantity}
                            </div>
                            {variant.variant?.sku && (
                              <div className="text-xs text-gray-500 mt-1">
                                SKU: {variant.variant.sku}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-white">
                              {formatCurrency(totalPrice)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatCurrency(finalPrice)} c/u
                            </div>
                          </div>
                        </div>
                        {variant.dropiOrderId && (
                          <div className="pt-2 border-t border-gray-700">
                            <button
                              onClick={() => fetchDropiStatusByItem(variant.id)}
                              disabled={isLoading}
                              className="w-full bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 px-3 py-1.5 rounded-lg font-medium text-xs hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isLoading ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
                                  Consultando...
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="w-3 h-3" />
                                  Ver Estado de Envío (Dropi #{variant.dropiOrderId})
                                </>
                              )}
                            </button>
                            {itemStatus && (
                              <div className="mt-2 p-2 bg-gray-900 rounded text-xs">
                                {itemStatus.error ? (
                                  <div className="text-red-400">{itemStatus.error}</div>
                                ) : (
                                  <div className="space-y-1 text-gray-300">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Estado:</span>
                                      <span className="text-white font-medium">{itemStatus.status || 'N/A'}</span>
                                    </div>
                                    {itemStatus.shipping_guide && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Guía:</span>
                                        <span className="text-[#73FFA2] font-medium">{itemStatus.shipping_guide}</span>
                                      </div>
                                    )}
                                    {itemStatus.shipping_company && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Transportadora:</span>
                                        <span className="text-white">{itemStatus.shipping_company}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderCustomerTab
