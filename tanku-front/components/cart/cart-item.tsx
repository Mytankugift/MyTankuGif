'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/lib/stores/cart-store'
import { useProduct } from '@/lib/hooks/use-product'
import { VariantSelector } from '@/components/products/variant-selector'
import type { CartItem } from '@/types/api'
import type { ProductVariantDTO } from '@/types/api'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import { clsx } from 'clsx'
import { TANKU_CART_ITEM_SURFACE } from '@/lib/checkout-tanku-design'

interface CartItemProps {
  item: CartItem
  isSelected?: boolean
  onSelectChange?: (itemId: string, selected: boolean) => void
}

export function CartItem({ item, isSelected = false, onSelectChange }: CartItemProps) {
  const { updateItem, removeItem, addItem } = useCartStore()
  const [error, setError] = useState<string | null>(null)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [modalQuantity, setModalQuantity] = useState(item.quantity)
  const [selectedVariantInModal, setSelectedVariantInModal] = useState<ProductVariantDTO | null>(null)

  // Sincronizar cantidad del modal cuando cambia el item
  useEffect(() => {
    setModalQuantity(item.quantity)
  }, [item.quantity])
  
  // Cargar producto completo para verificar si tiene variantes y para el modal
  const { product: fullProduct, isLoading: isLoadingProduct } = useProduct(
    item.product?.handle || null,
    { enabled: !!item.product?.handle }
  )

  // Verificar si el producto tiene más de una variante
  const hasMultipleVariants = fullProduct?.variants && fullProduct.variants.length > 1

  // Inicializar variante cuando se abre el modal o cuando el producto se carga
  useEffect(() => {
    if (showVariantModal && fullProduct?.variants) {
      const currentVariant = fullProduct.variants.find(v => v.id === item.variantId)
      if (currentVariant) {
        setSelectedVariantInModal(currentVariant)
        // Asegurar que la cantidad sea la del item actual cuando se abre el modal
        setModalQuantity(item.quantity)
      }
    }
  }, [showVariantModal, fullProduct, item.variantId, item.quantity])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // No seleccionar si se hace click en un link, botón o el menú
    const target = e.target as HTMLElement
    if (
      target.closest('a') ||
      target.closest('button') ||
      target.closest('[data-no-select]')
    ) {
      return
    }
    onSelectChange?.(item.id, !isSelected)
  }

  const handleRemoveClick = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setShowConfirmDelete(true)
  }

  const handleRemoveConfirm = async () => {
    setShowConfirmDelete(false)
    
    try {
      // Obtener el cartId del item desde el store
      // Buscar en ambos carritos (normal y de regalos)
      const { normalCart, giftCart } = useCartStore.getState()
      let cartId: string | undefined
      
      // Buscar en el carrito normal
      if (normalCart?.items?.some(i => i.id === item.id)) {
        cartId = normalCart.id
      }
      // Buscar en el carrito de regalos
      else if (giftCart?.items?.some(i => i.id === item.id)) {
        cartId = giftCart.id
      }
      
      await removeItem(item.id, cartId)
      // Si el item se eliminó correctamente, el carrito se actualizará automáticamente
    } catch (err: any) {
      // Si el error es NOT_FOUND, el item ya no existe, no mostrar error
      if (err?.message?.includes('NOT_FOUND') || err?.message?.includes('no encontrado')) {
        console.warn('Item ya no existe, el carrito se actualizará automáticamente')
        // Recargar ambos carritos para actualizar la UI
        await useCartStore.getState().fetchBothCarts()
        return
      }
      console.error('Error eliminando item:', err)
      alert(err?.message || 'Error al eliminar producto')
    }
  }

  const handleRemoveCancel = () => {
    setShowConfirmDelete(false)
  }

  const handleChangeOption = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Asegurar que la cantidad sea la del item actual antes de abrir el modal
    setModalQuantity(item.quantity)
    setShowVariantModal(true)
  }

  const handleVariantSelect = (newVariant: ProductVariantDTO) => {
    setSelectedVariantInModal(newVariant)
  }

  const handleUpdateQuantity = async () => {
    if (!selectedVariantInModal) return

    try {
      // Si es la misma variante, no hacer nada (solo cerrar)
      if (selectedVariantInModal.id === item.variantId) {
        setShowVariantModal(false)
        return
      }
      
      // Si es diferente variante, eliminar el actual y agregar el nuevo con la misma cantidad
      try {
        await removeItem(item.id)
      } catch (err: any) {
        // Si el error es NOT_FOUND, el item ya no existe, continuar agregando el nuevo
        if (!err?.message?.includes('NOT_FOUND') && !err?.message?.includes('no encontrado')) {
          throw err
        }
        console.warn('Item ya no existe, agregando nueva variante...')
      }
      await addItem(selectedVariantInModal.id, item.quantity) // Mantener la misma cantidad
      setShowVariantModal(false)
    } catch (err: any) {
      console.error('Error actualizando:', err)
      alert(err?.message || 'Error al actualizar')
    }
  }

  const handleQuantityChangeInCard = async (newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > Math.min(stock, 10)) {
      return
    }

    try {
      await updateItem(item.id, newQuantity)
    } catch (err: any) {
      console.error('Error actualizando cantidad:', err)
      alert(err?.message || 'Error al actualizar cantidad')
    }
  }

  const handleQuantityChange = (newQuantity: number) => {
    const maxQuantity = Math.min(selectedVariantInModal?.stock || 10, 10)
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setModalQuantity(newQuantity)
    }
  }

  const productImage = item.product?.images?.[0] || '/placeholder.png'
  // Limpiar título para evitar duplicados o saltos de línea
  const rawTitle = item.product?.title || 'Producto sin título'
  const productTitle = rawTitle.split('\n')[0].trim() // Tomar solo la primera línea y limpiar espacios
  const productHandle = item.product?.handle
  const variantTitle = item.variant?.title || ''
  const unitPrice = item.unitPrice || item.price || 0
  const total = item.total || unitPrice * item.quantity
  const stock = item.variant?.stock || 0

  const variants = fullProduct?.variants || []
  const currentVariant = variants.find(v => v.id === item.variantId) || variants[0]

  return (
    <>
      <div
        className={clsx(
          TANKU_CART_ITEM_SURFACE,
          'relative cursor-pointer transition-all',
          isSelected
            ? '!border-2 !border-[#73FFA2] !bg-[#171B21]/55 !ring-1 !ring-inset !ring-white/[0.04] !shadow-[0_2px_20px_rgba(0,0,0,0.12)]'
            : 'border border-white/[0.08]',
          'max-md:!border-r-0 max-md:!ring-0',
        )}
        onClick={handleCardClick}
      >
        <div className="flex gap-3">
          {/* Imagen - clickeable */}
          <div className="shrink-0">
            {productHandle ? (
              <Link
                href={`/products/${productHandle}`}
                className="relative block h-24 w-24 cursor-pointer overflow-hidden rounded-3xl bg-gray-700 transition-opacity hover:opacity-80 sm:h-28 sm:w-28"
                data-no-select
              >
                <Image
                  src={productImage}
                  alt={productTitle}
                  fill
                  className="object-cover"
                  unoptimized={isRemoteImageSrc(productImage)}
                />
              </Link>
            ) : (
              <div className="relative h-20 w-20 overflow-hidden rounded-3xl bg-gray-700 sm:h-24 sm:w-24">
                <Image
                  src={productImage}
                  alt={productTitle}
                  fill
                  className="object-cover"
                  unoptimized={isRemoteImageSrc(productImage)}
                />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* Título y basura: misma fila; el título nunca empuja el icono (min-w-0 + line-clamp) */}
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {productHandle ? (
                  <>
                    <h3 className="mb-0.5 line-clamp-2 break-words text-base font-medium text-white sm:line-clamp-3 md:hidden">
                      {productTitle}
                    </h3>
                    <Link
                      href={`/products/${productHandle}`}
                      className="hidden cursor-pointer transition-colors hover:text-[#66DEDB] md:block"
                      data-no-select
                    >
                      <h3 className="mb-0.5 line-clamp-2 break-words text-base font-medium text-white sm:line-clamp-3">
                        {productTitle}
                      </h3>
                    </Link>
                  </>
                ) : (
                  <h3 className="mb-0.5 line-clamp-2 break-words text-base font-medium text-white sm:line-clamp-3">
                    {productTitle}
                  </h3>
                )}
                {variantTitle && <p className="text-sm text-gray-400">{variantTitle}</p>}
                {stock > 0 && <p className="text-xs text-gray-500">Stock: {stock}</p>}
                <p className="mt-1 text-xs text-zinc-500">
                  c/u: <span className="text-zinc-300">{formatPrice(unitPrice)}</span>
                </p>
              </div>

              <div className="relative shrink-0 pt-0.5" data-no-select>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveClick()
                  }}
                  className="rounded-full p-1.5 text-red-400 transition-colors hover:bg-red-900/25 hover:text-red-300"
                  title="Eliminar producto"
                  type="button"
                  data-no-select
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3" data-no-select>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleQuantityChangeInCard(item.quantity - 1)
                    }}
                    disabled={item.quantity <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-medium text-[#66DEDB] transition-colors hover:bg-[#66DEDB]/10 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Disminuir cantidad"
                  >
                    −
                  </button>
                  <span className="min-w-[3.5rem] text-center text-sm text-gray-400">
                    <span className="font-medium text-white">{item.quantity}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleQuantityChangeInCard(item.quantity + 1)
                    }}
                    disabled={item.quantity >= Math.min(stock, 10)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-medium text-[#66DEDB] transition-colors hover:bg-[#66DEDB]/10 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
                {hasMultipleVariants && (
                  <button
                    type="button"
                    onClick={handleChangeOption}
                    className="text-sm font-medium text-[#66DEDB] underline transition-colors hover:text-[#5accc9]"
                    data-no-select
                  >
                    Cambiar opción
                  </button>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Total</div>
                <div className="text-lg font-bold text-[#66DEDB]">{formatPrice(total)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirmDelete && (
        <div
          className="fixed inset-0 z-[2000000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={handleRemoveCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-item-delete-title"
        >
          <div
            className="w-full max-w-sm rounded-[2.5rem] border border-white/10 bg-[#1a1d24] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="cart-item-delete-title" className="text-lg font-semibold text-white">
              ¿Quitar del carrito?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Se quitará de tu carrito. Puedes volver a añadirlo en cualquier momento.
            </p>
            <p className="mt-2 line-clamp-2 break-words text-sm font-medium text-[#66DEDB]">{productTitle}</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={handleRemoveCancel}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleRemoveConfirm()
                }}
                className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar opciones */}
      {showVariantModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowVariantModal(false)}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Cambiar opción</h3>
              <button
                onClick={() => setShowVariantModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-300 mb-2">{productTitle}</p>
            </div>

            {isLoadingProduct ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
              </div>
            ) : fullProduct && variants.length > 1 ? (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm mb-2">
                  {selectedVariantInModal?.id === item.variantId 
                    ? 'Selecciona una opción diferente:' 
                    : 'Selecciona una opción diferente:'}
                </p>
                <VariantSelector
                  variants={variants}
                  selectedVariant={selectedVariantInModal || currentVariant}
                  onVariantChange={handleVariantSelect}
                  formatPrice={formatPrice}
                />
                
                {/* Mostrar cantidad si es la misma variante o si hay una seleccionada */}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowVariantModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateQuantity}
                    disabled={!selectedVariantInModal || selectedVariantInModal.id === item.variantId}
                    className="flex-1 px-4 py-2 bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cambiar opción
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm mb-4">
                  Este producto no tiene opciones disponibles para cambiar.
                </p>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowVariantModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cerrar
                  </button>
                  {productHandle && (
                    <Link
                      href={`/products/${productHandle}`}
                      className="flex-1 px-4 py-2 bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold rounded-lg transition-colors text-center"
                    >
                      Ver producto
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}


