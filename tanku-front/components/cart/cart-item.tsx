'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/lib/stores/cart-store'
import { useProduct } from '@/lib/hooks/use-product'
import { VariantSelector } from '@/components/products/variant-selector'
import type { CartItem } from '@/types/api'
import type { ProductVariantDTO } from '@/types/api'

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
  const confirmDeleteRef = useRef<HTMLDivElement>(null)

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
    // Si es la misma variante, mantener la cantidad actual
    if (newVariant.id === item.variantId) {
      setModalQuantity(item.quantity)
    } else {
      // Si es diferente, resetear a 1
      setModalQuantity(1)
    }
  }

  const handleUpdateQuantity = async () => {
    if (!selectedVariantInModal) return

    try {
      // Si es la misma variante, actualizar cantidad
      if (selectedVariantInModal.id === item.variantId) {
        await updateItem(item.id, modalQuantity)
        setShowVariantModal(false)
      } else {
        // Si es diferente variante, eliminar el actual y agregar el nuevo
        try {
          await removeItem(item.id)
        } catch (err: any) {
          // Si el error es NOT_FOUND, el item ya no existe, continuar agregando el nuevo
          if (!err?.message?.includes('NOT_FOUND') && !err?.message?.includes('no encontrado')) {
            throw err
          }
          console.warn('Item ya no existe, agregando nueva variante...')
        }
        await addItem(selectedVariantInModal.id, modalQuantity)
        setShowVariantModal(false)
      }
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
        className={`bg-gray-800/50 rounded-lg p-3 transition-all relative cursor-pointer ${isSelected ? 'ring-2 ring-[#73FFA2]' : ''}`}
        onClick={handleCardClick}
      >
        {/* Icono de basura en esquina superior derecha */}
        <div className="absolute top-2 right-2 z-10">
          <div className="relative" ref={confirmDeleteRef}>
            {showConfirmDelete && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowConfirmDelete(false)
                  }}
                />
                <div className="absolute bottom-full right-0 mb-2 z-30 bg-gray-900 border border-[#73FFA2]/50 rounded-lg p-3 shadow-xl whitespace-nowrap">
                  <p className="text-xs text-white mb-2">¿Eliminar este producto del carrito?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveConfirm()
                      }}
                      className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Sí
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveCancel()
                      }}
                      className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      No
                    </button>
                  </div>
                </div>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveClick()
              }}
              className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-900/20"
              title="Eliminar producto"
              data-no-select
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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

        <div className="flex gap-3">
          {/* Imagen - clickeable */}
          <div className="flex-shrink-0">
            {productHandle ? (
              <Link 
                href={`/products/${productHandle}`}
                className="block w-24 h-24 sm:w-28 sm:h-28 relative rounded-lg overflow-hidden bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                data-no-select
              >
                <Image
                  src={productImage}
                  alt={productTitle}
                  fill
                  className="object-cover"
                  unoptimized={productImage?.includes('cloudfront.net')}
                />
              </Link>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 relative rounded-lg overflow-hidden bg-gray-700">
                <Image
                  src={productImage}
                  alt={productTitle}
                  fill
                  className="object-cover"
                  unoptimized={productImage?.includes('cloudfront.net')}
                />
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              {/* Título y variante - clickeable */}
              <div className="flex-1 min-w-0">
                {productHandle ? (
                  <Link 
                    href={`/products/${productHandle}`}
                    className="block cursor-pointer hover:text-[#66DEDB] transition-colors"
                    data-no-select
                  >
                    <h3 className="text-white font-medium text-base mb-0.5 truncate">{productTitle}</h3>
                  </Link>
                ) : (
                  <h3 className="text-white font-medium text-base mb-0.5 truncate">{productTitle}</h3>
                )}
                {variantTitle && (
                  <p className="text-gray-400 text-sm mb-1">{variantTitle}</p>
                )}
                {stock > 0 && (
                  <p className="text-gray-500 text-xs">Stock: {stock}</p>
                )}
              </div>

              {/* Precio unitario */}
              <div className="flex-shrink-0 text-right mt-7">
                <div className="text-gray-400 text-xs mb-0.5">Precio unitario</div>
                <div className="text-gray-300 text-sm">{formatPrice(unitPrice)}</div>
              </div>
            </div>

            {/* Cantidad, cambiar opción y Total - en la misma línea */}
            <div className="flex items-center justify-between gap-4 mt-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5" data-no-select>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleQuantityChangeInCard(item.quantity - 1)
                    }}
                    disabled={item.quantity <= 1}
                    className="w-5 h-5 rounded text-[#66DEDB] hover:text-[#5accc9] hover:bg-[#66DEDB]/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-xs font-medium"
                    title="Disminuir cantidad"
                  >
                    −
                  </button>
                  <span className="text-gray-400 text-sm min-w-[4rem] text-center">
                    Cantidad: <span className="text-white font-medium">{item.quantity}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleQuantityChangeInCard(item.quantity + 1)
                    }}
                    disabled={item.quantity >= Math.min(stock, 10)}
                    className="w-5 h-5 rounded text-[#66DEDB] hover:text-[#5accc9] hover:bg-[#66DEDB]/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-xs font-medium"
                    title="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
                {hasMultipleVariants && (
                  <button
                    onClick={handleChangeOption}
                    className="text-[#66DEDB] hover:text-[#5accc9] text-sm font-medium transition-colors underline"
                    data-no-select
                  >
                    Cambiar opción
                  </button>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-gray-400 text-xs mb-0.5">Total</div>
                <div className="text-[#66DEDB] font-bold text-base">{formatPrice(total)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                    ? 'Selecciona una opción o ajusta la cantidad:' 
                    : 'Selecciona una opción diferente:'}
                </p>
                <VariantSelector
                  variants={variants}
                  selectedVariant={selectedVariantInModal || currentVariant}
                  onVariantChange={handleVariantSelect}
                  formatPrice={formatPrice}
                />
                
                {/* Mostrar cantidad si es la misma variante o si hay una seleccionada */}
                {selectedVariantInModal && (
                  <div className="space-y-2 pt-2">
                    <label className="text-gray-400 text-sm">Cantidad:</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleQuantityChange(modalQuantity - 1)}
                        disabled={modalQuantity <= 1}
                        className="w-10 h-10 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-white font-semibold">{modalQuantity}</span>
                      <button
                        onClick={() => handleQuantityChange(modalQuantity + 1)}
                        disabled={modalQuantity >= Math.min(selectedVariantInModal.stock || 10, 10)}
                        className="w-10 h-10 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                      {selectedVariantInModal.stock > 0 && (
                        <span className="text-gray-500 text-xs ml-2">
                          Stock: {selectedVariantInModal.stock}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowVariantModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateQuantity}
                    disabled={!selectedVariantInModal || modalQuantity < 1}
                    className="flex-1 px-4 py-2 bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedVariantInModal?.id === item.variantId ? 'Actualizar cantidad' : 'Cambiar opción'}
                  </button>
                  {productHandle && (
                    <Link
                      href={`/products/${productHandle}`}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-center text-sm"
                    >
                      Ver
                    </Link>
                  )}
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


