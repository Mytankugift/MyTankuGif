'use client'

import { useRef, useMemo } from 'react'
import Masonry from 'react-masonry-css'
import { ProductCard } from './product-card'
import { PromotionalBanner } from './promotional-banner'
import type { FeedItem } from '@/lib/types/feed.types'

interface LandingGridProps {
  items: FeedItem[]
}

export function LandingGrid({ items }: LandingGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Configuración de breakpoints para masonry (memoizada)
  const breakpointColumnsObj = useMemo(() => ({
    default: 4,  // 4 columnas por defecto (pantallas >= 1400px)
    1400: 4,     // 4 columnas (>= 1400px)
    1200: 3,     // 3 columnas (>= 1200px)
    1024: 3,     // 3 columnas (>= 1024px)
    768: 2,      // 2 columnas (>= 768px)
    640: 2,      // 2 columnas (>= 640px)
  }), [])

  // Memoizar la lógica de secciones para evitar recálculos innecesarios
  const sections = useMemo(() => {
    if (items.length === 0) {
      return []
    }

    // Filtrar solo productos (no posts)
    const productsOnly = items.filter(item => item.type === 'product')

    // Dividir productos: primer banner a los 48, segundo a los 52 siguientes (total 100)
    let productCount = 0
    const sections: Array<{ items: FeedItem[]; showBanner?: boolean; bannerVariant?: 1 | 2 }> = []
    let currentSection: FeedItem[] = []
    
    productsOnly.forEach((item) => {
      productCount++
      currentSection.push(item)
      
      // Primer banner después de 48 productos
      if (productCount === 48) {
        sections.push({ items: [...currentSection] })
        sections.push({ 
          items: [], 
          showBanner: true, 
          bannerVariant: 1 
        })
        currentSection = []
      }
      // Segundo banner después de 100 productos (48 + 52)
      else if (productCount === 100) {
        sections.push({ items: [...currentSection] })
        sections.push({ 
          items: [], 
          showBanner: true, 
          bannerVariant: 2 
        })
        currentSection = []
      }
    })
    
    // Agregar la última sección si tiene items
    if (currentSection.length > 0) {
      sections.push({ items: currentSection })
    }

    return sections
  }, [items])

  if (sections.length === 0) {
    return null
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
                      isLanding={true}
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

