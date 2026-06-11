'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useToast } from '@/lib/contexts/toast-context'
import { useIsMaxWidth } from '@/lib/hooks/use-is-max-width'

const BOTTOM_OFFSET = 'calc(5.25rem + env(safe-area-inset-bottom, 0px) + 10px)'

/** Cristal translúcido — relleno suave + blur marcado (desktop y móvil). */
const GLASS_FILL =
  'bg-white/[0.035] backdrop-blur-xl backdrop-saturate-150'

export function FriendsPublicProfileUrlCard() {
  const { user, isAuthenticated } = useAuthStore()
  const { success: toastSuccess, error: toastError } = useToast()
  const router = useRouter()
  const [origin, setOrigin] = useState('')
  const [peekOpen, setPeekOpen] = useState(false)
  /** Móvil: la cinta se desliza a la derecha; queda pestaña ← */
  const [ribbonSlidOut, setRibbonSlidOut] = useState(false)

  const isBelowLg = useIsMaxWidth(1023)

  useEffect(() => {
    setOrigin(
      (typeof window !== 'undefined' && window.location.origin) || '',
    )
  }, [])

  const slug = user?.username?.trim() || user?.id || ''
  const profilePath = slug ? `/profile/${slug}` : ''

  const fullUrl = origin ? `${origin}${profilePath}` : profilePath

  const collapseRibbon = useCallback(() => {
    setPeekOpen(false)
    setRibbonSlidOut(true)
  }, [])

  const expandRibbon = useCallback(() => {
    setRibbonSlidOut(false)
  }, [])

  const copy = useCallback(async () => {
    if (!fullUrl) return
    try {
      await navigator.clipboard.writeText(fullUrl)
      toastSuccess('Enlace de tu perfil copiado')
      if (isBelowLg) setPeekOpen(false)
    } catch {
      toastError('No se pudo copiar el enlace')
    }
  }, [fullUrl, toastError, toastSuccess, isBelowLg])

  if (!isAuthenticated || !user || !profilePath) return null

  const shellClass = clsx(
    'flex w-full min-w-0 items-stretch overflow-hidden rounded-[25px] border border-white/[0.12]',
    GLASS_FILL,
    'shadow-[0_8px_32px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-2px_12px_rgba(0,0,0,0.15)]',
  )

  const titleBlock = (
    <span className="min-w-0 flex-1">
      <span className="block text-[13px] font-semibold leading-snug text-zinc-100 sm:text-sm">
        Comparte tu perfil{' '}
        <span className="text-[#66DEDB]">TANKU</span>
      </span>
      <span className="mt-1 hidden text-[10px] leading-tight text-zinc-500 sm:text-[11px] lg:block">
        Pulsa para copiar el enlace
      </span>
    </span>
  )

  const cardInner = (
    <>
      <button
        type="button"
        onClick={copy}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3.5 pr-2 text-left transition-colors hover:bg-white/[0.07] active:bg-white/[0.04] lg:py-3"
        aria-label="Copiar enlace público de tu perfil Tanku"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/15 shadow-[inset_0_1px_0_rgba(102,222,219,0.12)] backdrop-blur-md sm:h-11 sm:w-11">
          <UserGroupIcon
            className="h-5 w-5 text-[#66DEDB] drop-shadow-[0_0_10px_rgba(102,222,219,0.35)] sm:h-6 sm:w-6"
            aria-hidden
          />
        </span>
        {titleBlock}
      </button>
      <button
        type="button"
        onClick={() => {
          if (isBelowLg) {
            setPeekOpen(false)
            router.push('/profile')
            return
          }
          collapseRibbon()
        }}
        className="flex shrink-0 items-center justify-center border-l border-white/[0.1] px-3 text-[#66DEDB] transition-colors hover:bg-white/[0.07]"
        aria-label={isBelowLg ? 'Ir a mi perfil' : 'Ocultar'}
        title={isBelowLg ? 'Ir a mi perfil' : 'Ocultar'}
      >
        <ChevronRightIcon
          className="h-5 w-5 drop-shadow-[0_0_8px_rgba(102,222,219,0.35)]"
          aria-hidden
        />
      </button>
    </>
  )

  const fabShell = clsx(
    'pointer-events-auto flex flex-1 min-w-0 items-center justify-center gap-3 rounded-full border border-white/[0.12] px-4 py-2.5 transition-transform active:scale-[0.98]',
    GLASS_FILL,
    'shadow-[0_8px_28px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-2px_10px_rgba(0,0,0,0.14)]',
    'hover:bg-white/[0.05]',
  )

  const ribbonChevronSkin = clsx(
    'pointer-events-auto flex shrink-0 items-center justify-center border border-white/[0.12]',
    GLASS_FILL,
    'transition-colors hover:bg-white/[0.06] active:bg-white/[0.07]',
    'shadow-[0_8px_28px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.09),inset_0_-2px_8px_rgba(0,0,0,0.14)]',
  )

  const hideRibbonBtnClass = clsx(
    ribbonChevronSkin,
    'h-11 w-11 rounded-full',
  )

  /** Igual tonalidad y tamaño que «ocultar»; lado pantalla recto (`rounded-r-none`). */
  const expandRibbonBtnClass = clsx(
    ribbonChevronSkin,
    'box-border h-11 w-11 shrink-0 rounded-l-full rounded-r-none border-y border-l border-white/[0.12] border-r-0 pl-[5px]',
    'motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
  )

  return (
    <>
      {/* ——— Móvil: cinta desliza a la derecha + pestaña para restaurar ——— */}
      {peekOpen && !ribbonSlidOut ? (
        <button
          type="button"
          aria-label="Cerrar"
          className="fixed inset-0 z-[27] bg-black/45 backdrop-blur-[1px] transition-opacity lg:hidden"
          onClick={() => setPeekOpen(false)}
        />
      ) : null}

      <div
        className={clsx(
          'pointer-events-none fixed z-[28] flex flex-row items-end gap-2 left-3 right-0 lg:hidden',
          'motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
          ribbonSlidOut
            ? 'translate-x-[calc(100%+12px)] opacity-0'
            : 'translate-x-0 opacity-100',
        )}
        style={{ bottom: BOTTOM_OFFSET }}
      >
        <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-2 pr-px">
          {peekOpen ? (
            <div
              id="friends-profile-share-panel"
              className={clsx(
                shellClass,
                'pointer-events-auto w-full motion-safe:animate-fade-in',
              )}
            >
              {cardInner}
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 gap-2">
            <button
              type="button"
              onClick={() => setPeekOpen((o) => !o)}
              className={fabShell}
              aria-expanded={peekOpen}
              aria-label={
                peekOpen
                  ? 'Cerrar compartir perfil'
                  : 'Abrir compartir perfil Tanku'
              }
            >
              <UserGroupIcon
                className="h-5 w-5 shrink-0 text-[#66DEDB]"
                aria-hidden
              />
              <span className="truncate text-center text-[12px] font-semibold leading-tight text-zinc-100 sm:text-[13px]">
                Comparte tu perfil{' '}
                <span className="text-[#66DEDB]">TANKU</span>
              </span>
            </button>
            <button
              type="button"
              onClick={collapseRibbon}
              className={hideRibbonBtnClass}
              aria-label="Ocultar hacia la derecha"
              title="Ocultar"
            >
              <ChevronRightIcon
                className="h-5 w-5 text-[#66DEDB]"
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={expandRibbon}
        className={clsx(
          expandRibbonBtnClass,
          'fixed z-[29]',
          ribbonSlidOut
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none translate-x-[110%] opacity-0',
        )}
        style={{ bottom: BOTTOM_OFFSET, right: 0 }}
        aria-hidden={!ribbonSlidOut}
        tabIndex={ribbonSlidOut ? 0 : -1}
        aria-label="Mostrar compartir perfil Tanku"
      >
        <ChevronLeftIcon className="h-5 w-5 text-[#66DEDB]" aria-hidden />
      </button>

      {/* ——— Escritorio ——— */}
      <div
        className={clsx(
          'pointer-events-none fixed right-3 z-[28] hidden w-[min(100%,20.5rem)] sm:right-5 lg:flex lg:flex-col',
          'motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
          ribbonSlidOut
            ? 'translate-x-[calc(100%+12px)] opacity-0'
            : 'translate-x-0 opacity-100',
        )}
        style={{ bottom: BOTTOM_OFFSET }}
      >
        <div className={clsx(shellClass, 'pointer-events-auto w-full')}>
          {cardInner}
        </div>
      </div>
    </>
  )
}
