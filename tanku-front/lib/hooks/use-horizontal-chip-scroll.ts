'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const SCROLL_EDGE_EPS = 2
const CHIP_SCROLL_PADDING = 8

export function useHorizontalChipScroll(
  selectedChipId: string | null,
  chipCount: number,
) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const refreshScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      setHasOverflow(false)
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    const { scrollLeft, scrollWidth, clientWidth } = el
    const overflow = scrollWidth > clientWidth + SCROLL_EDGE_EPS
    setHasOverflow(overflow)
    setCanScrollLeft(overflow && scrollLeft > SCROLL_EDGE_EPS)
    setCanScrollRight(overflow && scrollLeft + clientWidth < scrollWidth - SCROLL_EDGE_EPS)
  }, [])

  const scrollChipFullyVisible = useCallback((chipId: string) => {
    const container = scrollRef.current
    if (!container) return
    const chip = container.querySelector(
      `[data-category-chip-id="${chipId}"]`,
    ) as HTMLElement | null
    if (!chip) return

    const edgePad = container.clientWidth >= 768 ? 40 : CHIP_SCROLL_PADDING
    const containerRect = container.getBoundingClientRect()
    const chipRect = chip.getBoundingClientRect()

    const fullyVisible =
      chipRect.left >= containerRect.left + edgePad - 1 &&
      chipRect.right <= containerRect.right - edgePad + 1

    if (fullyVisible) return

    if (chipRect.left < containerRect.left + edgePad) {
      container.scrollTo({
        left: container.scrollLeft + (chipRect.left - containerRect.left) - edgePad,
        behavior: 'smooth',
      })
      return
    }
    if (chipRect.right > containerRect.right - edgePad) {
      container.scrollTo({
        left: container.scrollLeft + (chipRect.right - containerRect.right) + edgePad,
        behavior: 'smooth',
      })
    }
  }, [])

  const scrollByPage = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    const delta = Math.max(300, Math.round(el.clientWidth * 0.88)) * direction
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }, [])

  useLayoutEffect(() => {
    refreshScrollState()
    if (!selectedChipId) return
    requestAnimationFrame(() => {
      scrollChipFullyVisible(selectedChipId)
      requestAnimationFrame(refreshScrollState)
    })
  }, [selectedChipId, chipCount, refreshScrollState, scrollChipFullyVisible])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => refreshScrollState()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(() => refreshScrollState())
    ro.observe(el)
    window.addEventListener('resize', refreshScrollState)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
      window.removeEventListener('resize', refreshScrollState)
    }
  }, [refreshScrollState, chipCount])

  return {
    scrollRef,
    hasOverflow,
    canScrollLeft,
    canScrollRight,
    scrollByPage,
    scrollChipFullyVisible,
    refreshScrollState,
  }
}
