/**
 * Store del carrito (Zustand)
 * Maneja el estado del carrito de compras
 */

import { create } from 'zustand'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { Cart, CartItem } from '@/types/api'

interface CartState {
  cart: Cart | null
  isLoading: boolean
  error: string | null
  
  // Acciones
  fetchCart: () => Promise<void>
  addItem: (variantId: string, quantity: number, cartId?: string) => Promise<void>
  updateItem: (itemId: string, quantity: number, cartId?: string) => Promise<void>
  removeItem: (itemId: string, cartId?: string) => Promise<void>
  clearCart: () => void
  getCartId: () => string | null
  getItemCount: () => number
}

/**
 * Mapear CartDTO del backend al Cart del frontend
 * Añade propiedades de compatibilidad (productId, price)
 */
function mapCartFromBackend(cartDto: any): Cart {
  return {
    ...cartDto,
    items: cartDto.items?.map((item: any) => ({
      ...item,
      productId: item.product?.id,
      price: item.unitPrice, // Alias para compatibilidad
    })) || [],
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  error: null,

  /**
   * Obtener carrito del usuario autenticado
   */
  fetchCart: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<Cart>(API_ENDPOINTS.CART.GET)
      
      if (response.success && response.data) {
        const mappedCart = mapCartFromBackend(response.data)
        set({ cart: mappedCart, isLoading: false, error: null })
      } else {
        // Si hay error 401, el usuario no está autenticado
        if (response.error?.code === 'UNAUTHORIZED' || response.error?.code === 'HTTP_ERROR') {
          console.warn('[Cart Store] Usuario no autenticado - carrito no disponible')
          set({ cart: null, isLoading: false, error: null })
        } else {
          // Si no hay carrito, no es un error (el usuario puede no tener uno aún)
          set({ cart: null, isLoading: false, error: response.error?.message || null })
        }
      }
    } catch (error: any) {
      console.error('[Cart Store] Error obteniendo carrito:', error)
      
      // Si es error de autenticación, no es un error crítico
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        console.warn('[Cart Store] Usuario no autenticado - carrito no disponible')
        set({ cart: null, isLoading: false, error: null })
      } else {
        set({ 
          cart: null, 
          isLoading: false,
          error: error?.message || 'Error al obtener el carrito'
        })
      }
    }
  },

  /**
   * Agregar item al carrito
   * Si no hay cartId, el backend crea/obtiene el carrito automáticamente
   */
  addItem: async (variantId: string, quantity: number, cartId?: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const currentCartId = cartId || get().cart?.id
      
      const response = await apiClient.post<Cart>(
        API_ENDPOINTS.CART.ADD_ITEM,
        { 
          variantId, 
          quantity,
          ...(currentCartId && { cartId: currentCartId })
        }
      )
      
      if (response.success && response.data) {
        const mappedCart = mapCartFromBackend(response.data)
        set({ cart: mappedCart, isLoading: false })
        
        // Emitir evento para actualizar otros componentes
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cartUpdated'))
        }
      } else {
        throw new Error(response.error?.message || 'Error al agregar item al carrito')
      }
    } catch (error: any) {
      console.error('[Cart Store] Error agregando item:', error)
      set({ 
        isLoading: false,
        error: error?.message || 'Error al agregar item al carrito'
      })
      throw error
    }
  },

  /**
   * Actualizar cantidad de un item
   */
  updateItem: async (itemId: string, quantity: number, cartId?: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const currentCartId = cartId || get().cart?.id
      
      if (!currentCartId) {
        throw new Error('No hay carrito disponible')
      }

      const response = await apiClient.put<Cart>(
        API_ENDPOINTS.CART.UPDATE_ITEM(itemId),
        { 
          quantity,
          cartId: currentCartId
        }
      )
      
      if (response.success && response.data) {
        const mappedCart = mapCartFromBackend(response.data)
        set({ cart: mappedCart, isLoading: false })
        
        // Emitir evento
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cartUpdated'))
        }
      } else {
        throw new Error(response.error?.message || 'Error al actualizar item')
      }
    } catch (error: any) {
      console.error('[Cart Store] Error actualizando item:', error)
      set({ 
        isLoading: false,
        error: error?.message || 'Error al actualizar item'
      })
      throw error
    }
  },

  /**
   * Eliminar item del carrito
   */
  removeItem: async (itemId: string, cartId?: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const currentCartId = cartId || get().cart?.id
      
      if (!currentCartId) {
        throw new Error('No hay carrito disponible')
      }

      // El endpoint DELETE acepta cartId en el body
      const response = await apiClient.request<Cart>(
        API_ENDPOINTS.CART.DELETE_ITEM(itemId),
        {
          method: 'DELETE',
          body: JSON.stringify({ cartId: currentCartId }),
        }
      )
      
      if (response.success && response.data) {
        const mappedCart = mapCartFromBackend(response.data)
        set({ cart: mappedCart, isLoading: false })
        
        // Emitir evento
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cartUpdated'))
        }
      } else {
        throw new Error(response.error?.message || 'Error al eliminar item')
      }
    } catch (error: any) {
      console.error('[Cart Store] Error eliminando item:', error)
      set({ 
        isLoading: false,
        error: error?.message || 'Error al eliminar item'
      })
      throw error
    }
  },

  /**
   * Limpiar carrito (solo del estado local)
   */
  clearCart: () => {
    set({ cart: null, error: null })
  },

  /**
   * Obtener ID del carrito actual
   */
  getCartId: () => {
    return get().cart?.id || null
  },

  /**
   * Obtener cantidad total de items en el carrito
   */
  getItemCount: () => {
    const cart = get().cart
    if (!cart || !cart.items) return 0
    return cart.items.reduce((total, item) => total + item.quantity, 0)
  },
}))

