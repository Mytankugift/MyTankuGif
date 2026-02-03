'use client'

import { useEffect, Suspense, useState } from 'react'
import { useCartStore } from '@/lib/stores/cart-store'
import { CartItem } from '@/components/cart/cart-item'
import { CartSummary } from '@/components/cart/cart-summary'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { Cart } from '@/types/api'

type TabType = 'my-cart' | 'gift-cart'

function CartPageContent() {
  const { normalCart: storeNormalCart, giftCart: storeGiftCart, fetchBothCarts, isLoading } = useCartStore()
  const [activeTab, setActiveTab] = useState<TabType>('my-cart')
  const [normalCart, setNormalCart] = useState<Cart | null>(null)
  const [giftCart, setGiftCart] = useState<Cart | null>(null)
  const [isLoadingCarts, setIsLoadingCarts] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    // Cargar desde localStorage si existe
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cart-selected-items')
      if (saved) {
        try {
          return new Set(JSON.parse(saved))
        } catch {
          return new Set()
        }
      }
    }
    return new Set()
  })

  // Obtener ambos carritos al cargar
  useEffect(() => {
    const loadBothCarts = async () => {
      setIsLoadingCarts(true)
      
      // Usar fetchBothCarts para obtener ambos carritos simultáneamente
      await fetchBothCarts()
      
      // Actualizar estados locales desde el store
      const { normalCart: storeNormal, giftCart: storeGift } = useCartStore.getState()
      setNormalCart(storeNormal)
      setGiftCart(storeGift)
      
      setIsLoadingCarts(false)
    }
    
    loadBothCarts()
  }, [fetchBothCarts])

  // Actualizar estados locales cuando cambian los carritos en el store
  useEffect(() => {
    setNormalCart(storeNormalCart)
    setGiftCart(storeGiftCart)
    setIsLoadingCarts(false)
  }, [storeNormalCart, storeGiftCart])

  // Escuchar eventos de actualización del carrito
  useEffect(() => {
    const handleCartUpdated = async () => {
      // ✅ Diferir la llamada API para no bloquear el handler
      setTimeout(async () => {
        // Recargar ambos carritos desde el store
        const { normalCart: storeNormal, giftCart: storeGift } = useCartStore.getState()
        setNormalCart(storeNormal)
        setGiftCart(storeGift)
      }, 0)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('cartUpdated', handleCartUpdated)
      return () => {
        window.removeEventListener('cartUpdated', handleCartUpdated)
      }
    }
  }, [])

  // Determinar qué carrito mostrar según el tab activo
  const currentCart = activeTab === 'gift-cart' ? giftCart : normalCart
  
  // Inicializar todos los items como seleccionados cuando se carga el carrito
  useEffect(() => {
    if (currentCart && currentCart.items.length > 0) {
      const currentItemIds = new Set(currentCart.items.map(item => item.id))
      
      // Si no hay items guardados o están vacíos, seleccionar todos por defecto
      if (selectedItems.size === 0) {
        const allItems = new Set(currentCart.items.map(item => item.id))
        setSelectedItems(allItems)
        if (typeof window !== 'undefined') {
          localStorage.setItem('cart-selected-items', JSON.stringify(Array.from(allItems)))
        }
      } else {
        // Sincronizar con items actuales (eliminar items que ya no existen)
        const filtered = new Set(Array.from(selectedItems).filter(id => currentItemIds.has(id)))
        if (filtered.size !== selectedItems.size) {
          setSelectedItems(filtered)
          if (typeof window !== 'undefined') {
            localStorage.setItem('cart-selected-items', JSON.stringify(Array.from(filtered)))
          }
        }
      }
    } else if (!currentCart || currentCart.items.length === 0) {
      // Si el carrito está vacío, limpiar selección
      setSelectedItems(new Set())
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart-selected-items')
      }
    }
  }, [currentCart])

  // Persistir cambios en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedItems.size >= 0) {
      localStorage.setItem('cart-selected-items', JSON.stringify(Array.from(selectedItems)))
    }
  }, [selectedItems])

  if (isLoading || isLoadingCarts) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-[#66DEDB] border-t-transparent rounded-full animate-spin"></div>
            <div
              className="absolute inset-2 border-4 border-[#73FFA2] border-t-transparent rounded-full animate-spin"
              style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
            ></div>
          </div>
          <p className="text-[#66DEDB] text-sm font-medium">Cargando carrito...</p>
        </div>
      </div>
    )
  }

  // Verificar si ambos carritos están vacíos
  const hasNormalItems = normalCart && normalCart.items.length > 0
  const hasGiftItems = giftCart && giftCart.items.length > 0
  
  if (!hasNormalItems && !hasGiftItems) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              className="w-24 h-24 mx-auto text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">Tu carrito está vacío</h1>
          <p className="text-gray-400 mb-8">
            Agrega algunos productos increíbles a tu carrito para comenzar.
          </p>
          <Link href="/feed">
            <Button className="bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold px-8 py-3">
              Continuar comprando
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Items del carrito actual según el tab activo
  const currentItems = currentCart?.items || []
  const currentCartForSummary = currentCart || { 
    id: '', 
    items: [], 
    subtotal: 0, 
    total: 0,
    isGiftCart: activeTab === 'gift-cart',
    giftRecipientId: activeTab === 'gift-cart' ? giftCart?.giftRecipientId : null
  } as Cart

  return (
    <div className="min-h-screen bg-[#1E1E1E] py-4 sm:py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#66DEDB] mb-6 sm:mb-8">Carrito</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => {
              setActiveTab('my-cart')
              setSelectedItems(new Set())
            }}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              activeTab === 'my-cart'
                ? 'text-[#66DEDB]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Mi carrito
            {hasNormalItems && (
              <span className="ml-2 text-sm text-gray-500">
                ({normalCart?.items.length || 0})
              </span>
            )}
            {activeTab === 'my-cart' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#66DEDB]"></div>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('gift-cart')
              setSelectedItems(new Set())
            }}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              activeTab === 'gift-cart'
                ? 'text-[#66DEDB]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>🎁</span>
              <span>Carrito de regalos</span>
            </span>
            {hasGiftItems && (
              <span className="ml-2 text-sm text-gray-500">
                ({giftCart?.items.length || 0})
              </span>
            )}
            {activeTab === 'gift-cart' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#66DEDB]"></div>
            )}
          </button>
        </div>

        {/* Contenido del tab activo */}
        {currentItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {activeTab === 'gift-cart' ? 'Carrito de regalos vacío' : 'Tu carrito está vacío'}
            </h2>
            <p className="text-gray-400 mb-6">
              {activeTab === 'gift-cart' 
                ? 'Agrega productos como regalo desde las wishlists de tus amigos.'
                : 'Agrega algunos productos increíbles a tu carrito para comenzar.'}
            </p>
            <Link href="/feed">
              <Button className="bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold px-6 py-2">
                Continuar comprando
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
            {/* Lista de items - Cards minimalistas */}
            <div className="space-y-4">
              {/* Header con botón seleccionar todo */}
              <div className="flex items-center justify-between">
                {activeTab === 'gift-cart' && giftCart?.giftRecipientId && (
                  <div className="text-sm text-gray-400">
                    <span className="text-[#66DEDB]">🎁</span> Enviando regalo a un amigo
                  </div>
                )}
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    onClick={() => {
                      const newSelected = selectedItems.size === currentItems.length && currentItems.length > 0
                        ? new Set<string>()
                        : new Set(currentItems.map(item => item.id))
                      setSelectedItems(newSelected)
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('cart-selected-items', JSON.stringify(Array.from(newSelected)))
                      }
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-[#66DEDB] text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {selectedItems.size > 0 
                      ? `${selectedItems.size} de ${currentItems.length} seleccionados`
                      : 'Seleccionar todos'}
                  </button>
                </div>
              </div>

              {/* Cards de productos */}
              <div className="space-y-3">
                {[...currentItems].sort((a, b) => {
                  const dateA = new Date(a.createdAt || 0).getTime()
                  const dateB = new Date(b.createdAt || 0).getTime()
                  return dateB - dateA // Más reciente primero
                }).map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.has(item.id)}
                    onSelectChange={(itemId, selected) => {
                      const newSelected = new Set(selectedItems)
                      if (selected) {
                        newSelected.add(itemId)
                      } else {
                        newSelected.delete(itemId)
                      }
                      setSelectedItems(newSelected)
                      // Persistir inmediatamente
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('cart-selected-items', JSON.stringify(Array.from(newSelected)))
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Resumen */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              <CartSummary cart={currentCartForSummary} selectedItems={selectedItems} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-[#66DEDB] border-t-transparent rounded-full animate-spin"></div>
              <div
                className="absolute inset-2 border-4 border-[#73FFA2] border-t-transparent rounded-full animate-spin"
                style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
              ></div>
            </div>
            <p className="text-[#66DEDB] text-sm font-medium">Cargando...</p>
          </div>
        </div>
      }
    >
      <CartPageContent />
    </Suspense>
  )
}

