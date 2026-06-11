'use client'

import { useRef, useMemo } from 'react'
import Masonry from 'react-masonry-css'
import { ProductCard } from './product-card'
import { PosterCard } from './poster-card'
import { PromotionalBanner } from './promotional-banner'
import type { FeedItem } from '@/lib/types/feed.types'

interface LandingGridProps {
  items: FeedItem[]
  onProductClick?: (product: FeedItem) => void
  onPosterClick?: (poster: FeedItem) => void
  onPosterLikeUpdated?: (posterId: string, updates: { isLiked: boolean; likesCount: number }) => void
  onProductLikeUpdated?: (productId: string, updates: { isLiked: boolean; likesCount: number }) => void
  onProductWishlistUpdated?: (productId: string, updates: { isInWishlist: boolean }) => void
  onAuthRequired?: () => void
}

export function LandingGrid({
  items,
  onProductClick,
  onPosterClick,
  onPosterLikeUpdated,
  onProductLikeUpdated,
  onProductWishlistUpdated,
  onAuthRequired,
}: LandingGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const breakpointColumnsObj = useMemo(
    () => ({
      default: 4,
      1400: 4,
      1200: 3,
      1024: 3,
      768: 2,
      640: 2,
    }),
    []
  )

  const sections = useMemo(() => {
    if (items.length === 0) {
      return []
    }

    let productCount = 0
    const sections: Array<{ items: FeedItem[]; showBanner?: boolean; bannerVariant?: 1 | 2 }> = []
    let currentSection: FeedItem[] = []

    items.forEach((item) => {
      if (item.type === 'product') {
        productCount++
        currentSection.push(item)

        if (productCount === 48) {
          sections.push({ items: [...currentSection] })
          sections.push({ items: [], showBanner: true, bannerVariant: 1 })
          currentSection = []
        } else if (productCount === 100) {
          sections.push({ items: [...currentSection] })
          sections.push({ items: [], showBanner: true, bannerVariant: 2 })
          currentSection = []
        }
      } else {
        currentSection.push(item)
      }
    })

    if (currentSection.length > 0) {
      sections.push({ items: currentSection })
    }

    return sections
  }, [items])

  if (sections.length === 0) {
    return null
  }

  let globalItemIndex = 0
  return (
    <div className="w-full" ref={containerRef} style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {sections.map((section, sectionIndex) => {
        if (section.showBanner && section.bannerVariant) {
          return (
            <div
              key={`banner-${sectionIndex}`}
              className="w-full my-8"
              style={{
                width: '100%',
                maxWidth: '100%',
                position: 'relative',
                zIndex: 10,
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}
            >
              <PromotionalBanner variant={section.bannerVariant} />
            </div>
          )
        }

        if (section.items.length === 0) return null

        return (
          <Masonry
            key={`section-${sectionIndex}`}
            breakpointCols={breakpointColumnsObj}
            className="masonry-grid"
            columnClassName="masonry-grid_column"
          >
            {section.items.map((item) => {
              const currentIndex = globalItemIndex++
              const isAboveFold = currentIndex < 6

              if (item.type === 'product' && item.title) {
                return (
                  <div
                    key={`product-${item.id}-${currentIndex}`}
                    data-item-id={`product-${item.id}-${currentIndex}`}
                    className="mb-4"
                  >
                    <ProductCard
                      product={{
                        id: item.id,
                        type: 'product',
                        title: item.title,
                        imageUrl: item.imageUrl,
                        price: item.price,
                        category: item.category,
                        handle: item.handle,
                        likesCount: item.likesCount,
                        isLiked: item.isLiked,
                        isInWishlist: item.isInWishlist,
                      }}
                      onOpenModal={onProductClick}
                      onLikeUpdated={onProductLikeUpdated}
                      onWishlistUpdated={onProductWishlistUpdated}
                      isLightMode={false}
                      isAboveFold={isAboveFold}
                      isLanding={true}
                    />
                  </div>
                )
              }

              if (item.type === 'poster') {
                return (
                  <div
                    key={`poster-${item.id}-${currentIndex}`}
                    data-item-id={`poster-${item.id}-${currentIndex}`}
                    className="mb-4"
                  >
                    <PosterCard
                      poster={{
                        id: item.id,
                        type: 'poster',
                        imageUrl: item.imageUrl,
                        videoUrl: item.videoUrl,
                        description: item.description,
                        likesCount: item.likesCount ?? 0,
                        commentsCount: item.commentsCount ?? 0,
                        createdAt: item.createdAt,
                        isLiked: item.isLiked,
                        author: item.author,
                      }}
                      isLightMode={false}
                      isAboveFold={isAboveFold}
                      onOpenModal={() => onPosterClick?.(item)}
                      onLikeUpdated={onPosterLikeUpdated}
                      onAuthRequired={onAuthRequired}
                    />
                  </div>
                )
              }

              return null
            })}
          </Masonry>
        )
      })}
    </div>
  )
}
