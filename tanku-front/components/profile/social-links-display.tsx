'use client'

import Link from 'next/link'
import Image from 'next/image'

type SocialLink = {
  platform: string
  url: string
}

export type SocialPlatformMeta = {
  name: string
  iconPath: string
  width?: number
  height?: number
}

/** Metadatos e iconos Tanku para cada plataforma (perfil + ajustes) */
export const SOCIAL_PLATFORM_META: Record<string, SocialPlatformMeta> = {
  facebook: { name: 'Facebook', iconPath: '/icons_tanku/tanku_perfil_logo_facebook.svg' },
  instagram: { name: 'Instagram', iconPath: '/icons_tanku/tanku_perfil_logo_instagram.svg' },
  twitter: { name: 'Twitter', iconPath: '/icons_tanku/tanku_perfil_logo_twiter.svg' },
  x: { name: 'X', iconPath: '/icons_tanku/tanku_perfil_logo_twiter.svg' },
  youtube: {
    name: 'YouTube',
    iconPath: '/icons_tanku/tanku_perfil_logo_youtube.svg',
    width: 36,
    height: 25,
  },
  tiktok: { name: 'TikTok', iconPath: '/icons_tanku/tanku_perfil_logo_tiktok.svg' },
  linkedin: { name: 'LinkedIn', iconPath: '/icons_tanku/tanku_perfil_logo_linkedin.svg' },
}

/** Orden en selector de ajustes (sin X duplicado; usar twitter) */
export const SETTINGS_SOCIAL_PLATFORM_IDS = [
  'facebook',
  'instagram',
  'twitter',
  'youtube',
  'tiktok',
  'linkedin',
] as const

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
        const platformInfo = SOCIAL_PLATFORM_META[link.platform.toLowerCase()]
        if (!platformInfo) return null

        const w = platformInfo.width ?? 25
        const h = platformInfo.height ?? 25

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
              width={w}
              height={h}
              className={`object-contain ${platformInfo.width ? 'h-[25px] w-auto max-w-[40px]' : 'h-[25px] w-[25px]'}`}
              unoptimized
            />
          </Link>
        )
      })}
    </div>
  )
}
