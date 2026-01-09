'use client'

import { useEffect, Suspense } from 'react'
import { useCartStore } from '@/lib/stores/cart-store'
import { CartItem } from '@/components/cart/cart-item'
import { CartSummary } from '@/components/cart/cart-summary'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function CartPageContent() {
  const { cart, fetchCart, isLoading } = useCartStore()

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  // Escuchar eventos de actualización del carrito
  useEffect(() => {
    const handleCartUpdated = () => {
      fetchCart()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('cartUpdated', handleCartUpdated)
      return () => {
        window.removeEventListener('cartUpdated', handleCartUpdated)
      }
    }
  }, [fetchCart])

  if (isLoading && !cart) {
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

  if (!cart || cart.items.length === 0) {
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

  return (
    <div className="min-h-screen bg-[#1E1E1E] py-4 sm:py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#66DEDB] mb-6 sm:mb-8">Carrito</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
          {/* Lista de items */}
          <div className="bg-gray-800/50 rounded-lg overflow-hidden">
            <div className="bg-zinc-800 px-4 sm:px-6 py-4 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-[#66DEDB]">Productos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-zinc-800 border-b border-gray-700">
                  <tr className="text-[#3B9BC3] font-medium text-sm">
                    <th className="p-3 sm:p-4 pl-4 sm:pl-6 text-center" style={{ width: '80px' }}>
                      Imagen
                    </th>
                    <th className="p-3 sm:p-4 text-left">Producto</th>
                    <th className="p-3 sm:p-4 text-center">Cantidad</th>
                    <th className="p-3 sm:p-4 text-center hidden sm:table-cell">Precio</th>
                    <th className="p-3 sm:p-4 pr-4 sm:pr-6 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {[...cart.items].sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime()
                    const dateB = new Date(b.createdAt || 0).getTime()
                    return dateB - dateA // Más reciente primero
                  }).map((item) => (
                    <CartItem key={item.id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <CartSummary cart={cart} />
          </div>
        </div>
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

