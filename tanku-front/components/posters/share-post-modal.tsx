'use client'

import { ShareWithFriendsModal } from '@/components/shared/share-with-friends-modal'

interface SharePostModalProps {
  isOpen: boolean
  postUrl: string
  postDescription?: string | null
  onClose: () => void
}

export function SharePostModal({ isOpen, postUrl, postDescription, onClose }: SharePostModalProps) {
  return (
    <ShareWithFriendsModal
      isOpen={isOpen}
      onClose={onClose}
      title="Compartir publicación"
      shareUrl={postUrl}
      getShareMessage={() =>
        `Mira esta publicación:\n${postUrl}${postDescription ? `\n\n${postDescription}` : ''}`
      }
    />
  )
}
