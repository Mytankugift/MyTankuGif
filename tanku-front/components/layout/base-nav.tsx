/**
 * Componente base de navegación reutilizable
 * Incluye stories (opcional), botones de acción (cart, notifications, messages)
 */

'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { useAuthStore } from '@/lib/stores/auth-store'
import { NavActionIcons } from '@/components/layout/nav-action-icons'
import { StoriesCarousel } from '@/components/stories/stories-carousel'

interface BaseNavProps {
  /** Si se muestra la sección de stories */
  showStories?: boolean
  /** Si el nav se puede esconder (solo para feed) */
  canHide?: boolean
  /** Si el nav está visible (para control de esconderse) */
  isVisible?: boolean
  /** Si se muestra el botón "Únete a Tanku" (solo para feed) */
  showJoinButton?: boolean
  /** Contenido adicional opcional (ej: buscador) */
  additionalContent?: React.ReactNode
  /** Título a la izquierda del nav (ej. página de eventos) */
  pageTitle?: string
  /** Título enriquecido (permite estilos por palabra e icono). Tiene prioridad sobre `pageTitle`. */
  pageTitleRich?: React.ReactNode
  /** Subtítulo bajo el título (opcional) */
  pageSubtitle?: string
  /** Si es true, el subtítulo solo se muestra en móvil (&lt; md), no en escritorio */
  pageSubtitleMobileOnly?: boolean
  /** Color del título (por defecto el verde Tanku de eventos) */
  pageTitleColor?: string
  /** Contenido a la izquierda del título (ej. botón volver) */
  startContent?: React.ReactNode
  /** Clase adicional para el contenedor */
  className?: string
  /** Historias personalizadas para pasar al StoriesCarousel */
  customStories?: import('@/lib/hooks/use-stories').StoryDTO[]
  /** Móvil (< md): nav translúcido con blur; desde md fondo opaco como siempre */
  mobileTranslucentNav?: boolean
  /** Móvil: botón volver + título centrado blanco + solo carrito */
  mobileBackCenterTitleCartOnly?: boolean
  /** Desktop (md+): título de página centrado en blanco (ej. `/notifications`). Requiere `pageTitle`. */
  desktopNavTitleCentered?: boolean
  /** En &lt; md oculta título/subtítulo y deja solo iconos (ej. `/messages` con cabecera en el panel). */
  hidePageHeadingMobile?: boolean
}

export function BaseNav({
  showStories = false,
  canHide = false,
  isVisible = true,
  showJoinButton = false,
  additionalContent,
  pageTitle,
  pageTitleRich,
  pageSubtitle,
  pageSubtitleMobileOnly = false,
  pageTitleColor = '#73FFA2',
  startContent,
  className = '',
  customStories,
  mobileTranslucentNav = false,
  mobileBackCenterTitleCartOnly = false,
  desktopNavTitleCentered = false,
  hidePageHeadingMobile = false,
}: BaseNavProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const titleContent = pageTitleRich ?? pageTitle
  const showPageHeading = Boolean(titleContent || pageSubtitle)

  const renderPageHeading = () =>
    showPageHeading ? (
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-2">
        {titleContent ? (
          <h1
            className="min-w-0 truncate text-lg font-bold sm:text-xl md:text-2xl"
            style={{ color: pageTitleRich ? undefined : pageTitleColor, fontFamily: 'Poppins, sans-serif' }}
          >
            {titleContent}
          </h1>
        ) : null}
        {pageSubtitle ? (
          <p
            className={clsx(
              'line-clamp-2 max-w-xl text-[10px] leading-snug text-gray-400 sm:text-xs md:text-sm',
              pageSubtitleMobileOnly && 'md:hidden',
            )}
          >
            {pageSubtitle}
          </p>
        ) : null}
      </div>
    ) : null

  const renderActionIcons = () => <NavActionIcons showJoinButton={showJoinButton} />

  const navSurfaceClass = mobileTranslucentNav
    ? 'max-md:inset-x-0 max-md:border-b max-md:border-white/[0.07] max-md:bg-[rgba(25,30,35,0.62)] max-md:backdrop-blur-xl max-md:backdrop-saturate-150 max-md:shadow-[0_8px_32px_rgba(0,0,0,0.35)] max-md:[-webkit-backdrop-filter:blur(20px)_saturate(1.1)] md:right-4 md:border-0 md:bg-[var(--color-surface-191e23-20)] md:shadow-lg md:backdrop-blur-none md:backdrop-saturate-100 md:[-webkit-backdrop-filter:none]'
    : 'shadow-lg'

  return (
    <div
      className={`fixed top-0 left-0 md:left-36 lg:left-[208px] z-50 flex-shrink-0 transition-all duration-150 ease-in-out ${
        canHide && !isVisible ? '-translate-y-full' : 'translate-y-0'
      } ${navSurfaceClass} ${className}`}
      style={{
        transform: canHide && !isVisible ? 'translateY(-100%)' : 'translateY(0)',
        willChange: 'transform',
        ...(mobileTranslucentNav
          ? {}
          : { right: '16px', backgroundColor: 'var(--color-surface-191e23-20)' }),
      }}
    >
      {/* Stories Section - Solo si showStories es true */}
      {showStories && (
        <>
          {showPageHeading ? (
            <div className="flex items-start justify-between gap-2 border-b border-gray-800/50 px-2 pb-2 pt-2 sm:px-3 sm:pt-3 md:px-4 md:pt-4">
              {renderPageHeading()}
              {renderActionIcons()}
            </div>
          ) : null}
          <div
            className={`px-2 sm:px-3 md:px-4 pb-0 flex flex-col md:flex-row justify-between items-center w-full gap-0.5 sm:gap-1 md:gap-1 ${
              showPageHeading ? 'pt-2' : 'pt-2 sm:pt-3 md:pt-4'
            }`}
          >
            <div className={`flex-1 min-w-0 flex items-center ${isAuthenticated ? 'justify-start' : 'justify-center'}`}>
              {isAuthenticated ? (
                <StoriesCarousel stories={customStories} />
              ) : (
                <div
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 'bold',
                    fontSize: '26px',
                    lineHeight: '80px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    width: '623px',
                    height: '34px',
                    background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'transparent',
                  }}
                >
                  Don't Give a Like, Give a TANKU
                </div>
              )}
            </div>

            {!showPageHeading ? (
              <div className="hidden md:flex gap-2 lg:gap-3 flex-shrink-0 items-center self-center">
                {renderActionIcons()}
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* Si no hay stories, mostrar solo los botones (y título de página opcional a la izquierda) */}
      {!showStories && (
        <>
          {mobileBackCenterTitleCartOnly ? (
            <div className="flex items-center justify-between px-3 py-2 md:hidden">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                aria-label="Volver"
              >
                <Image
                  src="/icons_tanku/mobile_tanku_menu_ir_atras_Universal.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                  unoptimized
                />
              </button>
              <h1
                className="absolute left-1/2 -translate-x-1/2 text-base font-semibold text-white"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {titleContent || 'Mi perfil'}
              </h1>
              <Link href="/cart" className="flex h-9 w-9 items-center justify-center" aria-label="Ir al carrito">
                <Image
                  src="/icons_tanku/tanku_nav_carrito_verde.svg"
                  alt=""
                  width={30}
                  height={30}
                  className="h-[30px] w-[30px] object-contain"
                  unoptimized
                />
              </Link>
            </div>
          ) : null}
          <div
            className={`gap-2 p-2 pb-2 sm:p-3 md:p-4 md:pb-2 lg:gap-3 ${
              mobileBackCenterTitleCartOnly ? 'hidden md:flex' : 'flex'
            } ${
              desktopNavTitleCentered && showPageHeading && titleContent
                ? 'relative min-h-[52px] items-center justify-between'
                : showPageHeading
                  ? `min-w-0 items-start justify-between${hidePageHeadingMobile ? ' max-md:justify-end' : ''}`
                  : 'items-center justify-end'
            }`}
          >
            {showPageHeading && desktopNavTitleCentered && titleContent ? (
              <>
                <div className="flex w-10 shrink-0 items-center justify-start sm:w-11">
                  {startContent ?? <span className="inline-block w-10 sm:w-11" aria-hidden />}
                </div>
                <h1
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-[min(56vw,22rem)] -translate-x-1/2 -translate-y-1/2 truncate text-center text-lg font-semibold text-white sm:text-xl md:text-2xl"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {titleContent}
                </h1>
                <div className="flex shrink-0 items-center">{renderActionIcons()}</div>
              </>
            ) : showPageHeading ? (
              <div
                className={`flex min-w-0 flex-1 items-start gap-2 sm:gap-3${hidePageHeadingMobile ? ' max-md:hidden' : ''}`}
              >
                {startContent ? (
                  <div className="flex shrink-0 flex-col justify-start pt-0.5">{startContent}</div>
                ) : null}
                {renderPageHeading()}
              </div>
            ) : null}
            {!desktopNavTitleCentered || !showPageHeading ? renderActionIcons() : null}
          </div>
        </>
      )}

      {/* Contenido adicional (ej: buscador) */}
      {additionalContent && <div className="px-2 sm:px-3 md:px-4 pb-2">{additionalContent}</div>}
    </div>
  )
}
