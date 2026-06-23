'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import type { CartItem } from '@/types/api'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import { logger } from '@/lib/utils/logger'

interface CartButtonProps {
  /** Nav móvil: icono y badge más pequeños */
  compact?: boolean
}

export function CartButton({ compact = false }: CartButtonProps = {}) {
  const { cart, fetchCart, removeItem, getItemCount } = useCartStore()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevItemCountRef = useRef(0)
  const hasInitializedRef = useRef(false)
  const pathname = usePathname()

  // Cargar carrito al montar solo si no está cargado o está stale
  // ✅ Esperar un poco para que feedInit tenga oportunidad de cargar primero
  useEffect(() => {
    const checkDelay = setTimeout(() => {
      // ✅ Verificar si feedInit ya terminó
      const feedInitComplete = typeof window !== 'undefined' 
        ? sessionStorage.getItem('feedInit_complete') === 'true'
        : false
      
      const currentCart = useCartStore.getState().cart
      
      // ✅ Si feedInit ya terminó y hay carrito, no hacer fetch
      if (feedInitComplete && currentCart) {
        logger.debug('[CartButton] feedInit ya cargó el carrito, omitiendo fetch')
        return
      }
      
      // Solo hacer fetch si no hay carrito o si está stale (más de 1 minuto)
      if (!currentCart || (currentCart.updatedAt && Date.now() - new Date(currentCart.updatedAt).getTime() > 60000)) {
        fetchCart()
      }
    }, 2500) // ✅ Esperar 2.5 segundos para que feedInit cargue
    
    return () => {
      clearTimeout(checkDelay)
    }
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

  const toggleDropdown = () => {
    setIsOpen((prev) => {
      const next = !prev
      if (next) {
        updateDropdownPosition()
      }
      return next
    })
  }

  // Cerrar al clic fuera (mismo patrón que NotificationsButton)
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return
      }
      setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', onClickOutside)
    }
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isOpen])

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

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
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

  const rowDividerStyle = {
    borderImage: 'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
  } as const

  const handleRemoveItem = async (itemId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await removeItem(itemId)
    } catch (error) {
      logger.error('Error eliminando item:', error)
    }
  }

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          className={`relative flex cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-white/10 ${
            compact ? 'p-1' : 'p-2'
          }`}
          aria-label="Carrito"
          aria-expanded={isOpen}
        >
          <img
            src="/icons_tanku/tanku_nav_carrito_verde.svg"
            alt=""
            className={compact ? 'h-[22px] w-auto' : 'h-[30px] w-auto'}
          />
          {itemCount > 0 && (
            <span
              className={`absolute flex items-center justify-center rounded-full font-semibold text-white ${
                compact
                  ? '-right-0.5 -top-0.5 min-h-[14px] min-w-[14px] text-[9px] px-0.5'
                  : '-right-1 -top-1 h-5 w-5 text-xs'
              }`}
              style={{ backgroundColor: '#dc2626' }}
            >
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          )}
        </button>
      </div>

      {/* Dropdown - Fixed positioning para que aparezca correctamente incluso cuando nav está oculto */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-50 flex h-[500px] w-[400px] flex-col rounded-xl border border-[#414141] shadow-xl"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            backgroundColor: '#171B21',
          }}
          onMouseEnter={() => {
            if (autoCloseTimerRef.current) {
              clearTimeout(autoCloseTimerRef.current)
              autoCloseTimerRef.current = null
            }
          }}
        >
          {/* Header */}
          <div className="border-b p-4" style={rowDividerStyle}>
            <div className="flex items-center gap-2">
              <img
                src="/icons_tanku/tanku_nav_carrito_verde.svg"
                alt=""
                className="h-7 w-auto"
              />
              <h3 className="text-base font-semibold text-white">Carrito</h3>
            </div>
          </div>

          {/* Items */}
          {items.length > 0 ? (
            <>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                      <div key={item.id} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0" style={rowDividerStyle}>
                        {/* Imagen */}
                        {productHandle ? (
                          <Link href={`/products/${productHandle}`} className="flex-shrink-0">
                            <div className="w-16 h-16 relative rounded overflow-hidden bg-gray-700">
                              <Image
                                src={productImage}
                                alt={productTitle}
                                fill
                                className="object-cover"
                                unoptimized={isRemoteImageSrc(productImage)}
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
                              unoptimized={isRemoteImageSrc(productImage)}
                            />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {productHandle ? (
                            <Link
                              href={`/products/${productHandle}`}
                              className="mb-1 block truncate text-sm font-medium text-[#66DEDB] transition-colors hover:text-[#73FFA2]"
                            >
                              {productTitle}
                            </Link>
                          ) : (
                            <div className="mb-1 truncate text-sm font-medium text-[#66DEDB]">
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
              <div className="border-t p-3" style={rowDividerStyle}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[#73FFA2]">Total</span>
                  <span className="text-base font-bold text-[#73FFA2]">{formatPrice(total)}</span>
                </div>
                <Link
                  href="/cart"
                  className="block w-full text-center text-sm font-medium text-[#73FFA2] transition-opacity hover:opacity-85"
                >
                  Ver carrito
                </Link>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
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
