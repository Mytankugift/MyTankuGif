'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { clsx } from 'clsx'
import { useProduct } from '@/lib/hooks/use-product'
import { track } from '@/lib/analytics/tracker'
import { ProductDetailContent } from '@/components/products/product-detail-content'
import { ProductAgeRestricted } from '@/components/products/product-age-restricted'
import { isAgeRestrictedApiError } from '@/lib/api/error-codes'
import { useAuthStore } from '@/lib/stores/auth-store'
import { TANKU_CARD_SHELL_RADIUS_PX } from '@/lib/utils/tanku-card-radius'
import { tankuOrderModalBackdropClass } from '@/lib/ui/tanku-modal-surface'
import type { FeedItemDTO, ProductDTO } from '@/types/api'

function toFeedItem(p: ProductDTO): FeedItemDTO {
  return {
    id: p.id,
    type: 'product',
    handle: p.handle,
    title: p.title,
    imageUrl: p.images?.[0] || '',
    price: p.variants?.[0]?.tankuPrice || 0,
    category: p.category || undefined,
    createdAt: p.createdAt || new Date().toISOString(),
  }
}

export default function ProductPage() {
  const { isAuthenticated } = useAuthStore()
  const params = useParams()
  const router = useRouter()
  const handle = params.handle as string
  const [product, setProduct] = useState<FeedItemDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { product: fullProduct, isLoading: isLoadingProduct, error: productError } = useProduct(
    handle,
    { enabled: !!handle },
  )

  const displayProduct = useMemo(() => {
    if (fullProduct) return toFeedItem(fullProduct)
    return product
  }, [fullProduct, product])

  // Entrar a la página de producto cuenta como apertura de detalle (interés real),
  // igual que abrir el modal del feed. Una vez por producto cargado.
  const trackedProductRef = useRef<string | null>(null)
  useEffect(() => {
    if (fullProduct?.id && trackedProductRef.current !== fullProduct.id) {
      trackedProductRef.current = fullProduct.id
      track('product_click', {
        entityType: 'product',
        entityId: fullProduct.id,
        metadata: { source: 'page' },
      })
    }
  }, [fullProduct?.id])

  useEffect(() => {
    if (fullProduct) {
      setProduct(toFeedItem(fullProduct))
      setIsLoading(false)
    } else if (productError) {
      setIsLoading(false)
    }
  }, [fullProduct, productError])

  if (isLoading || isLoadingProduct) {
    return (
      <div className={clsx('flex min-h-screen flex-1 items-center justify-center', tankuOrderModalBackdropClass)}>
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#73FFA2]" />
      </div>
    )
  }

  if (productError && !fullProduct && isAgeRestrictedApiError(productError)) {
    return (
      <ProductAgeRestricted
        isAuthenticated={isAuthenticated}
        variant="page"
        onBack={() => router.back()}
      />
    )
  }

  if (!displayProduct) {
    return (
      <div className={clsx('flex min-h-screen flex-1 items-center justify-center', tankuOrderModalBackdropClass)}>
        <div className="text-center">
          <p className="mb-4 text-xl text-red-400">Producto no encontrado</p>
          <button
            onClick={() => router.push('/feed')}
            className="rounded-lg bg-[#73FFA2] px-4 py-2 font-semibold text-gray-900 hover:bg-[#60D489]"
          >
            Volver al feed
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('flex min-h-0 w-full flex-1 flex-col overflow-hidden', tankuOrderModalBackdropClass)}>
      <div
        className={clsx(
          'custom-scrollbar flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]',
          'px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] pt-4',
          'md:pt-6 lg:px-8 lg:pb-8 lg:pt-6 xl:px-10 xl:pt-8',
        )}
      >
        <div
          className={clsx(
            'flex min-h-0 w-full flex-1 flex-col overflow-hidden border border-[#414141] shadow-xl',
            'md:min-h-[calc(100dvh-10rem)] lg:min-h-[calc(100vh-11rem)] xl:min-h-[calc(100vh-12rem)]',
          )}
          style={{
            backgroundColor: '#171B21',
            borderRadius: `${TANKU_CARD_SHELL_RADIUS_PX}px`,
          }}
        >
          <div className="flex-shrink-0 border-b border-white/[0.08] bg-[#171B21]">
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                aria-label="Volver"
              >
                <Image
                  src="/icons_tanku/mobile_tanku_menu_ir_atras_Universal.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                  unoptimized
                />
              </button>
              <h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-white">
                {displayProduct.title}
              </h1>
              <div className="h-9 w-9 flex-shrink-0" aria-hidden />
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ProductDetailContent product={displayProduct} isPageView={true} />
          </div>
        </div>
      </div>
    </div>
  )
}
