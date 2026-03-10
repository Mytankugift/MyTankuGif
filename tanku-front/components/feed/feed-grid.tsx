'use client'

import { useRef, useEffect } from 'react'
import Masonry from 'react-masonry-css'
import { ProductCard } from './product-card'
import { PosterCard } from './poster-card'
import { PromotionalBanner } from './promotional-banner'
import type { FeedItem } from '@/lib/types/feed.types'

interface FeedGridProps {
  items: FeedItem[]
  onPosterClick?: (poster: FeedItem) => void
  isAuthenticated?: boolean
}

export function FeedGrid({ items, onPosterClick, isAuthenticated = true }: FeedGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Configuración de breakpoints para masonry
  // react-masonry-css usa estos breakpoints como "min-width"
  // Máximo 4 columnas en pantallas grandes
  const breakpointColumnsObj = {
    default: 4,  // 4 columnas por defecto (pantallas >= 1400px)
    1400: 4,     // 4 columnas (>= 1400px)
    1200: 3,     // 3 columnas (>= 1200px)
    1024: 3,     // 3 columnas (>= 1024px)
    768: 2,      // 2 columnas (>= 768px)
    640: 2,      // 2 columnas (>= 640px)
  }

  if (items.length === 0) {
    return null
  }

  // Si no está autenticado, dividir productos en grupos de 15 y agregar banners DESPUÉS de cada grupo
  if (!isAuthenticated) {
    const PRODUCTS_PER_BANNER = 15
    let productCount = 0
    const sections: Array<{ items: FeedItem[]; showBanner?: boolean; bannerVariant?: 1 | 2 }> = []
    let currentSection: FeedItem[] = []
    
    items.forEach((item) => {
      if (item.type === 'product') {
        productCount++
        currentSection.push(item)
        
        // Cada 15 productos, finalizar sección, agregar banner DESPUÉS, y crear nueva sección
        if (productCount % PRODUCTS_PER_BANNER === 0) {
          // Primero agregar la sección de productos
          sections.push({ items: [...currentSection] })
          // Luego agregar el banner DESPUÉS de esos productos
          const bannerNumber = productCount / PRODUCTS_PER_BANNER
          sections.push({ 
            items: [], 
            showBanner: true, 
            bannerVariant: (bannerNumber % 2 === 1 ? 1 : 2) as 1 | 2 
          })
          currentSection = []
        }
      } else {
        // Posters y otros items van a la sección actual
        currentSection.push(item)
      }
    })
    
    // Agregar la última sección si tiene items (sin banner después porque no llegó a 15)
    if (currentSection.length > 0) {
      sections.push({ items: currentSection })
    }

    // Renderizar secciones con banners
    let globalItemIndex = 0
    return (
      <div className="w-full" ref={containerRef} style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {sections.map((section, sectionIndex) => {
          if (section.showBanner && section.bannerVariant) {
            // Renderizar banner
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
          
          // Renderizar productos de esta sección
          if (section.items.length === 0) return null
          
          return (
            <Masonry
              key={`section-${sectionIndex}`}
              breakpointCols={breakpointColumnsObj}
              className="masonry-grid"
              columnClassName="masonry-grid_column"
            >
              {section.items.map((item, itemIndex) => {
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
                        isLightMode={false}
                        isAboveFold={isAboveFold}
                      />
                    </div>
                  )
                } else if (item.type === 'poster') {
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
                          likesCount: item.likesCount || 0,
                          commentsCount: item.commentsCount || 0,
                          createdAt: item.createdAt,
                          isLiked: item.isLiked,
                          author: item.author,
                        }}
                        onOpenModal={onPosterClick}
                        isLightMode={false}
                        isAboveFold={isAboveFold}
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

  // Si está autenticado, renderizar normalmente sin banners
  return (
    <div className="w-full" ref={containerRef} style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {items.map((item, index) => {
          const isAboveFold = index < 6
          
          if (item.type === 'product' && item.title) {
            return (
              <div 
                key={`product-${item.id}-${index}`} 
                data-item-id={`product-${item.id}-${index}`}
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
                  isLightMode={false}
                  isAboveFold={isAboveFold}
                />
              </div>
            )
          } else if (item.type === 'poster') {
            return (
              <div 
                key={`poster-${item.id}-${index}`} 
                data-item-id={`poster-${item.id}-${index}`}
                className="mb-4"
              >
                <PosterCard
                  poster={{
                    id: item.id,
                    type: 'poster',
                    imageUrl: item.imageUrl,
                    videoUrl: item.videoUrl,
                    description: item.description,
                    likesCount: item.likesCount || 0,
                    commentsCount: item.commentsCount || 0,
                    createdAt: item.createdAt,
                    isLiked: item.isLiked,
                    author: item.author,
                  }}
                  onOpenModal={onPosterClick}
                  isLightMode={false}
                  isAboveFold={isAboveFold}
                />
              </div>
            )
          }
          return null
        })}
      </Masonry>
    </div>
  )
}
