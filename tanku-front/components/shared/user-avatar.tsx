'use client'

import { useState } from 'react'
import Image from 'next/image'

interface UserAvatarProps {
  user: {
    avatar?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string
    username?: string | null
  } | null
  size?: number
  className?: string
}

export function UserAvatar({ user, size = 40, className = '' }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)

  if (user?.avatar && !imgError) {
    return (
      <Image
        src={user.avatar}
        alt={user.firstName || user.email || 'User'}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          maxWidth: `${size}px`,
          maxHeight: `${size}px`,
        }}
        unoptimized={user.avatar.startsWith('http')}
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
      />
    )
  }

  const initial = user?.firstName?.[0] || user?.email?.[0] || 'U'

  return (
    <div
      className={`rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ 
        width: size, 
        height: size,
        minWidth: size,
        minHeight: size,
        maxWidth: size,
        maxHeight: size,
      }}
    >
      <span className="text-gray-400 font-bold" style={{ fontSize: `${size * 0.4}px` }}>
        {initial.toUpperCase()}
      </span>
    </div>
  )
}

