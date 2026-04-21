'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { GiftIcon, XMarkIcon } from '@heroicons/react/24/outline'

const ICON_NUEVO_POST = '/icons_tanku/tanku_logo_menu_nuevo_post_verde.svg'
const ICON_WISHLIST = '/icons_tanku/tanku_megusta_lineas_azul.svg'
const ICON_AMIGOS = '/icons_tanku/tanku_logo_menu_Amigos_azul.svg'
const ICON_STALKERGIFT = '/icons_tanku/tanku_logo_menu_stalkergift_verde.svg'
const ICON_ATRAS = '/icons_tanku/mobile_tanku_menu_ir_atras_Universal.svg'
const AVATAR_RANKU = '/icons_tanku/mobile_ranku_menu_personaje.svg'

/** Hex con puntas más marcadas arriba/abajo */
const CLIP_HEX =
  'polygon(50% 0%, 92% 20%, 92% 80%, 50% 100%, 8% 80%, 8% 20%)'

/** Mismo fondo oscuro que `EventsModal` (Próximos eventos) */
const HEX_INNER_FILL = '#262626'

/** Solo trazo (opacidad moderada); relleno HEX_INNER_FILL aparte */
const STROKE_GRADIENT =
  'linear-gradient(180deg, rgba(115,255,162,0.55) 0%, rgba(26,26,26,0.5) 52%, rgba(0,0,0,0.42) 100%)'

/** Anillo ~7px sobre ~430px de ancho típico */
const INNER_SCALE = 0.967

type MenuItemProps = {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function MenuRow({ icon, label, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-2 rounded-xl py-1 pl-7 pr-5 text-left transition-colors hover:bg-white/5 active:bg-white/10"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center sm:h-8 sm:w-8">{icon}</span>
      <span
        className="min-w-0 flex-1 text-[10px] font-semibold leading-snug text-white"
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
        {label}
      </span>
    </button>
  )
}

type HexPanelShellProps = {
  children: React.ReactNode
  className?: string
  showAvatar?: boolean
  avatarClassName?: string
}

function HexPanelShell({
  children,
  className = '',
  showAvatar = true,
  avatarClassName = 'z-20',
}: HexPanelShellProps) {
  return (
    <div className={`relative w-full px-1 pb-6 pt-2 ${className}`}>
      {showAvatar ? (
        <div
          className={`pointer-events-none absolute left-1/2 flex flex-col items-center ${avatarClassName}`}
          style={{
            top: 0,
            transform: 'translateX(-50%) translateY(calc(-49% - 14px))',
          }}
        >
          <div
            className="relative flex h-[146px] w-[146px] items-start justify-center overflow-visible rounded-full pt-1"
            style={{
              background: 'radial-gradient(circle at 50% 72%, rgba(115,255,162,0.55) 0%, #73FFA2 46%, #73FFA2 100%)',
              boxShadow: '0 0 28px rgba(115, 255, 162, 0.5)',
            }}
          >
            <Image
              src={AVATAR_RANKU}
              alt=""
              width={200}
              height={200}
              className="relative z-[1] mt-3 h-[168px] w-auto max-w-none object-contain object-bottom drop-shadow-lg"
              unoptimized
            />
          </div>
        </div>
      ) : null}

      <div
          className="relative z-[1] grid min-h-[368px] w-full place-items-center"
        style={{
          clipPath: CLIP_HEX,
          background: STROKE_GRADIENT,
          boxShadow: '0 0 20px rgba(115, 255, 162, 0.2), 0 0 40px rgba(115, 255, 162, 0.08)',
        }}
      >
        <div
          className="relative flex h-full min-h-[340px] w-full flex-col px-8 pb-8 pt-[4.1rem] sm:px-9"
          style={{
            clipPath: CLIP_HEX,
            backgroundColor: HEX_INNER_FILL,
            transform: `scale(${INNER_SCALE})`,
            transformOrigin: 'center center',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export interface MobileCenterActionMenuProps {
  isOpen: boolean
  onClose: () => void
  onNuevoPost: () => void
  /** Mismo modal que el menú circular de escritorio */
  onOpenEvents: () => void
}

export function MobileCenterActionMenu({
  isOpen,
  onClose,
  onNuevoPost,
  onOpenEvents,
}: MobileCenterActionMenuProps) {
  const router = useRouter()
  const [servicesSheetOpen, setServicesSheetOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) setServicesSheetOpen(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (servicesSheetOpen) {
        setServicesSheetOpen(false)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isOpen, onClose, servicesSheetOpen])

  const navigate = (path: string) => {
    onClose()
    router.push(path)
  }

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-[1000000] bg-black/55 backdrop-blur-[2px]"
          onClick={onClose}
        />
      ) : null}

      <div
        className={`pointer-events-none fixed left-1/2 z-[1000001] flex w-[375px] max-w-[calc(100vw-10px)] -translate-x-1/2 justify-center transition-all duration-300 ease-out md:hidden ${
          isOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-[calc(100%+24px)] opacity-0'
        }`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 52px)',
        }}
        aria-hidden={!isOpen}
      >
        <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
          <HexPanelShell avatarClassName="z-[70]" className={servicesSheetOpen ? 'opacity-100' : ''}>
            <h2
              id="mobile-center-menu-title"
              className="mb-2 px-3 text-center text-[12px] font-bold leading-tight text-white"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              ¿Qué quieres hacer hoy?
            </h2>

            <nav className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 [-webkit-overflow-scrolling:touch]">
              <MenuRow
                icon={
                  <Image
                    src={ICON_WISHLIST}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                    unoptimized
                  />
                }
                label="Wishlist"
                onClick={() => navigate('/wishlist')}
              />
              <MenuRow
                icon={
                  <Image
                    src={ICON_AMIGOS}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                    unoptimized
                  />
                }
                label="Agregar Amigos"
                onClick={() => navigate('/friends')}
              />
              <MenuRow
                icon={
                  <Image
                    src={ICON_NUEVO_POST}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                    unoptimized
                  />
                }
                label="Nuevo Post"
                onClick={() => {
                  onClose()
                  onNuevoPost()
                }}
              />
              <MenuRow
                icon={
                  <Image
                    src={ICON_NUEVO_POST}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                    unoptimized
                  />
                }
                label="Eventos"
                onClick={() => {
                  onClose()
                  onOpenEvents()
                }}
              />
              <MenuRow
                icon={<GiftIcon className="h-7 w-7 stroke-[1.75] text-[#66DEDB]" />}
                label="Servicios"
                onClick={() => setServicesSheetOpen(true)}
              />
            </nav>

            <div className="mt-auto flex w-full shrink-0 justify-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Cerrar menú"
              >
                <XMarkIcon className="h-5 w-5 text-[#66DEDB]" strokeWidth={2} />
              </button>
            </div>
          </HexPanelShell>

          <div
            className={`absolute inset-0 z-30 transition-all duration-300 ease-out ${
              servicesSheetOpen
                ? 'pointer-events-auto translate-y-0 opacity-100'
                : 'pointer-events-none translate-y-[18%] opacity-0'
            }`}
          >
            <HexPanelShell showAvatar={false}>
              <h2
                id="mobile-center-menu-title-services"
                className="mb-2 px-3 text-center text-[12px] font-bold leading-tight text-white"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Servicios
              </h2>

              <nav className="flex w-full min-w-0 flex-col gap-1 px-1">
                <MenuRow
                  icon={
                    <Image
                      src={ICON_STALKERGIFT}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                      unoptimized
                    />
                  }
                  label="StalkerGift"
                  onClick={() => navigate('/stalkergift')}
                />
              </nav>

              <div className="mt-auto flex w-full justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setServicesSheetOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  aria-label="Cerrar pestaña de servicios"
                >
                  <Image
                    src={ICON_ATRAS}
                    alt=""
                    width={22}
                    height={22}
                    className="h-5 w-5 rotate-90 object-contain"
                    unoptimized
                  />
                </button>
              </div>
            </HexPanelShell>
          </div>
        </div>
      </div>
    </>
  )
}
