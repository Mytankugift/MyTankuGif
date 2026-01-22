'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { ProductDTO, ProductVariantDTO } from '@/types/api'

type ReceiverType = 'tanku' | 'external'

interface ReceiverData {
  type: ReceiverType
  user?: {
    id: string
  }
  externalData?: {
    email?: string
    instagram?: string
    phone?: string
    name?: string
  }
}

interface ProductSelectorProps {
  receiver: ReceiverData | null
  product: ProductDTO | null
  variantId: string | null
  onSelect: (product: ProductDTO, variantId: string | null) => void
}

export function ProductSelector({
  receiver,
  product,
  variantId,
  onSelect,
}: ProductSelectorProps) {
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWishlist, setSelectedWishlist] = useState<string | null>(null)
  const [wishlists, setWishlists] = useState<any[]>([])

  // Cargar productos según el tipo de receptor
  useEffect(() => {
    const loadProducts = async () => {
      if (!receiver) {
        setProducts([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        if (receiver.type === 'tanku' && receiver.user?.id) {
          // Intentar cargar wishlists del usuario receptor
          try {
            const wishlistsResponse = await apiClient.get<any[]>(
              API_ENDPOINTS.WISHLISTS.BY_USER(receiver.user.id)
            )
            
            if (wishlistsResponse.success && wishlistsResponse.data && wishlistsResponse.data.length > 0) {
              setWishlists(wishlistsResponse.data)
              
              // Si no hay selectedWishlist, usar la primera
              const targetWishlistId = selectedWishlist || wishlistsResponse.data[0]?.id
              if (targetWishlistId) {
                // Si el selectedWishlist cambió, actualizarlo
                if (!selectedWishlist) {
                  setSelectedWishlist(targetWishlistId)
                }
                
                const targetWishlist = wishlistsResponse.data.find((w: any) => w.id === targetWishlistId)
                
                if (targetWishlist && targetWishlist.items && targetWishlist.items.length > 0) {
                  // Extraer productos de los items de la wishlist y convertir a ProductDTO
                  const wishlistProducts: ProductDTO[] = targetWishlist.items
                    .map((item: any) => {
                      const prod = item.product
                      if (!prod) return null
                      
                      // Convertir a ProductDTO completo
                      // Asegurarse de que tenga todas las propiedades necesarias
                      const productDTO: ProductDTO = {
                        id: prod.id,
                        title: prod.title,
                        handle: prod.handle,
                        description: prod.description || undefined,
                        images: prod.images && Array.isArray(prod.images) && prod.images.length > 0 
                          ? prod.images 
                          : (prod.thumbnail ? [prod.thumbnail] : []),
                        category: prod.category || undefined,
                        variants: prod.variants && Array.isArray(prod.variants) 
                            ? prod.variants.map((v: any) => ({
                                id: v.id,
                                sku: v.sku,
                                title: v.title,
                                tankuPrice: v.tankuPrice || 0,
                                stock: v.stock || 0,
                                active: v.active !== false,
                            }))
                          : [],
                        active: prod.active !== false,
                      }
                      return productDTO
                    })
                    .filter((p: ProductDTO | null) => p !== null) as ProductDTO[]
                  
                  if (wishlistProducts.length > 0) {
                    setProducts(wishlistProducts)
                    setIsLoading(false)
                    return
                  }
                }
              }
            }
          } catch (wishlistError: any) {
            // Si falla (usuario no tiene wishlists o sin acceso), usar top 50
            console.warn('No se pudieron cargar wishlists del receptor:', wishlistError?.message)
            setWishlists([])
          }
          
          // Si no hay wishlists o falló, mostrar top 50 productos
          const response = await apiClient.get<ProductDTO[]>(API_ENDPOINTS.PRODUCTS.TOP)
          if (response.success && response.data) {
            setProducts(response.data)
          }
        } else {
          // Usuario externo: mostrar top 50 productos
          const response = await apiClient.get<ProductDTO[]>(API_ENDPOINTS.PRODUCTS.TOP)
          if (response.success && response.data) {
            setProducts(response.data)
          }
        }
      } catch (error: any) {
        console.error('Error cargando productos:', error)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [receiver, selectedWishlist])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getProductPrice = (prod: ProductDTO) => {
    if (prod.variants && prod.variants.length > 0) {
      const minVariant = prod.variants.reduce((min, v) => {
        const price = v.tankuPrice || 0
        const minPrice = min.tankuPrice || 0
        return price < minPrice && price > 0 ? v : min
      })
      // Usar tankuPrice directamente (ya calculado en sync)
      return minVariant.tankuPrice || 0
    }
    return 0
  }

  const handleSelectProduct = (prod: ProductDTO, selectedVariantId?: string) => {
    // Si tiene variantes y no se seleccionó una, usar la primera
    if (prod.variants && prod.variants.length > 0) {
      const variantIdToUse = selectedVariantId || prod.variants[0].id
      onSelect(prod, variantIdToUse)
    } else {
      onSelect(prod, null)
    }
  }

  if (!receiver) {
    return (
      <div className="text-center py-12 text-gray-400">
        Por favor selecciona un receptor primero
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Selecciona un producto</h3>
        {receiver.type === 'tanku' ? (
          <p className="text-sm text-gray-400">
            Productos de las wishlists {receiver.user ? 'de ' + receiver.user.id : ''}
          </p>
        ) : (
          <p className="text-sm text-gray-400">
            Los mejores productos para regalar
          </p>
        )}
      </div>

      {/* Selector de wishlist (solo para usuarios Tanku) */}
      {receiver.type === 'tanku' && wishlists.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Seleccionar wishlist
          </label>
          <select
            value={selectedWishlist || wishlists[0]?.id || ''}
            onChange={(e) => setSelectedWishlist(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
          >
            {wishlists.map((wishlist: any) => (
              <option key={wishlist.id} value={wishlist.id}>
                {wishlist.name} {wishlist.public ? '(Pública)' : '(Privada)'} -{' '}
                {wishlist.items?.length || 0} productos
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Grid de productos */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando productos...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {receiver.type === 'tanku'
            ? 'El usuario no tiene productos en sus wishlists'
            : 'No hay productos disponibles'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
          {products.map((prod) => {
            const isSelected = product?.id === prod.id
            const productPrice = getProductPrice(prod)

            return (
              <button
                key={prod.id}
                onClick={() => handleSelectProduct(prod)}
                className={`text-left p-3 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-[#66DEDB]/20 border-2 border-[#66DEDB]'
                    : 'bg-gray-700/50 hover:bg-gray-700 border-2 border-transparent'
                }`}
              >
                {prod.images && prod.images.length > 0 && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2">
                    <Image
                      src={prod.images[0]}
                      alt={prod.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <p className="text-sm font-medium text-white mb-1 line-clamp-2">
                  {prod.title}
                </p>
                {prod.variants && prod.variants.length > 0 && (
                  <p className="text-xs text-gray-400 mb-1">
                    {prod.variants.length} variante{prod.variants.length > 1 ? 's' : ''}
                  </p>
                )}
                <p className="text-sm font-semibold text-[#66DEDB]">
                  {formatPrice(productPrice)}
                </p>
                {isSelected && (
                  <p className="text-xs text-[#73FFA2] mt-1">✓ Seleccionado</p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

