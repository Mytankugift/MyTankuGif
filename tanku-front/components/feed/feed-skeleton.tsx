'use client'

export function FeedSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-2xl overflow-hidden animate-pulse"
            style={{ aspectRatio: '3/4' }}
          >
            {/* Skeleton para imagen */}
            <div className="w-full h-3/4 bg-gray-700" />
            
            {/* Skeleton para contenido */}
            <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
              <div className="h-3 sm:h-4 bg-gray-700 rounded w-3/4" />
              <div className="h-3 sm:h-4 bg-gray-700 rounded w-1/2" />
              <div className="flex items-center justify-between mt-1 sm:mt-2">
                <div className="h-4 sm:h-6 bg-gray-700 rounded w-12 sm:w-20" />
                <div className="h-4 sm:h-6 bg-gray-700 rounded w-10 sm:w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

