'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { STALKERGIFT_PATH } from '@/components/stalkergift/stalkergift-paths'

function buildQuery(q: URLSearchParams) {
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** Migra `?tab=*` y filtros legacy a `/stalkergift` o `/stalkergift/gifts` sin `tab`. */
export function StalkerGiftLegacyUrlCleanup() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (!tab) return

    const q = new URLSearchParams(searchParams.toString())
    q.delete('tab')

    const legacyOrders = tab === 'received' || tab === 'sent' || tab === 'orders'
    if (legacyOrders) {
      q.delete('conversation')
      if (tab === 'received') q.set('sgFilter', 'all')
      else if (tab === 'sent') q.set('sgFilter', 'sent')
      else q.set('sgFilter', 'all')
      q.delete('misScope')
      q.delete('recvSub')
      router.replace(`${STALKERGIFT_PATH.gifts}${buildQuery(q)}`, { scroll: false })
      return
    }

    if (tab === 'mis' || tab === 'gifts') {
      router.replace(`${STALKERGIFT_PATH.gifts}${buildQuery(q)}`, { scroll: false })
      return
    }

    if (tab === 'chats' || tab === 'conversations') {
      router.replace(`${STALKERGIFT_PATH.chats}${buildQuery(q)}`, { scroll: false })
      return
    }

    router.replace(`${pathname}${buildQuery(q)}`, { scroll: false })
  }, [pathname, router, searchParams])

  return null
}
