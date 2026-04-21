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
      {/* Sentinel siempre montado si hay más páginas (el IO no pierde el target al cargar) */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="pointer-events-none h-8 w-full shrink-0"
          aria-hidden
        />
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

