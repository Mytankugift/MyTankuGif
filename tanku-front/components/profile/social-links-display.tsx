'use client'

import Link from 'next/link'

type SocialLink = {
  platform: string
  url: string
}

const PLATFORM_INFO: Record<string, { name: string; icon: string; color: string }> = {
  facebook: { name: 'Facebook', icon: 'f', color: 'bg-blue-600' },
  instagram: { name: 'Instagram', icon: 'ig', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  twitter: { name: 'Twitter', icon: '🐦', color: 'bg-blue-400' },
  youtube: { name: 'YouTube', icon: '▶', color: 'bg-red-600' },
  tiktok: { name: 'TikTok', icon: '♪', color: 'bg-black' },
  linkedin: { name: 'LinkedIn', icon: 'in', color: 'bg-blue-700' },
}

interface SocialLinksDisplayProps {
  socialLinks?: SocialLink[]
}

export function SocialLinksDisplay({ socialLinks = [] }: SocialLinksDisplayProps) {
  if (!socialLinks || socialLinks.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {socialLinks.map((link) => {
        const platformInfo = PLATFORM_INFO[link.platform]
        if (!platformInfo) return null

        return (
          <Link
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-800/50 hover:bg-gray-800 transition-colors group"
            title={platformInfo.name}
          >
            <div className={`w-5 h-5 rounded-full ${platformInfo.color} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-[10px] font-bold">{platformInfo.icon}</span>
            </div>
            <span className="text-xs text-gray-300 group-hover:text-white transition-colors hidden sm:inline">
              {platformInfo.name}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

