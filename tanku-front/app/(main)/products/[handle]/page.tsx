'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { useProduct } from '@/lib/hooks/use-product'
import { track } from '@/lib/analytics/tracker'
import { ProductDetailContent } from '@/components/products/product-detail-content'
import { ProductAgeRestricted } from '@/components/products/product-age-restricted'
import { isAgeRestrictedApiError } from '@/lib/api/error-codes'
import { useAuthStore } from '@/lib/stores/auth-store'
import { BaseNav } from '@/components/layout/base-nav'
import { NavBackToFeedLink } from '@/components/layout/nav-back-to-feed'
import type { FeedItemDTO, ProductDTO } from '@/types/api'

/** Mismo aire bajo BaseNav que /messages (sin buscador en el nav). */
const DETAIL_PAGE_NAV_TOP_PT =
  'max-md:pt-[max(4.625rem,calc(env(safe-area-inset-top,0px)+4.125rem))] md:pt-[6.625rem] lg:pt-[4.75rem] xl:pt-[6.5rem]'

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
      <div
        className="flex min-h-screen flex-1 items-center justify-center"
        style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
      >
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
      <div
        className="flex min-h-screen flex-1 items-center justify-center"
        style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
      >
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
    <div
      className="relative z-0 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
    >
      <div className="pointer-events-none relative z-40 h-0 shrink-0 overflow-visible">
        <BaseNav
          showStories={false}
          canHide={false}
          isVisible
          pageTitle={displayProduct.title}
          pageTitleColor="#FFFFFF"
          mobileBackCenterTitleCartOnly
          mobileTranslucentNav
          desktopNavTitleCentered
          startContent={<NavBackToFeedLink />}
          className="pointer-events-auto"
        />
      </div>
      <div
        id="product-scroll-root"
        className={clsx(
          'custom-scrollbar relative z-0 min-h-0 w-full flex-1 basis-0 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]',
          'px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:px-8 lg:pb-8 xl:px-10',
          DETAIL_PAGE_NAV_TOP_PT,
        )}
      >
        <div
          className={clsx(
            'flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#414141] shadow-xl',
            'md:h-[calc(100dvh-10rem)]',
            'lg:h-[calc(100vh-11rem)] xl:h-[calc(100vh-12rem)]',
          )}
          style={{ backgroundColor: '#171B21' }}
        >
          <ProductDetailContent product={displayProduct} isPageView={true} />
        </div>
      </div>
    </div>
  )
}
