'use client'

import React from 'react'
import Image from 'next/image'
import { clsx } from 'clsx'
import { StoriesCarousel } from '@/components/stories/stories-carousel'

/** Verdes del strip al 30 % (mismos stops que feed-nav) */
export const FEED_STORIES_STRIP_GRADIENT =
  'linear-gradient(90deg, rgba(115, 255, 162, 0.3) 0%, rgba(94, 123, 103, 0.3) 10%, rgba(94, 123, 103, 0.3) 20%, rgba(94, 123, 103, 0) 90%, rgba(115, 255, 162, 0.3) 100%)'

export interface FeedStoriesStripProps {
  showStoriesStrip: boolean
  stories?: any[]
  feedExplorarActivated: boolean
  onExplorarActivated: () => void
  className?: string
  style?: React.CSSProperties
}

export function FeedStoriesStrip({
  showStoriesStrip,
  stories: propStories,
  feedExplorarActivated,
  onExplorarActivated,
  className,
  style,
}: FeedStoriesStripProps) {
  return (
    <div className={clsx('w-full', className)} style={style}>
      <div
        className={clsx(
          'overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out',
          showStoriesStrip
            ? 'max-h-[220px] translate-y-0 opacity-100'
            : 'pointer-events-none max-h-0 -translate-y-2 opacity-0'
        )}
      >
        <div
          className="flex min-h-[48px] w-full items-center gap-1.5 overflow-hidden rounded-[15px] py-0.5 pl-3 pr-2 shadow-[inset_-24px_0_48px_-20px_rgba(115,255,162,0.08)] sm:min-h-[52px] sm:gap-2 sm:py-1 sm:pl-4 sm:pr-3"
          style={{ background: FEED_STORIES_STRIP_GRADIENT }}
        >
          <div className="flex min-h-0 min-w-0 flex-1 items-center rounded-md py-0">
            <StoriesCarousel
              stories={propStories}
              explorarActivated={feedExplorarActivated}
              showStoriesStrip={showStoriesStrip}
              className="max-h-[96px] w-full min-w-0"
            />
          </div>
          <div className="flex shrink-0 items-center gap-0 pr-0">
            <button
              type="button"
              onClick={onExplorarActivated}
              className="relative z-10 flex h-8 shrink-0 items-center rounded-l-[70px] rounded-r-none border-0 bg-[#2f3439] pl-5 pr-10 text-xl font-medium leading-none text-[#EAEAEA] transition-[background,background-image,color] duration-200 hover:bg-[linear-gradient(90deg,#73FFA2_0%,#405E4A_100%)] hover:text-white sm:h-9 sm:pl-6 sm:pr-14 sm:text-2xl"
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 500,
              }}
            >
              Explorar
            </button>
            <Image
              src="/icons_tanku/onboarding_personaje_tanku.png"
              alt=""
              width={140}
              height={140}
              className="relative z-20 -ml-10 h-[92px] w-auto max-w-none shrink-0 object-contain object-center sm:-ml-11 sm:h-[108px] md:-ml-12 md:h-[120px]"
              unoptimized
            />
          </div>
        </div>
      </div>
    </div>
  )
}
