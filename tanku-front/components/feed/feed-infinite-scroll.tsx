'use client'

interface FeedInfiniteScrollProps {
  hasMore: boolean
  isLoadingMore: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
}

export function FeedInfiniteScroll({
  hasMore,
  isLoadingMore,
  sentinelRef,
}: FeedInfiniteScrollProps) {
  return (
    <>
      {hasMore && !isLoadingMore && (
        <div
          ref={sentinelRef}
          className="h-20 w-full my-8 flex items-center justify-center"
          style={{
            visibility: 'visible',
            opacity: 0.01,
            pointerEvents: 'none',
            position: 'relative',
            zIndex: 10,
            minHeight: '80px',
          }}
        >
          <div className="text-white text-xs opacity-0">Cargando más...</div>
        </div>
      )}

      {isLoadingMore && (
        <div className="flex justify-center items-center py-8">
          <div className="text-white">Cargando más...</div>
        </div>
      )}

      {!hasMore && (
        <div className="flex justify-center items-center py-8">
          <div className="text-white text-sm opacity-70">No hay más contenido</div>
        </div>
      )}
    </>
  )
}

