'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useProduct } from '@/lib/hooks/use-product'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { VariantSelector } from '@/components/products/variant-selector'
import type { ProductDTO, FeedItemDTO } from '@/types/api'

interface ProductModalProps {
  product: FeedItemDTO | null // Producto básico del feed
  isOpen: boolean
  onClose: () => void
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const { isAuthenticated } = useAuthStore()
  const { addItem, isLoading: isCartLoading } = useCartStore()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar producto completo usando el hook
  const { product: fullProduct, isLoading: isLoadingProduct, error: productError } = useProduct(
    product?.handle || null,
    { enabled: isOpen && !!product?.handle }
  )

  // Resetear estado cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen && product) {
      setCurrentImageIndex(0)
      setSelectedVariantIndex(0)
      setQuantity(1)
      setError(null)
    }
  }, [isOpen, product])

  // Cerrar con ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen || !product) return null

  const displayProduct = fullProduct || null
  const variants = displayProduct?.variants || []
  const selectedVariant = variants[selectedVariantIndex] || variants[0]

  // Calcular precio con incremento (15% + $10,000)
  const basePrice = selectedVariant?.suggestedPrice || selectedVariant?.price || 0
  const finalPrice = basePrice > 0 ? Math.round((basePrice * 1.15) + 10000) : 0
  const stock = selectedVariant?.stock || 0
  const maxQuantity = Math.min(stock, 10)

  // Obtener imágenes
  const images = displayProduct?.images || []
  const allImages = displayProduct?.thumbnail
    ? [displayProduct.thumbnail, ...images]
    : images.length > 0
    ? images
    : product.imageUrl
    ? [product.imageUrl]
    : []

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity)
    }
  }

  const handleAddToCart = async () => {
    if (!selectedVariant?.id || stock === 0 || isAddingToCart) return

    setIsAddingToCart(true)
    setError(null)

    try {
      await addItem(selectedVariant.id, quantity)
      // Pequeño delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 300))
      // Opcional: cerrar modal después de agregar
      // onClose()
    } catch (err: any) {
      setError(err?.message || 'Error al agregar al carrito')
      console.error('Error agregando al carrito:', err)
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleBuyNow = async () => {
    if (!selectedVariant?.id || stock === 0) return

    setIsAddingToCart(true)
    setError(null)

    try {
      await addItem(selectedVariant.id, quantity)
      // Redirigir al checkout
      window.location.href = '/checkout'
    } catch (err: any) {
      setError(err?.message || 'Error al procesar compra')
      console.error('Error en comprar ahora:', err)
      setIsAddingToCart(false)
    }
  }

  const loading = isLoadingProduct || !displayProduct
  const productTitle = displayProduct?.title || product.title
  const productDescription = displayProduct?.description || ''

  return (
    <>
      {/* Lightbox para imagen ampliada */}
      {isImageLightboxOpen && allImages.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60] p-4"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          <button
            onClick={() => setIsImageLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 bg-gray-800 hover:bg-gray-700 rounded-full p-3 text-white transition-all shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div
            className="relative max-w-7xl max-h-[95vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={allImages[currentImageIndex]}
              alt={productTitle}
              width={1200}
              height={1600}
              className="max-w-full max-h-full object-contain"
              unoptimized={allImages[currentImageIndex]?.includes('cloudfront.net')}
            />
            {allImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-800 hover:bg-gray-700 rounded-full p-3 text-white transition-all z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-800 hover:bg-gray-700 rounded-full p-3 text-white transition-all z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {allImages.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-[#66DEDB]' : 'bg-white bg-opacity-50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal principal */}
      <div
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
        onClick={onClose}
      >
        <div
          className="bg-gray-900 rounded-lg sm:rounded-2xl w-full max-w-6xl h-full max-h-[95vh] sm:max-h-[92vh] overflow-hidden flex flex-col relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botón de cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-gray-800 hover:bg-red-600 rounded-full p-2.5 text-white transition-all shadow-lg hover:scale-110"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-[#66DEDB] border-t-transparent rounded-full animate-spin"></div>
                  <div
                    className="absolute inset-2 border-4 border-[#73FFA2] border-t-transparent rounded-full animate-spin"
                    style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
                  ></div>
                </div>
                <p className="text-[#66DEDB] text-sm font-medium">Cargando producto...</p>
              </div>
            </div>
          )}

          {/* Contenido */}
          <div
            className={`flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden pt-4 transition-opacity duration-300 ${
              !loading ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Columna izquierda - Imágenes y descripción (60%) */}
            <div className="w-full lg:w-[60%] lg:flex-shrink-0 flex flex-row min-h-0 border-r border-gray-700">
              {/* Miniaturas */}
              {allImages.length > 1 && (
                <div className="flex flex-col gap-2 p-2 overflow-y-auto scrollbar-hide">
                  {allImages.map((image: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                        index === currentImageIndex
                          ? 'border-[#66DEDB] ring-2 ring-[#66DEDB] ring-opacity-50'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${productTitle} - Imagen ${index + 1}`}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        unoptimized={image?.includes('cloudfront.net')}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Contenedor principal de imagen y descripción */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Imagen principal */}
                <div
                  className="flex-[0.55] min-h-[55%] relative bg-gray-800 flex items-center justify-center flex-shrink-0 cursor-pointer group"
                  onClick={() => setIsImageLightboxOpen(true)}
                >
                  {allImages.length > 0 ? (
                    <>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all z-10 flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium bg-black bg-opacity-60 px-4 py-2 rounded-lg">
                          Click para ampliar
                        </span>
                      </div>
                      <Image
                        src={allImages[currentImageIndex]}
                        alt={productTitle}
                        width={500}
                        height={600}
                        className="w-full h-full object-contain p-4"
                        unoptimized={allImages[currentImageIndex]?.includes('cloudfront.net')}
                      />
                    </>
                  ) : (
                    <div className="text-gray-400 text-sm">No hay imagen disponible</div>
                  )}
                </div>

                {/* Descripción */}
                {productDescription && (
                  <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto bg-gray-800 bg-opacity-50 min-h-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-3">Descripción</h3>
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                      {productDescription}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha - Información del producto (40%) */}
            <div className="w-full lg:w-[40%] lg:flex-shrink-0 p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col min-h-0 overflow-hidden">
              {/* Título */}
              <div className="mb-4 mt-8">
                <h1 className="text-xl sm:text-2xl font-bold text-[#66DEDB]">{productTitle}</h1>
              </div>

              {/* Precio */}
              {finalPrice > 0 && (
                <div className="text-3xl sm:text-4xl font-bold text-[#66DEDB] mb-6">
                  {formatPrice(finalPrice)}
                </div>
              )}

              {/* Stock */}
              <div className="mb-5 pb-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Stock disponible:</span>
                  <span className={`text-base font-semibold ${stock > 0 ? 'text-[#66DEDB]' : 'text-red-400'}`}>
                    {stock > 0 ? `${stock} unidades` : 'Sin stock'}
                  </span>
                </div>
              </div>

              {/* Variantes */}
              {variants.length > 1 && (
                <div className="mb-6">
                  <label className="text-sm font-semibold text-gray-300 mb-3 block">Variante</label>
                  <VariantSelector
                    variants={variants}
                    selectedVariant={selectedVariant}
                    onVariantChange={(variant) => {
                      const index = variants.findIndex((v) => v.id === variant.id)
                      setSelectedVariantIndex(index >= 0 ? index : 0)
                      setQuantity(1)
                    }}
                    formatPrice={formatPrice}
                  />
                </div>
              )}

              {/* Cantidad */}
              {stock > 0 && (
                <div className="mb-6 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-gray-300 whitespace-nowrap">Cantidad</label>
                    <div className="flex gap-2">
                      {Array.from({ length: Math.min(5, maxQuantity) }, (_, i) => i + 1).map((num) => (
                        <button
                          key={num}
                          onClick={() => handleQuantityChange(num)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium border-2 transition-all flex items-center justify-center ${
                            quantity === num
                              ? 'border-[#66DEDB] bg-[#66DEDB] bg-opacity-20 text-[#66DEDB]'
                              : 'border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-600 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex flex-col gap-3 mt-auto pt-6 border-t border-gray-700 flex-shrink-0">
                <Button
                  onClick={handleAddToCart}
                  disabled={stock === 0 || isAddingToCart || isCartLoading}
                  className="w-full bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold py-3.5 text-base transition-all"
                >
                  {isAddingToCart || isCartLoading
                    ? 'Agregando...'
                    : stock > 0
                    ? 'Agregar al carrito'
                    : 'Sin stock'}
                </Button>
                {stock > 0 && (
                  <Button
                    onClick={handleBuyNow}
                    disabled={isAddingToCart || isCartLoading}
                    className="w-full bg-[#73FFA2] hover:bg-[#66e68f] text-black font-semibold py-3.5 text-base transition-all"
                  >
                    {isAddingToCart || isCartLoading ? 'Procesando...' : 'Comprar ahora'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

