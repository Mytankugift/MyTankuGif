/**
 * Modal para seleccionar wishlist o crear una nueva
 */

'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { useWishLists } from '@/lib/hooks/use-wishlists'
import {
  isProductInWishList,
  isProductInAnyWishList,
} from '@/lib/stores/wishlists-store'

interface WishlistSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  variantId?: string
  /** Stock conocido desde el detalle del producto; evita GET extra de variante */
  variantStock?: number
  onAdded: () => void
}

function dispatchWishlistUpdated(productId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('wishlistUpdated', {
        detail: { productId },
      }),
    )
  }
}

export function WishlistSelectorModal({
  isOpen,
  onClose,
  productId,
  variantId,
  variantStock,
  onAdded,
}: WishlistSelectorModalProps) {
  const { wishLists, ensureWishListsLoaded, createWishList, addItemToWishList, isLoading } =
    useWishLists()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newWishlistName, setNewWishlistName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setShowCreateForm(false)
      setStatusMessage(null)
      return
    }
    ensureWishListsLoaded()
  }, [isOpen, ensureWishListsLoaded])

  const finishAdd = () => {
    dispatchWishlistUpdated(productId)
    onAdded()
    onClose()
  }

  const validateVariant = (): boolean => {
    if (!variantId) {
      setStatusMessage('Selecciona una variante del producto primero.')
      return false
    }
    if (variantStock === 0) {
      setStatusMessage('Este producto no tiene stock disponible.')
      return false
    }
    return true
  }

  const handleAddToWishlist = async (wishListId: string) => {
    if (!validateVariant()) return

    if (isProductInWishList(wishLists, wishListId, productId)) {
      setStatusMessage('Este producto ya está en esa wishlist.')
      if (isProductInAnyWishList(wishLists, productId)) {
        finishAdd()
      }
      return
    }

    setIsAdding(true)
    setStatusMessage(null)
    try {
      const result = await addItemToWishList(wishListId, productId, variantId)
      if (result === 'added' || result === 'already_exists') {
        finishAdd()
      }
    } catch (error) {
      console.error('Error agregando a wishlist:', error)
      setStatusMessage('No se pudo agregar el producto. Intenta de nuevo.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleCreateAndAdd = async () => {
    if (!newWishlistName.trim()) return
    if (!validateVariant()) return

    setIsAdding(true)
    setStatusMessage(null)
    try {
      const newWishlist = await createWishList(newWishlistName.trim(), isPublic)
      if (!newWishlist) return

      const result = await addItemToWishList(newWishlist.id, productId, variantId)
      if (result === 'added' || result === 'already_exists') {
        finishAdd()
        setShowCreateForm(false)
        setNewWishlistName('')
      }
    } catch (error) {
      console.error('Error creando wishlist:', error)
      setStatusMessage('No se pudo crear la wishlist. Intenta de nuevo.')
    } finally {
      setIsAdding(false)
    }
  }

  if (!isOpen || !mounted) return null

  const WISHLIST_MODAL_Z = 1_000_004
  const showLoadingPlaceholder = isLoading && wishLists.length === 0

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm max-md:pb-[max(1rem,calc(4.75rem+env(safe-area-inset-bottom,0px)))]"
      style={{ zIndex: WISHLIST_MODAL_Z }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex w-full max-w-md max-md:max-h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden"
        style={{
          backgroundColor: '#2C3137',
          border: '2px solid #73FFA2',
          borderRadius: '25px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2" style={{ color: '#73FFA2' }}>
            Agregar a wishlist
          </h3>
          <p className="text-sm mb-4" style={{ color: '#66DEDB' }}>
            Tus productos favoritos para sorprender y crear sonrisas.
          </p>

          {statusMessage && (
            <p className="mb-3 text-sm text-amber-300/90" role="status">
              {statusMessage}
            </p>
          )}

          {!showCreateForm ? (
            <>
              <div className="max-h-60 overflow-y-auto custom-scrollbar mb-4">
                {showLoadingPlaceholder ? (
                  <p className="text-gray-400 text-sm text-center py-4">Cargando wishlists...</p>
                ) : wishLists.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No tienes wishlists. Crea una nueva.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {wishLists.map((wishlist) => {
                      const alreadyAdded = isProductInWishList(wishLists, wishlist.id, productId)
                      return (
                        <button
                          key={wishlist.id}
                          onClick={() => handleAddToWishlist(wishlist.id)}
                          disabled={isAdding || alreadyAdded}
                          className="w-full p-3 text-left transition-opacity disabled:cursor-default"
                          style={{
                            backgroundColor: alreadyAdded ? 'rgba(115, 255, 162, 0.08)' : 'transparent',
                            border: alreadyAdded ? '2px solid rgba(115, 255, 162, 0.45)' : '2px solid #73FFA2',
                            borderRadius: '25px',
                            opacity: isAdding ? 0.6 : 1,
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {alreadyAdded && (
                                <Image
                                  src="/icons_tanku/tanku_agregado_a_whislist_verde.svg"
                                  alt=""
                                  width={18}
                                  height={18}
                                  className="h-[18px] w-[18px] shrink-0"
                                  aria-hidden
                                />
                              )}
                              <span className="text-white font-medium truncate">{wishlist.name}</span>
                              {wishlist.public && (
                                <span className="text-xs shrink-0" style={{ color: '#73FFA2' }}>
                                  🌐
                                </span>
                              )}
                            </div>
                            <span className="text-xs shrink-0" style={{ color: '#66DEDB' }}>
                              {alreadyAdded
                                ? 'Agregado'
                                : `${wishlist.items.length} producto${wishlist.items.length !== 1 ? 's' : ''}`}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowCreateForm(true)}
                className="py-2 font-semibold transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: '#73FFA2',
                  color: '#2C3137',
                  borderRadius: '25px',
                  width: 'auto',
                  paddingLeft: '1.5rem',
                  paddingRight: '1.5rem',
                  margin: '0 auto',
                  display: 'block',
                }}
              >
                + Crear nueva wishlist
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4" style={{ color: '#73FFA2' }}>
                Crear wishlist
              </h3>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Nombre</label>
                <input
                  type="text"
                  value={newWishlistName}
                  onChange={(e) => setNewWishlistName(e.target.value)}
                  placeholder="Mi wishlist"
                  className="tanku-input-text-ios w-full px-3 py-2 text-white placeholder-gray-500 focus:outline-none"
                  style={{
                    backgroundColor: 'transparent',
                    border: '2px solid #73FFA2',
                    borderRadius: '25px',
                  }}
                />
              </div>

              <div className="flex items-center justify-center">
                <div
                  className="flex items-center overflow-hidden"
                  style={{
                    backgroundColor: 'transparent',
                    border: '2px solid #73FFA2',
                    borderRadius: '25px',
                  }}
                >
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`px-4 py-2 text-sm transition-colors ${
                      isPublic ? 'bg-[#73FFA2] text-gray-900' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Pública
                  </button>
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`px-4 py-2 text-sm transition-colors ${
                      !isPublic ? 'bg-[#73FFA2] text-gray-900' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Privada
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewWishlistName('')
                  }}
                  className="flex-1 py-2 font-semibold transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: '#3B9BC3',
                    color: '#2C3137',
                    borderRadius: '25px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateAndAdd}
                  disabled={!newWishlistName.trim() || isAdding}
                  className="flex-1 py-2 bg-[#73FFA2] text-gray-900 font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ borderRadius: '25px' }}
                >
                  Crear y agregar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
