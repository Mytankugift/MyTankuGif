'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { MisStalkerGiftTab } from '@/components/stalkergift/mis-stalkergift-tab'
import { useStalkerGiftMisRefreshKey } from '@/components/stalkergift/stalkergift-mis-refresh-context'

function MisStalkerGiftContent() {
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  const misRefreshKey = useStalkerGiftMisRefreshKey()

  const orderIdQuery = searchParams.get('orderId')

  if (!user?.id) return null

  return (
    <MisStalkerGiftTab
      key={misRefreshKey}
      userId={user.id}
      initialOrderId={orderIdQuery}
    />
  )
}

export default function StalkerGiftGiftsPage() {
  return (
    <div
      id="stalkergift-scroll-root"
      className="custom-scrollbar relative z-0 min-h-0 w-full flex-1 basis-0 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch] md:pb-5 lg:px-8 xl:px-10"
      style={{
        marginRight: 0,
        scrollBehavior: 'smooth',
        scrollPaddingTop: 'max(env(safe-area-inset-top),12px)',
        scrollPaddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="w-full pb-6">
        <Suspense fallback={<div className="py-8 text-center text-gray-400">Cargando...</div>}>
          <MisStalkerGiftContent />
        </Suspense>
      </div>
    </div>
  )
}
