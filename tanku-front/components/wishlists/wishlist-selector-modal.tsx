/**
 * Modal para seleccionar wishlist o crear una nueva
 */

'use client'

import { useEffect, useState } from 'react'
import { useWishLists } from '@/lib/hooks/use-wishlists'

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

  useEffect(() => {
    // Cargar wishlists cada vez que se abre el modal (para que no aparezca vacío)
    if (!isOpen) return
    fetchWishLists()
  }, [isOpen, fetchWishLists])

  if (!isOpen) return null

  const handleAddToWishlist = async (wishListId: string) => {
    setIsAdding(true)
    try {
      await addItemToWishList(wishListId, productId, variantId)
      onAdded()
      onClose()
    } catch (error) {
      console.error('Error agregando a wishlist:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleCreateAndAdd = async () => {
    if (!newWishlistName.trim()) return

    setIsAdding(true)
    try {
      const newWishlist = await createWishList(newWishlistName.trim(), isPublic)
      if (newWishlist) {
        await addItemToWishList(newWishlist.id, productId, variantId)
        onAdded()
        onClose()
        setShowCreateForm(false)
        setNewWishlistName('')
      }
    } catch (error) {
      console.error('Error creando wishlist:', error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-[#73FFA2]/40 rounded-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-[#73FFA2]">Agregar a Wishlist</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

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
                      className="w-full p-3 text-left bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-[#73FFA2]/50 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{wishlist.name}</span>
                        {wishlist.public && (
                          <span className="text-xs text-[#73FFA2]">🌐</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {wishlist.items.length} producto{wishlist.items.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-2 bg-[#73FFA2] text-gray-900 font-semibold rounded-lg hover:bg-[#66DEDB] transition-colors"
            >
              + Crear nueva wishlist
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Nombre</label>
              <input
                type="text"
                value={newWishlistName}
                onChange={(e) => setNewWishlistName(e.target.value)}
                placeholder="Mi wishlist"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#73FFA2]"
              />
            </div>

            {/* Selector segmentado Pública/Privada */}
            <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 overflow-hidden w-max">
              <button
                onClick={() => setIsPublic(true)}
                className={`px-3 py-2 text-sm ${isPublic ? 'bg-[#73FFA2] text-gray-900' : 'text-gray-300 hover:text-white'}`}
              >
                Pública
              </button>
              <button
                onClick={() => setIsPublic(false)}
                className={`px-3 py-2 text-sm ${!isPublic ? 'bg-[#73FFA2] text-gray-900' : 'text-gray-300 hover:text-white'}`}
              >
                Privada
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewWishlistName('')
                }}
                className="flex-1 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAndAdd}
                disabled={!newWishlistName.trim() || isAdding}
                className="flex-1 py-2 bg-[#73FFA2] text-gray-900 font-semibold rounded-lg hover:bg-[#66DEDB] transition-colors disabled:opacity-50"
              >
                Crear y agregar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

