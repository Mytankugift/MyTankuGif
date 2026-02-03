'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import type { CartItem } from '@/types/api'

export function CartButton() {
  const { cart, fetchCart, removeItem, getItemCount } = useCartStore()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLAnchorElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevItemCountRef = useRef(0)
  const hasInitializedRef = useRef(false)
  const pathname = usePathname()

  // Cargar carrito al montar
  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  // Inicializar prevItemCountRef con el valor real después de cargar el carrito (solo una vez)
  useEffect(() => {
    if (cart && !hasInitializedRef.current) {
      const currentCount = getItemCount()
      prevItemCountRef.current = currentCount
      hasInitializedRef.current = true
    }
  }, [cart, getItemCount])

  // Escuchar eventos de actualización del carrito
  useEffect(() => {
    const handleCartUpdated = () => {
      // ✅ Diferir la llamada API para no bloquear el handler
      setTimeout(() => {
        fetchCart()
      }, 0)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('cartUpdated', handleCartUpdated)
      return () => {
        window.removeEventListener('cartUpdated', handleCartUpdated)
      }
    }
  }, [fetchCart])

  // Calcular posición del dropdown
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8, // 8px de margen (fixed positioning usa coordenadas de viewport)
        right: window.innerWidth - rect.right,
      })
    }
  }

  // Manejar hover para abrir/cerrar
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    updateDropdownPosition()
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 200) // Pequeño delay para permitir mover el mouse al dropdown
  }

  // Actualizar posición cuando cambia el scroll o el tamaño de la ventana
  useEffect(() => {
    if (isOpen) {
      const handleScrollOrResize = () => {
        updateDropdownPosition()
      }
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true)
        window.removeEventListener('resize', handleScrollOrResize)
      }
    }
  }, [isOpen])

  const handleDropdownMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    // Cancelar auto-cierre si el usuario está interactuando con el dropdown
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
  }

  const handleDropdownMouseLeave = () => {
    setIsOpen(false)
  }

  // Limpiar timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current)
      }
    }
  }, [])

  const itemCount = getItemCount()

  // Auto-abrir dropdown cuando se agrega un item (excepto en /cart)
  useEffect(() => {
    // Solo abrir si ya se inicializó (no en la primera carga) y el itemCount aumentó
    if (hasInitializedRef.current && prevItemCountRef.current < itemCount && !pathname.includes('/cart')) {
      updateDropdownPosition()
      setIsOpen(true)
      
      // Limpiar timer anterior si existe
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current)
      }
      
      // Cerrar automáticamente después de 4 segundos
      autoCloseTimerRef.current = setTimeout(() => {
        setIsOpen(false)
      }, 4000)
    }
    
    // Actualizar el itemCount anterior
    prevItemCountRef.current = itemCount
  }, [itemCount, pathname])
  const items = cart?.items || []
  const total = cart?.total || cart?.subtotal || 0

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleRemoveItem = async (itemId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await removeItem(itemId)
    } catch (error) {
      console.error('Error eliminando item:', error)
    }
  }

  return (
    <>
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Botón del carrito */}
        <Link
          ref={buttonRef}
          href="/cart"
          className="relative p-2 hover:opacity-80 transition-opacity flex items-center justify-center"
        >
        <Image
          src="/feed/Icons/Shopping_Cart_Green.png"
          alt="Carrito"
          width={24}
          height={24}
          className="object-contain"
          style={{ width: 'auto', height: 'auto' }}
        />
        {itemCount > 0 && (
          <span
            className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold"
            style={{ backgroundColor: '#dc2626' }}
          >
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
        </Link>
      </div>

      {/* Dropdown - Fixed positioning para que aparezca correctamente incluso cuando nav está oculto */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed w-[320px] bg-[#1E1E1E] border border-gray-600 rounded-lg shadow-xl z-50"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
        >
          {/* Header */}
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-[#66DEDB]">Carrito</h3>
          </div>

          {/* Items */}
          {items.length > 0 ? (
            <>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                <div className="p-3 space-y-3">
                  {[...items].sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime()
                    const dateB = new Date(b.createdAt || 0).getTime()
                    return dateB - dateA // Más reciente primero
                  }).map((item: CartItem) => {
                    const productImage = item.product?.images?.[0] || '/placeholder.png'
                    const productTitle = item.product?.title || 'Producto'
                    const productHandle = item.product?.handle
                    const variantTitle = item.variant?.title || ''
                    const itemTotal = item.total || item.unitPrice * item.quantity

                    return (
                      <div key={item.id} className="flex gap-3 pb-3 border-b border-gray-800 last:border-0 last:pb-0">
                        {/* Imagen */}
                        {productHandle ? (
                          <Link href={`/products/${productHandle}`} className="flex-shrink-0">
                            <div className="w-16 h-16 relative rounded overflow-hidden bg-gray-700">
                              <Image
                                src={productImage}
                                alt={productTitle}
                                fill
                                className="object-cover"
                                unoptimized={productImage?.includes('cloudfront.net')}
                              />
                            </div>
                          </Link>
                        ) : (
                          <div className="w-16 h-16 relative rounded overflow-hidden bg-gray-700 flex-shrink-0">
                            <Image
                              src={productImage}
                              alt={productTitle}
                              fill
                              className="object-cover"
                              unoptimized={productImage?.includes('cloudfront.net')}
                            />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {productHandle ? (
                            <Link
                              href={`/products/${productHandle}`}
                              className="block text-sm font-medium text-[#3B9BC3] hover:text-[#66DEDB] transition-colors truncate mb-1"
                            >
                              {productTitle}
                            </Link>
                          ) : (
                            <div className="text-sm font-medium text-[#3B9BC3] truncate mb-1">
                              {productTitle}
                            </div>
                          )}
                          {variantTitle && (
                            <div className="text-xs text-gray-400 mb-1">{variantTitle}</div>
                          )}
                          <div className="text-xs text-gray-500 mb-2">Cantidad: {item.quantity}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-[#66DEDB]">
                              {formatPrice(itemTotal)}
                            </span>
                            <button
                              onClick={(e) => handleRemoveItem(item.id, e)}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer con total y botón */}
              <div className="p-3 border-t border-gray-700 bg-gray-800/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[#66DEDB]">Total</span>
                  <span className="text-base font-bold text-[#66DEDB]">{formatPrice(total)}</span>
                </div>
                <Link href="/cart">
                  <button className="w-full bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                    Ver carrito
                  </button>
                </Link>
              </div>
            </>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-400 text-sm mb-4">Tu carrito está vacío</p>
              <Link href="/feed">
                <button className="text-[#66DEDB] hover:text-[#5accc9] text-sm font-medium transition-colors">
                  Continuar comprando
                </button>
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  )
}
