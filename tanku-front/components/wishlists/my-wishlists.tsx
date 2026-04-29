/**
 * Componente para mostrar las wishlists propias del usuario
 */

'use client'

import { clsx } from 'clsx'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  XMarkIcon,
  GiftIcon,
  ChevronDownIcon,
  LockClosedIcon,
  GlobeAltIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline'
import { useIsMinWidth } from '@/lib/hooks/use-is-max-width'
import { useWishLists } from '@/lib/hooks/use-wishlists'
import { WishlistInlineProducts } from './wishlist-inline-products'
import { ShareWishlistModal } from './share-wishlist-modal'
import { WishlistAccessManager } from './wishlist-access-manager'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { WishListDTO } from '@/types/api'

interface RecommendedWishlist {
  name: string
  description: string
}

/** Misma duración que `transition-[grid-template-rows]` del panel */
const WISHLIST_PANEL_MS = 980

export function MyWishlists() {
  const { wishLists, fetchWishLists, createWishList, deleteWishList, updateWishList, removeItemFromWishList, isLoading } =
    useWishLists()
  const [expandedWishlistId, setExpandedWishlistId] = useState<string | null>(null)
  const [shareWishlist, setShareWishlist] = useState<WishListDTO | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingWishlist, setEditingWishlist] = useState<WishListDTO | null>(null)
  const [newName, setNewName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [recommendedWishlists, setRecommendedWishlists] = useState<RecommendedWishlist[]>([])
  const [showRecommendedWishlists, setShowRecommendedWishlists] = useState(false)
  const [mobileActionsWishlistId, setMobileActionsWishlistId] = useState<string | null>(null)
  const [mobileAccessWishlist, setMobileAccessWishlist] = useState<WishListDTO | null>(null)

  /**
   * Cabecera (chevron, miniaturas): `expandedWishlistId`.
   * Contenido de productos tras cerrar sigue montado hasta acabar CSS — `mountedProductWishlistId`.
   */
  const [mountedProductWishlistId, setMountedProductWishlistId] = useState<string | null>(null)
  /** DOM timer id (`number`); evitar conflicto Node `Timeout` vs `number` en el build */
  const closeUnmountTimerRef = useRef<number | null>(null)

  /** A partir de lg: 4 miniaturas en la franja; si no: 2. */
  const isLgWishlistThumbs = useIsMinWidth(1024)

  useEffect(() => {
    fetchWishLists()
  }, [fetchWishLists])

  useEffect(() => {
    return () => {
      if (closeUnmountTimerRef.current) window.clearTimeout(closeUnmountTimerRef.current)
    }
  }, [])

  /** Al cerrar se desmonta el contenido tras la animación. Al volver a abrir se cancela el timer. */
  useEffect(() => {
    if (closeUnmountTimerRef.current) {
      window.clearTimeout(closeUnmountTimerRef.current)
      closeUnmountTimerRef.current = null
    }
    if (expandedWishlistId != null || !mountedProductWishlistId) {
      return
    }
    const idMounted = mountedProductWishlistId
    closeUnmountTimerRef.current = window.setTimeout(() => {
      setMountedProductWishlistId((prev) => (prev === idMounted ? null : prev))
      closeUnmountTimerRef.current = null
    }, WISHLIST_PANEL_MS)

    return () => {
      if (closeUnmountTimerRef.current) {
        window.clearTimeout(closeUnmountTimerRef.current)
        closeUnmountTimerRef.current = null
      }
    }
  }, [expandedWishlistId, mountedProductWishlistId])

  /** Mantener contenido montado al abrir otra lista (solo una abierta por cabecera). */
  useEffect(() => {
    if (!expandedWishlistId) return
    setMountedProductWishlistId(expandedWishlistId)
  }, [expandedWishlistId])

  /**
   * Alinear solo dentro de `#wishlist-scroll-root` (no `window`): si el encabezado queda oculto por arriba,
   * ajustamos `scrollTop` una vez. Evita `scrollIntoView` + `innerHeight` global, que rompía el scroll hacia listas inferiores.
   */
  useEffect(() => {
    if (!expandedWishlistId) return
    const id = expandedWishlistId
    const run = () => {
      const el = document.getElementById(`wishlist-article-${id}`)
      const scrollRoot = document.getElementById('wishlist-scroll-root')
      if (!el || !scrollRoot) return
      const margin = 14
      const elRect = el.getBoundingClientRect()
      const rootRect = scrollRoot.getBoundingClientRect()
      if (elRect.top < rootRect.top + margin) {
        scrollRoot.scrollTop += elRect.top - rootRect.top - margin
      }
    }
    const t = window.setTimeout(() => {
      run()
    }, 480)
    return () => window.clearTimeout(t)
  }, [expandedWishlistId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await apiClient.get<RecommendedWishlist[]>(API_ENDPOINTS.WISHLISTS.RECOMMENDED)
        if (!cancelled && response.success && response.data) {
          setRecommendedWishlists(Array.isArray(response.data) ? response.data : [])
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error al cargar wishlists recomendadas:', error)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleShowRecommendedWishlists = () => {
    setShowRecommendedWishlists(true)
  }

  const closeRecommendedModal = () => {
    setShowRecommendedWishlists(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('tanku_hide_recommended_wishlists', 'true')
    }
  }

  const openCreateFromRecommendation = (recommended: RecommendedWishlist) => {
    setEditingWishlist(null)
    setNewName(recommended.name)
    setIsPublic(false) // Por defecto privada
    setIsCreateModalOpen(true)
    setShowRecommendedWishlists(false)
  }

  const closeWishlistFormModal = () => {
    setIsCreateModalOpen(false)
    setEditingWishlist(null)
    setNewName('')
    setIsPublic(false)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    await createWishList(newName.trim(), isPublic)
    closeWishlistFormModal()
  }

  const handleSaveEditWishlist = async () => {
    if (!editingWishlist || !newName.trim()) return
    await updateWishList(editingWishlist.id, newName.trim(), isPublic)
    closeWishlistFormModal()
  }

  const handleDeleteClick = (wishlistId: string) => {
    setConfirmingDelete(wishlistId)
  }

  const handleDeleteConfirm = async (wishlistId: string) => {
    await deleteWishList(wishlistId)
    setConfirmingDelete(null)
    setExpandedWishlistId((prev) => (prev === wishlistId ? null : prev))
    setMountedProductWishlistId((m) => (m === wishlistId ? null : m))
  }

  const handleDeleteCancel = () => {
    setConfirmingDelete(null)
  }

  const handleRemoveItem = async (wishListId: string, itemId: string) => {
    await removeItemFromWishList(wishListId, itemId)
  }

  const toggleWishlistExpanded = (wishlistId: string) => {
    setExpandedWishlistId((prev) => {
      if (prev === wishlistId) {
        return null
      }
      setMountedProductWishlistId(wishlistId)
      return wishlistId
    })
  }

  const actionPillCls =
    'inline-flex shrink-0 items-center justify-center rounded-xl border border-[#66DEDB]/40 bg-black/35 px-3 py-2 text-[11px] font-medium text-[#66DEDB] transition-colors hover:border-[#73FFA2]/55 hover:bg-[#66DEDB]/10 sm:text-xs'

  /** Chevron: solo icono (sin fondo visible ni halo al hover). */
  const chevronExpandBtnCls =
    '-mr-0.5 shrink-0 inline-flex items-center justify-center border-0 bg-transparent p-0 text-zinc-300 shadow-none transition-[color,opacity] hover:bg-transparent hover:opacity-80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66DEDB]/35'

  const openEditWishlistModal = (wishlist: WishListDTO) => {
    setIsCreateModalOpen(false)
    setEditingWishlist(wishlist)
    setNewName(wishlist.name)
    setIsPublic(wishlist.public)
  }

  const mobileMenuWishlist =
    mobileActionsWishlistId != null
      ? (wishLists.find((w) => w.id === mobileActionsWishlistId) ?? null)
      : null
  if (isLoading) {
    return (
      <div className="py-8 text-center text-gray-400">
        Cargando wishlists...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con acción crear (minimalista) */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-2xl font-bold text-[#66DEDB]">Mis Wishlists</h2>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-2 sm:gap-3">
          {recommendedWishlists.length > 0 && !showRecommendedWishlists && (
            <button
              onClick={handleShowRecommendedWishlists}
              className="text-xs text-gray-300 transition-colors hover:text-[#73FFA2]"
            >
              Ver Sugerencias
            </button>
          )}
          <button
            onClick={() => {
              setEditingWishlist(null)
              setNewName('')
              setIsPublic(false)
              setIsCreateModalOpen(true)
            }}
            className="text-sm text-[#73FFA2] hover:text-[#66DEDB] transition-colors"
          >
            + Crear wishlist
          </button>
        </div>
      </div>

      {/* Lista de wishlists */}
      {wishLists.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No tienes wishlists aún</p>
          <p className="text-sm mt-2">Crea una nueva wishlist para comenzar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {wishLists.map((wishlist) => {
            const expanded = expandedWishlistId === wishlist.id
            const productsMounted = mountedProductWishlistId === wishlist.id
            const gridRowsOpen =
              mountedProductWishlistId === wishlist.id && expandedWishlistId === wishlist.id

            const thumbSlotCount = isLgWishlistThumbs ? 4 : 2

            return (
            <article
              key={wishlist.id}
              id={`wishlist-article-${wishlist.id}`}
              className="overflow-hidden rounded-2xl border border-[#66DEDB]/25 bg-[#23262c]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-[#66DEDB]/45"
            >
              <div className="space-y-0 px-3 pb-4 pt-3 sm:px-5 sm:pt-4">
                {/* Fila: nombre + meta + pills (pill escritorio mismo renglón que privada/productos) */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-3 md:flex-nowrap">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={expanded}
                      aria-controls={`wishlist-items-${wishlist.id}`}
                      className={clsx(
                        'group flex shrink-0 cursor-pointer items-center gap-3 rounded-lg text-left outline-none sm:gap-4',
                        'hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-[#66DEDB]/35',
                        'md:min-h-[3.25rem]',
                        'md:max-w-[min(38vw,230px)]',
                      )}
                      onClick={() => {
                        toggleWishlistExpanded(wishlist.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return
                        e.preventDefault()
                        toggleWishlistExpanded(wishlist.id)
                      }}
                    >
                      <div
                        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#73FFA2]/55 bg-black/35 sm:h-14 sm:w-14"
                        aria-hidden
                      >
                        <GiftIcon
                          className="h-7 w-7 text-[#73FFA2] drop-shadow-[0_0_10px_rgba(115,255,162,0.5)] sm:h-9 sm:w-9 md:h-10 md:w-10"
                          strokeWidth={1.65}
                        />
                      </div>
                      <span
                        className={clsx(
                          'min-w-0 flex-1 text-[15px] font-semibold leading-tight text-[#66DEDB] sm:text-base',
                          'break-words',
                          'md:break-normal md:truncate md:leading-snug',
                        )}
                      >
                        {wishlist.name}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-x-2 gap-y-2 max-md:flex-wrap md:flex-nowrap md:justify-start">
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-black/25 px-1.5 py-0.5 text-[11px] text-zinc-400 sm:text-xs">
                        {wishlist.public ? (
                          <>
                            <GlobeAltIcon className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                            Pública
                          </>
                        ) : (
                          <>
                            <LockClosedIcon className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                            Privada
                          </>
                        )}
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-[11px] text-zinc-500 sm:text-xs">
                        {wishlist.items.length}{' '}
                        {wishlist.items.length === 1 ? 'producto' : 'productos'}
                      </span>
                      <div className="hidden min-w-0 shrink-0 items-center gap-2 lg:flex lg:flex-nowrap">
                        <button type="button" onClick={() => setShareWishlist(wishlist)} className={actionPillCls}>
                          Compartir
                        </button>
                        <WishlistAccessManager
                          wishlistId={wishlist.id}
                          wishlistName={wishlist.name}
                          isPrivate={!wishlist.public}
                          variant="pill"
                        />
                        <button
                          type="button"
                          onClick={() => openEditWishlistModal(wishlist)}
                          className={actionPillCls}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(wishlist.id)}
                          className="inline-flex shrink-0 rounded-xl border border-red-500/45 bg-black/35 px-3 py-2 text-[11px] font-medium text-red-400 transition-colors hover:border-red-400/65 hover:bg-red-500/10 sm:text-xs"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/*
                    · max-md (móvil): columna: ⋯ arriba, miniaturas + chevron debajo.
                    · md–lg−1 (tablet): misma fila superior: miniaturas + chevron y ⋯ (flex-row-reverse en el bloque derecho).
                    · lg+: fila sólo miniaturas + chevron (⋯ oculto; pills escritorio).
                  */}
                  <div
                    className={clsx(
                      'flex shrink-0 pt-1 md:pt-2',
                      'max-md:flex-col max-md:items-end max-md:gap-1 max-md:self-start',
                      'md:flex-row md:flex-row-reverse md:items-start md:gap-1.5',
                    )}
                  >
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded={mobileActionsWishlistId === wishlist.id}
                      aria-label="Más opciones de la wishlist"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMobileActionsWishlistId((prev) => (prev === wishlist.id ? null : wishlist.id))
                      }}
                      className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-1 text-[#66DEDB] shadow-none transition-colors hover:bg-white/[0.07] hover:text-[#73FFA2] md:h-10 md:w-10 md:p-1.5 lg:hidden"
                    >
                      <EllipsisHorizontalIcon className="h-5 w-5 md:h-6 md:w-6" aria-hidden />
                    </button>
                    {/* Miniaturas + desplegar */}
                    <div
                      className={clsx(
                        'flex shrink-0 items-start gap-0.5 max-md:justify-end max-md:gap-0 md:justify-start md:gap-1.5',
                      )}
                    >
                      <div
                        className={clsx(
                          'block shrink-0 overflow-hidden',
                          isLgWishlistThumbs
                            ? 'h-11 w-[12.5rem] sm:h-[2.75rem]'
                            : 'h-8 w-[4.25rem] md:h-[2.75rem] md:w-[5.875rem]',
                        )}
                        aria-hidden
                      >
                        <div
                          className={clsx(
                            'flex h-full items-center transition-[transform,opacity] duration-[900ms]',
                            isLgWishlistThumbs ? 'w-[12.5rem] gap-1.5' : 'w-[4.25rem] gap-1 md:w-[5.875rem] md:gap-1.5',
                            '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
                            '[will-change:transform,opacity]',
                            'motion-reduce:!transition-none',
                            expandedWishlistId === wishlist.id
                              ? 'translate-x-full opacity-0'
                              : 'translate-x-0 opacity-100',
                          )}
                        >
                          {Array.from({ length: thumbSlotCount }).map((_, i) => {
                            const item = wishlist.items[i]
                            return (
                              <div
                                key={item?.id ?? `placeholder-${wishlist.id}-${i}`}
                                className={clsx(
                                  'relative overflow-hidden rounded-md bg-zinc-800/90 ring-1 ring-white/10',
                                  isLgWishlistThumbs
                                    ? 'h-9 w-9 sm:h-11 sm:w-11'
                                    : 'h-8 w-8 md:h-[2.75rem] md:w-[2.75rem]',
                                )}
                              >
                                {item?.product.thumbnail ? (
                                  <Image
                                    src={item.product.thumbnail}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    sizes={isLgWishlistThumbs ? '44px' : '(max-width:767px) 32px, 44px'}
                                    unoptimized
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/95">
                                    <span className="text-[9px] text-zinc-600">—</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={clsx(
                          chevronExpandBtnCls,
                          'mt-0.5 transition-transform duration-[950ms]',
                          'min-h-[2.25rem] min-w-[2.25rem] max-md:min-h-8 max-md:min-w-8',
                          '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
                        )}
                        aria-expanded={expanded}
                        aria-controls={`wishlist-items-${wishlist.id}`}
                        title={expanded ? 'Contraer' : 'Expandir'}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleWishlistExpanded(wishlist.id)
                        }}
                      >
                        <ChevronDownIcon
                          className={clsx(
                            'h-5 w-5 transition-transform duration-[950ms] max-md:h-[1.125rem] max-md:w-[1.125rem] md:h-6 md:w-6',
                            '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
                            expanded ? 'rotate-180' : '',
                          )}
                          aria-hidden
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                id={`wishlist-items-${wishlist.id}`}
                className={clsx(
                  'grid overflow-hidden border-t transition-[grid-template-rows] duration-[980ms]',
                  '[transition-timing-function:cubic-bezier(0.33,1,0.32,1)]',
                  'motion-reduce:!duration-150 motion-reduce:[transition-timing-function:ease]',
                  '[will-change:grid-template-rows]',
                  gridRowsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  gridRowsOpen ? 'border-[#66DEDB]/20' : 'border-transparent',
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  {productsMounted ? (
                    <WishlistInlineProducts key={wishlist.id} wishlist={wishlist} onRemoveItem={handleRemoveItem} />
                  ) : null}
                </div>
              </div>
            </article>
            )
          })}
        </div>
      )}

      <section className="flex flex-col items-center px-4 pt-8 pb-2" aria-labelledby="mis-wishlists-me-gusta-heading">
        <div className="relative mx-auto flex h-6 w-full max-w-[22rem] items-center justify-center px-8 sm:max-w-lg">
          <div
            aria-hidden
            className="absolute left-8 right-8 top-1/2 h-px -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-[#66DEDB]/18 to-transparent"
          />
          <div
            aria-hidden
            className="relative z-[1] h-[3px] w-[min(42%,7.5rem)] rounded-full bg-gradient-to-r from-[#66DEDB]/10 via-[#66DEDB]/38 to-[#66DEDB]/10 shadow-[0_0_14px_rgba(102,222,219,0.2)] sm:w-[min(40%,8.5rem)]"
          />
        </div>
        <h3 id="mis-wishlists-me-gusta-heading" className="sr-only">
          Me gusta
        </h3>
        <Link
          href="/wishlist?tab=liked"
          scroll={false}
          className="group mt-7 flex flex-col items-center gap-2 rounded-2xl px-6 py-3 text-[#66DEDB] transition-colors hover:text-[#73FFA2]"
        >
          <Image
            src="/icons_tanku/tanku_megusta_relleno.svg"
            alt=""
            width={88}
            height={88}
            className="h-[4.5rem] w-[4.5rem] object-contain opacity-95 transition-transform duration-200 group-hover:scale-105 motion-safe:animate-[pulse_1.1s_ease-in-out_infinite] sm:h-24 sm:w-24"
            unoptimized
          />
          <span className="text-center text-sm font-semibold sm:text-base">Mis me gusta</span>
        </Link>
      </section>

      {/* Modal sugerencias — mismo patrón que «Sugerencias de red» (red-tanku-tab) */}
      {showRecommendedWishlists && recommendedWishlists.length > 0 ? (
        <div
          className="fixed inset-0 z-[1000000] flex items-center justify-center bg-transparent p-4"
          role="presentation"
          onClick={closeRecommendedModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wishlist-suggested-title"
            className="w-full max-w-sm rounded-[24px] border border-[#414141] bg-[#171B21] p-3.5 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 id="wishlist-suggested-title" className="text-sm font-semibold text-[#66DEDB]">
                Sugerencias de wishlist
              </h4>
              <button
                type="button"
                onClick={closeRecommendedModal}
                className="text-gray-500 transition-colors hover:text-gray-300"
                title="Cerrar"
                aria-label="Cerrar"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recommendedWishlists.map((rec, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    openCreateFromRecommendation(rec)
                  }}
                  className="rounded-[14px] border border-white/10 bg-[#10161d] px-3 py-2 text-left text-xs transition-colors hover:border-[#73FFA2]/45 hover:bg-white/[0.03]"
                >
                  <div className="font-medium text-white">{rec.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirmar borrado (centrado · móvil y escritorio) */}
      {confirmingDelete !== null ? (
        <div
          className="fixed inset-0 z-[105] flex items-center justify-center bg-transparent p-4"
          role="presentation"
          onClick={handleDeleteCancel}
        >
          <div
            role="alertdialog"
            aria-labelledby="wishlist-delete-title"
            className="w-full max-w-sm rounded-2xl border border-[#66DEDB]/25 bg-[#1a1d24] px-5 py-5 shadow-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="wishlist-delete-title" className="text-center text-sm text-white">
              ¿Eliminar esta wishlist?
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="flex-1 rounded-xl border border-white/15 bg-black/35 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/10"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm(confirmingDelete)}
                className="flex-1 rounded-xl border border-red-500/50 bg-red-500/15 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/25"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Menú móvil ⋯ opciones */}
      {mobileMenuWishlist !== null ? (
        <div
          className="fixed inset-0 z-[101] flex items-center justify-center bg-transparent p-4"
          role="presentation"
          onClick={() => setMobileActionsWishlistId(null)}
        >
          <div
            role="dialog"
            aria-labelledby="wishlist-mobile-actions-title"
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#66DEDB]/25 bg-[#1a1d24] shadow-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/10 px-4 py-3 sm:px-5">
              <h2 id="wishlist-mobile-actions-title" className="text-lg font-semibold text-white">
                Opciones
              </h2>
              <p className="mt-0.5 truncate text-sm text-zinc-400" title={mobileMenuWishlist.name}>
                {mobileMenuWishlist.name}
              </p>
            </div>
            <div className="flex flex-col p-2">
              <button
                type="button"
                className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#66DEDB] transition-colors hover:bg-white/10"
                onClick={() => {
                  const w = mobileMenuWishlist
                  setMobileActionsWishlistId(null)
                  setShareWishlist(w)
                }}
              >
                Compartir
              </button>
              {!mobileMenuWishlist.public ? (
                <button
                  type="button"
                  className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#66DEDB] transition-colors hover:bg-white/10"
                  onClick={() => {
                    const w = mobileMenuWishlist
                    setMobileActionsWishlistId(null)
                    setMobileAccessWishlist(w)
                  }}
                >
                  Acceso
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#66DEDB] transition-colors hover:bg-white/10"
                onClick={() => {
                  const w = mobileMenuWishlist
                  setMobileActionsWishlistId(null)
                  openEditWishlistModal(w)
                }}
              >
                Editar
              </button>
              <button
                type="button"
                className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                onClick={() => {
                  const w = mobileMenuWishlist
                  setMobileActionsWishlistId(null)
                  handleDeleteClick(w.id)
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Acceso desde menú ⋯ (móvil · modal como variant pill en desktop) */}
      {mobileAccessWishlist !== null ? (
        <WishlistAccessManager
          variant="modalOnly"
          open={true}
          wishlistId={mobileAccessWishlist.id}
          wishlistName={mobileAccessWishlist.name}
          isPrivate={!mobileAccessWishlist.public}
          onModalClose={() => setMobileAccessWishlist(null)}
        />
      ) : null}

      {/* Modal crear / editar wishlist — mismo tratamiento visual que Acceso */}
      {(isCreateModalOpen || editingWishlist) && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent p-4"
          role="presentation"
          onClick={closeWishlistFormModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wishlist-form-title"
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#66DEDB]/25 bg-[#1a1d24] shadow-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2 id="wishlist-form-title" className="text-lg font-semibold text-white">
                  {editingWishlist ? 'Editar wishlist' : 'Crear wishlist'}
                </h2>
                <p className="mt-0.5 text-sm text-zinc-400">
                  {editingWishlist ? 'Nombre y visibilidad' : 'Nombre y quién puede verla'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeWishlistFormModal}
                className="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-4 pb-5 pt-4 sm:px-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#66DEDB]" htmlFor="wishlist-form-name">
                  Nombre
                </label>
                <input
                  id="wishlist-form-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Mi wishlist"
                  className="tanku-input-text-ios w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-white placeholder:text-zinc-600 focus:border-[#66DEDB]/50 focus:outline-none focus:ring-1 focus:ring-[#66DEDB]/30"
                />
              </div>
              <div>
                <span className="mb-2 block text-sm font-semibold text-[#66DEDB]">Visibilidad</span>
                <div
                  className="relative flex h-11 w-full overflow-hidden rounded-xl border border-white/12 bg-black/25 shadow-inner"
                  role="group"
                  aria-label="Wishlist pública o privada"
                >
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-[#66DEDB]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-transform duration-300 ease-out will-change-transform"
                    style={{ transform: isPublic ? 'translateX(0)' : 'translateX(100%)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={clsx(
                      'relative z-10 flex-1 py-2.5 text-center text-sm font-semibold transition-colors duration-200',
                      isPublic ? 'text-gray-950' : 'text-zinc-400 hover:text-zinc-200',
                    )}
                  >
                    Pública
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={clsx(
                      'relative z-10 flex-1 py-2.5 text-center text-sm font-semibold transition-colors duration-200',
                      !isPublic ? 'text-gray-950' : 'text-zinc-400 hover:text-zinc-200',
                    )}
                  >
                    Privada
                  </button>
                </div>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={editingWishlist ? handleSaveEditWishlist : handleCreate}
                  disabled={!newName.trim()}
                  className="min-w-[12rem] rounded-xl border border-[#66DEDB]/55 bg-[#66DEDB]/18 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#66DEDB]/28 disabled:cursor-not-allowed disabled:opacity-45 shadow-[inset_0_2px_4px_rgba(0,0,0,0.45),inset_0_-1px_0_rgba(255,255,255,0.08),inset_0_1px_0_rgba(102,222,219,0.15)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]"
                >
                  {editingWishlist ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de compartir wishlist */}
      {shareWishlist && (
        <ShareWishlistModal
          wishlist={shareWishlist}
          isOpen={!!shareWishlist}
          onClose={() => setShareWishlist(null)}
        />
      )}
    </div>
  )
}

