'use client'

import Link from 'next/link'
import Image from 'next/image'

type SocialLink = {
  platform: string
  url: string
}

const PLATFORM_INFO: Record<string, { name: string; iconPath: string }> = {
  facebook: { name: 'Facebook', iconPath: '/icons_tanku/tanku_perfil_logo_facebook.svg' },
  instagram: { name: 'Instagram', iconPath: '/icons_tanku/tanku_perfil_logo_instagram.svg' },
  twitter: { name: 'Twitter', iconPath: '/icons_tanku/tanku_perfil_logo_twiter.svg' },
  x: { name: 'X', iconPath: '/icons_tanku/tanku_perfil_logo_twiter.svg' },
}

interface SocialLinksDisplayProps {
  socialLinks?: SocialLink[]
}

export function SocialLinksDisplay({ socialLinks = [] }: SocialLinksDisplayProps) {
  if (!socialLinks || socialLinks.length === 0) {
    return null
  }

  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
      {socialLinks.map((link) => {
        const platformInfo = PLATFORM_INFO[link.platform.toLowerCase()]
        if (!platformInfo) return null

        return (
          <Link
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center p-0.5 rounded-md hover:opacity-85 transition-opacity shrink-0"
            title={platformInfo.name}
          >
            <Image
              src={platformInfo.iconPath}
              alt={platformInfo.name}
              width={25}
              height={25}
              className="h-[25px] w-[25px] object-contain"
              unoptimized
            />
          </Link>
        )
      })}
    </div>
  )
}

