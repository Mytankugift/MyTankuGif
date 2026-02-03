'use client'

import { useRef, useEffect } from 'react'
import Masonry from 'react-masonry-css'
import { ProductCard } from './product-card'
import { PosterCard } from './poster-card'
import type { FeedItem } from '@/lib/types/feed.types'

interface FeedGridProps {
  items: FeedItem[]
  onPosterClick?: (poster: FeedItem) => void
}

export function FeedGrid({ items, onPosterClick }: FeedGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Configuración de breakpoints para masonry
  // Máximo 4 columnas en pantallas grandes
  const breakpointColumnsObj = {
    default: 4,  // 4 columnas en pantallas grandes (>= 1280px)
    1024: 3,     // 3 columnas en tablets (>= 1024px)
    768: 2,      // 2 columnas en tablets pequeñas (>= 768px)
    640: 2,      // 2 columnas en móviles (>= 640px)
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className="w-full max-w-7xl mx-auto" ref={containerRef}>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {items.map((item, index) => {
          // ✅ Determinar si el item está "above the fold" (primeras 4-6 imágenes)
          const isAboveFold = index < 6; // Primeras 6 imágenes cargan eager
          
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
