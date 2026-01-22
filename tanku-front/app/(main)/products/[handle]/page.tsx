'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProduct } from '@/lib/hooks/use-product'
import { ProductDetailContent } from '@/components/products/product-detail-content'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import type { FeedItemDTO } from '@/types/api'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const handle = params.handle as string
  const [product, setProduct] = useState<FeedItemDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Cargar producto completo
  const { product: fullProduct, isLoading: isLoadingProduct, error: productError } = useProduct(
    handle,
    { enabled: !!handle }
  )

  useEffect(() => {
    if (fullProduct) {
      // Convertir producto completo a FeedItemDTO para el componente
      const productDTO: FeedItemDTO = {
        id: fullProduct.id,
        type: 'product',
        handle: fullProduct.handle,
        title: fullProduct.title,
        imageUrl: fullProduct.images?.[0] || '',
        price: fullProduct.variants?.[0]?.tankuPrice || 0,
        category: fullProduct.category || undefined,
        createdAt: fullProduct.createdAt || new Date().toISOString(),
      }
      setProduct(productDTO)
      setIsLoading(false)
    } else if (productError) {
      setIsLoading(false)
    }
  }, [fullProduct, productError])

  if (isLoading || isLoadingProduct) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Producto no encontrado</p>
          <button
            onClick={() => router.push('/feed')}
            className="px-4 py-2 bg-[#73FFA2] text-gray-900 rounded-lg font-semibold hover:bg-[#60D489]"
          >
            Volver al feed
          </button>
        </div>
      </div>
    )
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/products/${handle}` : ''
  const productImage = product.imageUrl || ''

  return (
    <div className="min-h-screen bg-gray-900">
        {/* Header con botón volver */}
        <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
              aria-label="Volver"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-white font-semibold text-lg">{product.title}</h1>
          </div>
        </div>

      {/* Contenido del producto */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ProductDetailContent
          product={product}
          isPageView={true}
        />
      </div>
    </div>
  )
}

