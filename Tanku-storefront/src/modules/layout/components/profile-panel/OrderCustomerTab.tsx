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
      currency: 'EUR'
    }).format(amount)
  }

  const handleViewOrder = (order: CustomerOrder) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  const closeOrderDetails = () => {
    setSelectedOrder(null)
    setShowOrderDetails(false)
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
                  {selectedOrder.orderVariants.map((variant) => (
                    <div key={variant.id} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-white">
                          Producto ID: {variant.variant_id}
                        </div>
                        <div className="text-xs text-gray-400">
                          Cantidad: {variant.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">
                          {formatCurrency(Number(variant.original_total))}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatCurrency(Number(variant.unit_price))} c/u
                        </div>
                      </div>
                    </div>
                  ))}
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
