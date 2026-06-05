'use client'

import { ShareWithFriendsModal } from '@/components/shared/share-with-friends-modal'

interface ShareProductModalProps {
  isOpen: boolean
  productUrl: string
  productTitle?: string | null
  onClose: () => void
}

export function ShareProductModal({ isOpen, productUrl, productTitle, onClose }: ShareProductModalProps) {
  return (
    <ShareWithFriendsModal
      isOpen={isOpen}
      onClose={onClose}
      title="Compartir producto"
      shareUrl={productUrl}
      getShareMessage={() =>
        `Mira este producto:\n${productUrl}${productTitle ? `\n\n${productTitle}` : ''}`
      }
    />
  )
}
