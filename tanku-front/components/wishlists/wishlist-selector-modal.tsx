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
        className="w-full max-w-md mx-4 overflow-hidden flex flex-col relative"
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
    </div>
  )
}

