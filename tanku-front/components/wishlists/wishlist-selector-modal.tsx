/**
 * Modal para seleccionar wishlist o crear una nueva
 */

'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWishLists } from '@/lib/hooks/use-wishlists'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { ProductVariantDTO } from '@/types/api'

interface WishlistSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  variantId?: string
  onAdded: () => void
}

export function WishlistSelectorModal({
  isOpen,
  onClose,
  productId,
  variantId,
  onAdded,
}: WishlistSelectorModalProps) {
  const { wishLists, fetchWishLists, createWishList, addItemToWishList, isLoading } = useWishLists()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newWishlistName, setNewWishlistName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    // Cargar wishlists cada vez que se abre el modal (para que no aparezca vacío)
    if (!isOpen) return
    fetchWishLists()
  }, [isOpen, fetchWishLists])

  const handleAddToWishlist = async (wishListId: string) => {
    setIsAdding(true)
    try {
      // Validar que se haya seleccionado una variante si el producto tiene variantes
      if (!variantId) {
        alert('Por favor selecciona una variante del producto')
        setIsAdding(false)
        return
      }

      // Validar stock antes de agregar (validación preventiva)
      const variantResponse = await apiClient.get<ProductVariantDTO>(API_ENDPOINTS.PRODUCTS.VARIANT_BY_ID(variantId))
      if (variantResponse.success && variantResponse.data) {
        const variant = variantResponse.data
        if (variant.stock === 0) {
          alert('Este producto no tiene stock disponible')
          setIsAdding(false)
          return
        }
      }

      await addItemToWishList(wishListId, productId, variantId)
      // Disparar evento con información del producto agregado
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
          detail: { productId } 
        }))
      }
      onAdded()
      onClose()
    } catch (error: any) {
      console.error('Error agregando a wishlist:', error)
      // Extraer mensaje del error
      let errorMessage = 'Error al agregar producto a la wishlist'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.error?.message) {
        errorMessage = error.error.message
      } else if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message
      }
      
      alert(errorMessage)
    } finally {
      setIsAdding(false)
    }
  }

  const handleCreateAndAdd = async () => {
    if (!newWishlistName.trim()) return

    setIsAdding(true)
    try {
      // Validar que se haya seleccionado una variante
      if (!variantId) {
        alert('Por favor selecciona una variante del producto')
        setIsAdding(false)
        return
      }

      // Validar stock antes de crear y agregar
      const variantResponse = await apiClient.get<ProductVariantDTO>(API_ENDPOINTS.PRODUCTS.VARIANT_BY_ID(variantId))
      if (variantResponse.success && variantResponse.data) {
        const variant = variantResponse.data
        if (variant.stock === 0) {
          alert('Este producto no tiene stock disponible')
          setIsAdding(false)
          return
        }
      }

      const newWishlist = await createWishList(newWishlistName.trim(), isPublic)
      if (newWishlist) {
        await addItemToWishList(newWishlist.id, productId, variantId)
        // Disparar evento con información del producto agregado
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
            detail: { productId } 
          }))
        }
        onAdded()
        onClose()
        setShowCreateForm(false)
        setNewWishlistName('')
      }
    } catch (error: any) {
      console.error('Error creando wishlist:', error)
      // Extraer mensaje del error
      let errorMessage = 'Error al crear wishlist'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.error?.message) {
        errorMessage = error.error.message
      } else if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message
      }
      
      alert(errorMessage)
    } finally {
      setIsAdding(false)
    }
  }

  if (!isOpen || !mounted) return null

  const WISHLIST_MODAL_Z = 10052

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
          borderRadius: '25px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 
            className="text-xl font-semibold mb-2"
            style={{ color: '#73FFA2' }}
          >
            Agregar a wishlist
          </h3>
          <p 
            className="text-sm mb-4"
            style={{ color: '#66DEDB' }}
          >
            Tus productos favoritos para sorprender y crear sonrisas.
          </p>

          {!showCreateForm ? (
            <>
              <div className="max-h-60 overflow-y-auto custom-scrollbar mb-4">
                {wishLists.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    {isLoading ? 'Cargando...' : 'No tienes wishlists. Crea una nueva.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {wishLists.map((wishlist) => (
                      <button
                        key={wishlist.id}
                        onClick={() => handleAddToWishlist(wishlist.id)}
                        disabled={isAdding}
                        className="w-full p-3 text-left transition-opacity disabled:opacity-50"
                        style={{
                          backgroundColor: 'transparent',
                          border: '2px solid #73FFA2',
                          borderRadius: '25px'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{wishlist.name}</span>
                            {wishlist.public && (
                              <span className="text-xs" style={{ color: '#73FFA2' }}>🌐</span>
                            )}
                          </div>
                          <span 
                            className="text-xs"
                            style={{ color: '#66DEDB' }}
                          >
                            {wishlist.items.length} producto{wishlist.items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>
                    ))}
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
                  display: 'block'
                }}
              >
                + Crear nueva wishlist
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <h3 
                className="text-xl font-semibold mb-4"
                style={{ color: '#73FFA2' }}
              >
                Crear wishlist
              </h3>
              
              <div>
                <label className="block text-sm text-gray-300 mb-2">Nombre</label>
                <input
                  type="text"
                  value={newWishlistName}
                  onChange={(e) => setNewWishlistName(e.target.value)}
                  placeholder="Mi wishlist"
                  className="w-full px-3 py-2 text-white placeholder-gray-500 focus:outline-none"
                  style={{
                    backgroundColor: 'transparent',
                    border: '2px solid #73FFA2',
                    borderRadius: '25px'
                  }}
                />
              </div>

              {/* Selector segmentado Pública/Privada */}
              <div className="flex items-center justify-center">
                <div 
                  className="flex items-center overflow-hidden"
                  style={{
                    backgroundColor: 'transparent',
                    border: '2px solid #73FFA2',
                    borderRadius: '25px'
                  }}
                >
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`px-4 py-2 text-sm transition-colors ${
                      isPublic 
                        ? 'bg-[#73FFA2] text-gray-900' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Pública
                  </button>
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`px-4 py-2 text-sm transition-colors ${
                      !isPublic 
                        ? 'bg-[#73FFA2] text-gray-900' 
                        : 'text-gray-300 hover:text-white'
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
                    borderRadius: '25px'
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
    document.body
  )
}

