'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { GiftIcon, CheckCircleIcon, XCircleIcon, ClockIcon, EyeIcon, XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

interface GiftOrder {
  id: string
  status: string
  paymentStatus: string
  paymentMethod: string | null
  createdAt: string
  updatedAt: string
  total?: number
  subtotal?: number
  shippingTotal?: number
  otherUser: {
    id: string
    username: string | null
    firstName: string | null
    lastName: string | null
    avatar: string | null
  } | null
  items: Array<{
    id: string
    product: {
      id: string
      title: string
      handle: string
      images: string[]
    }
    variant: {
      id: string
      sku: string
      title: string
    }
    quantity: number
    price?: number
    finalPrice?: number
    dropiStatus?: string | null
    dropiOrderId?: number | null
  }>
  address: {
    city: string
    state: string
    country: string
  } | null
}

interface GiftsTabProps {
  userId?: string
}

export function GiftsTab({ userId }: GiftsTabProps) {
  const { user } = useAuthStore()
  const [sentGifts, setSentGifts] = useState<GiftOrder[]>([])
  const [receivedGifts, setReceivedGifts] = useState<GiftOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGift, setSelectedGift] = useState<GiftOrder | null>(null)
  const [showGiftDetails, setShowGiftDetails] = useState(false)
  const [activeSection, setActiveSection] = useState<'sent' | 'received'>('sent')

  const loadGifts = async () => {
    try {
      setLoading(true)
      
      // Cargar regalos enviados
      const sentResponse = await apiClient.get<{ orders: GiftOrder[]; count: number }>(
        `${API_ENDPOINTS.GIFTS.ORDERS}?type=sent`
      )
      
      // Cargar regalos recibidos
      const receivedResponse = await apiClient.get<{ orders: GiftOrder[]; count: number }>(
        `${API_ENDPOINTS.GIFTS.ORDERS}?type=received`
      )
      
      if (sentResponse.success && sentResponse.data) {
        setSentGifts(sentResponse.data.orders || [])
      }
      
      if (receivedResponse.success && receivedResponse.data) {
        setReceivedGifts(receivedResponse.data.orders || [])
      }
    } catch (error) {
      console.error('Error al cargar regalos:', error)
      setSentGifts([])
      setReceivedGifts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadGifts()
    }
  }, [userId])

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'pendiente':
        return <ClockIcon className="w-4 h-4 text-yellow-400" />
      case 'processing':
      case 'procesando':
      case 'confirmed':
      case 'confirmado':
        return <EyeIcon className="w-4 h-4 text-blue-400" />
      case 'shipped':
      case 'enviado':
        return <ShoppingBagIcon className="w-4 h-4 text-purple-400" />
      case 'delivered':
      case 'entregado':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />
      case 'cancelled':
      case 'cancelado':
        return <XCircleIcon className="w-4 h-4 text-red-400" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'pendiente':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30'
      case 'processing':
      case 'procesando':
      case 'confirmed':
      case 'confirmado':
        return 'bg-blue-900/20 text-blue-400 border-blue-400/30'
      case 'shipped':
      case 'enviado':
        return 'bg-purple-900/20 text-purple-400 border-purple-400/30'
      case 'delivered':
      case 'entregado':
        return 'bg-green-900/20 text-green-400 border-green-400/30'
      case 'cancelled':
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

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Pendiente',
      'paid': 'Pagado',
      'processing': 'Procesando',
      'confirmed': 'Confirmado',
      'shipped': 'Enviado',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado',
    }
    return statusMap[status.toLowerCase()] || status
  }

  const getDropiStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-900/20 text-gray-400 border-gray-400/30'
    const statusUpper = status.toUpperCase()
    switch (statusUpper) {
      case 'PENDING':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30'
      case 'PROCESSING':
        return 'bg-blue-900/20 text-blue-400 border-blue-400/30'
      case 'SHIPPED':
        return 'bg-purple-900/20 text-purple-400 border-purple-400/30'
      case 'DELIVERED':
        return 'bg-green-900/20 text-green-400 border-green-400/30'
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-red-900/20 text-red-400 border-red-400/30'
      default:
        return 'bg-gray-900/20 text-gray-400 border-gray-400/30'
    }
  }

  const formatDropiStatus = (status: string | null | undefined) => {
    if (!status) return 'Sin estado'
    const statusMap: Record<string, string> = {
      'PENDING': 'Pendiente',
      'PROCESSING': 'En proceso',
      'SHIPPED': 'Enviado',
      'DELIVERED': 'Entregado',
      'CANCELLED': 'Cancelado',
      'REJECTED': 'Rechazado',
    }
    return statusMap[status.toUpperCase()] || status
  }

  const handleViewGift = (gift: GiftOrder) => {
    setSelectedGift(gift)
    setShowGiftDetails(true)
  }

  const closeGiftDetails = () => {
    setSelectedGift(null)
    setShowGiftDetails(false)
  }

  const currentGifts = activeSection === 'sent' ? sentGifts : receivedGifts
  const isSender = activeSection === 'sent'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
        <span className="ml-2 text-white">Cargando regalos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <GiftIcon className="w-6 h-6 text-[#73FFA2]" />
        <h3 className="text-xl font-bold text-[#73FFA2]">REGALOS</h3>
      </div>

      {/* Tabs para enviados/recibidos */}
      <div className="flex gap-2 border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveSection('sent')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === 'sent'
              ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Regalos Enviados ({sentGifts.length})
        </button>
        <button
          onClick={() => setActiveSection('received')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === 'received'
              ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Regalos Recibidos ({receivedGifts.length})
        </button>
      </div>

      {/* Lista de regalos */}
      {currentGifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <GiftIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-white text-lg font-medium mb-2">
            {isSender ? 'No has enviado regalos' : 'No has recibido regalos'}
          </h4>
          <p className="text-gray-400 text-sm">
            {isSender 
              ? 'Cuando envíes regalos, aparecerán aquí.'
              : 'Cuando recibas regalos, aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-700">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    {isSender ? 'Para' : 'De'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Pago
                  </th>
                  {isSender && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                      Total
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {currentGifts.map((gift) => (
                  <tr key={gift.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {gift.otherUser
                          ? (gift.otherUser.firstName && gift.otherUser.lastName
                              ? `${gift.otherUser.firstName} ${gift.otherUser.lastName}`
                              : gift.otherUser.firstName || gift.otherUser.username || 'Usuario')
                          : '—'}
                      </div>
                      {gift.address && (
                        <div className="text-xs text-gray-400">
                          {gift.address.city}, {gift.address.state}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(gift.createdAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(gift.paymentStatus === 'cancelled' ? 'cancelled' : gift.status)}`}>
                        {getStatusIcon(gift.paymentStatus === 'cancelled' ? 'cancelled' : gift.status)}
                        {formatStatus(gift.paymentStatus === 'cancelled' ? 'cancelled' : gift.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(gift.paymentStatus)}`}>
                        {getStatusIcon(gift.paymentStatus)}
                        {formatStatus(gift.paymentStatus)}
                      </span>
                    </td>
                    {isSender && gift.total !== undefined && (
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {formatPrice(gift.total)}
                      </td>
                    )}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {gift.items.length} producto(s)
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewGift(gift)}
                        className="text-[#73FFA2] hover:text-[#66DEDB] transition-colors flex items-center gap-1"
                      >
                        <EyeIcon className="w-4 h-4" />
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
            {currentGifts.map((gift) => (
              <div key={gift.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {gift.otherUser
                        ? (gift.otherUser.firstName && gift.otherUser.lastName
                            ? `${gift.otherUser.firstName} ${gift.otherUser.lastName}`
                            : gift.otherUser.firstName || gift.otherUser.username || 'Usuario')
                        : '—'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(gift.createdAt)}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(gift.paymentStatus === 'cancelled' ? 'cancelled' : gift.status)}`}>
                    {getStatusIcon(gift.paymentStatus === 'cancelled' ? 'cancelled' : gift.status)}
                    {formatStatus(gift.paymentStatus === 'cancelled' ? 'cancelled' : gift.status)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm text-gray-300">
                    {gift.items.length} producto(s)
                  </div>
                  {isSender && gift.total !== undefined && (
                    <div className="text-sm font-medium text-white">
                      {formatPrice(gift.total)}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleViewGift(gift)}
                  className="w-full mt-3 px-4 py-2 bg-[#73FFA2] text-gray-900 font-semibold rounded-lg hover:bg-[#66DEDB] transition-colors flex items-center justify-center gap-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  Ver detalles
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {showGiftDetails && selectedGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-[#73FFA2]/40 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-[#73FFA2]">
                  {isSender ? 'Regalo Enviado' : 'Regalo Recibido'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Orden #{selectedGift.id.slice(-8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={closeGiftDetails}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="space-y-6">
                {/* Información del otro usuario */}
                {selectedGift.otherUser && (
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-[#73FFA2] mb-2">
                      {isSender ? 'Enviado a' : 'Enviado por'}
                    </h4>
                    <div className="flex items-center gap-3">
                      {selectedGift.otherUser.avatar && (
                        <Image
                          src={selectedGift.otherUser.avatar}
                          alt={selectedGift.otherUser.firstName || 'Usuario'}
                          width={48}
                          height={48}
                          className="rounded-full"
                          unoptimized
                        />
                      )}
                      <div>
                        <p className="text-white font-medium">
                          {selectedGift.otherUser.firstName && selectedGift.otherUser.lastName
                            ? `${selectedGift.otherUser.firstName} ${selectedGift.otherUser.lastName}`
                            : selectedGift.otherUser.firstName || selectedGift.otherUser.username || 'Usuario'}
                        </p>
                        {selectedGift.address && (
                          <p className="text-sm text-gray-400">
                            {selectedGift.address.city}, {selectedGift.address.state}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Estado y pago */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Estado</h4>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedGift.paymentStatus === 'cancelled' ? 'cancelled' : selectedGift.status)}`}>
                      {getStatusIcon(selectedGift.paymentStatus === 'cancelled' ? 'cancelled' : selectedGift.status)}
                      {formatStatus(selectedGift.paymentStatus === 'cancelled' ? 'cancelled' : selectedGift.status)}
                    </span>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Pago</h4>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedGift.paymentStatus)}`}>
                      {getStatusIcon(selectedGift.paymentStatus)}
                      {formatStatus(selectedGift.paymentStatus)}
                    </span>
                  </div>
                </div>

                {/* Total (solo si es remitente) */}
                {isSender && selectedGift.total !== undefined && (
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-400">Total</span>
                      <span className="text-lg font-bold text-[#73FFA2]">
                        {formatPrice(selectedGift.total)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Productos */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-[#73FFA2] mb-4">Productos</h4>
                  <div className="space-y-4">
                    {selectedGift.items.map((item) => (
                      <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-700 last:border-0">
                        {item.product.images?.[0] && (
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={item.product.images[0]}
                              alt={item.product.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="text-white font-medium mb-1">{item.product.title}</h5>
                          {item.variant.title && (
                            <p className="text-sm text-gray-400 mb-1">{item.variant.title}</p>
                          )}
                          <p className="text-sm text-gray-400">Cantidad: {item.quantity}</p>
                          {isSender && item.finalPrice !== undefined && (
                            <p className="text-sm font-semibold text-[#66DEDB] mt-1">
                              {formatPrice(item.finalPrice * item.quantity)}
                            </p>
                          )}
                          {item.dropiStatus && (
                            <div className="mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getDropiStatusColor(item.dropiStatus)}`}>
                                {formatDropiStatus(item.dropiStatus)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

