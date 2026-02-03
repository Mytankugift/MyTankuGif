/**
 * Store del carrito (Zustand)
 * Maneja el estado del carrito de compras
 */

import { create } from 'zustand'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { Cart, CartItem } from '@/types/api'

interface CartState {
  cart: Cart | null // Carrito normal (se mantiene para compatibilidad)
  normalCart: Cart | null // Carrito normal (explícito)
  giftCart: Cart | null // Carrito de regalos
  isLoading: boolean
  error: string | null
  
  // Acciones
  fetchCart: () => Promise<void>
  fetchGiftCart: () => Promise<void>
  fetchBothCarts: () => Promise<void>
  addItem: (variantId: string, quantity: number, cartId?: string) => Promise<void>
  updateItem: (itemId: string, quantity: number, cartId?: string) => Promise<void>
  removeItem: (itemId: string, cartId?: string) => Promise<void>
  removeItems: (itemIds: string[], cartId?: string) => Promise<void>
  clearCart: () => void
  getCartId: () => string | null
  getItemCount: () => number
  setCart: (cart: Cart | null) => void
  setNormalCart: (cart: Cart | null) => void
  setGiftCart: (cart: Cart | null) => void
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
    // Asegurar que isGiftCart y giftRecipientId se preserven
    isGiftCart: cartDto.isGiftCart ?? false,
    giftRecipientId: cartDto.giftRecipientId ?? null,
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null, // Mantener para compatibilidad
  normalCart: null, // Carrito normal explícito
  giftCart: null, // Carrito de regalos
  isLoading: false,
  error: null,

  /**
   * Obtener o crear carrito (funciona sin autenticación - carrito guest)
   */
  fetchCart: async () => {
    set({ isLoading: true, error: null })
    try {
      // Guardar el carrito de regalos actual antes de buscar el normal
      // Esto permite que ambos carritos coexistan
      const currentCart = get().cart
      const currentGiftCart = currentCart?.isGiftCart ? currentCart : null
      
      const response = await apiClient.get<Cart>(API_ENDPOINTS.CART.GET)
      
      if (response.success) {
        // El backend ahora siempre retorna un carrito (guest si no hay usuario, user si está autenticado)
        // Si hay usuario autenticado, el backend automáticamente asocia carritos guest al usuario
        if (response.data) {
          const mappedCart = mapCartFromBackend(response.data)
          
          // El endpoint GET /cart solo retorna carritos normales (isGiftCart: false)
          if (!mappedCart.isGiftCart) {
            // Es un carrito normal, actualizar normalCart y cart (para compatibilidad)
            set({ 
              cart: mappedCart, 
              normalCart: mappedCart,
              isLoading: false, 
              error: null 
            })
          } else {
            // Si por alguna razón el backend retornó un carrito de regalos (no debería pasar)
            set({ 
              cart: mappedCart, 
              giftCart: mappedCart,
              isLoading: false, 
              error: null 
            })
          }
          
          // Guardar cartId en localStorage para persistir carrito guest
          if (!mappedCart.userId && typeof window !== 'undefined') {
            localStorage.setItem('guest-cart-id', mappedCart.id)
          } else if (mappedCart.userId && typeof window !== 'undefined') {
            // Si el carrito tiene usuario, limpiar el guest-cart-id (ya está asociado)
            localStorage.removeItem('guest-cart-id')
            console.log('[CART] Carrito asociado al usuario, guest-cart-id limpiado')
          }
        } else {
          // Si no hay carrito normal, mantener el de regalos si existe
          if (currentGiftCart) {
            // Mantener el carrito de regalos en el store
            set({ 
              cart: currentGiftCart, 
              giftCart: currentGiftCart,
              normalCart: null,
              isLoading: false, 
              error: null 
            })
          } else {
            // Si no hay data pero success es true, el backend puede haber retornado null
            // En este caso, el carrito guest será creado cuando se agregue el primer item
            set({ 
              cart: null, 
              normalCart: null,
              isLoading: false, 
              error: null 
            })
          }
        }
      } else {
        // Si hay error 401, el endpoint debería funcionar sin auth ahora
        // Pero si hay otro error, mostrarlo
        if (response.error?.code === 'UNAUTHORIZED' || response.error?.code === 'HTTP_ERROR') {
          console.warn('[Cart Store] Error obteniendo carrito:', response.error?.message)
          // Intentar crear carrito guest mediante POST
          try {
            const createResponse = await apiClient.post<Cart>(API_ENDPOINTS.CART.CREATE, {})
            if (createResponse.success && createResponse.data) {
              const mappedCart = mapCartFromBackend(createResponse.data)
              set({ cart: mappedCart, isLoading: false, error: null })
              if (typeof window !== 'undefined') {
                localStorage.setItem('guest-cart-id', mappedCart.id)
              }
            } else {
              set({ cart: null, isLoading: false, error: null })
            }
          } catch {
            set({ cart: null, isLoading: false, error: null })
          }
        } else {
          set({ cart: null, isLoading: false, error: response.error?.message || null })
        }
      }
    } catch (error: any) {
      console.error('[Cart Store] Error obteniendo carrito:', error)
      
      // Si es error de autenticación o red, intentar crear carrito guest
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized') || error?.message?.includes('Failed to fetch')) {
        console.warn('[Cart Store] Error de conexión o autenticación. Se creará carrito guest al agregar primer item.')
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
      const currentCart = get().cart
      
      // Si el carrito actual es de regalos y no se pasó un cartId específico,
      // no pasar cartId para que el backend cree un nuevo carrito normal
      let finalCartId = cartId
      if (!finalCartId && currentCart && currentCart.isGiftCart) {
        // No pasar cartId - el backend creará un nuevo carrito normal
        finalCartId = undefined
      } else if (!finalCartId) {
        finalCartId = currentCart?.id
      }
      
      const response = await apiClient.post<Cart>(
        API_ENDPOINTS.CART.ADD_ITEM,
        { 
          variantId, 
          quantity,
          // Solo pasar cartId si no es un carrito de regalos
          ...(finalCartId && { cartId: finalCartId })
        }
      )
      
      if (response.success && response.data) {
        const mappedCart = mapCartFromBackend(response.data)
        // Asegurar que el carrito normal no tenga isGiftCart
        if (mappedCart.isGiftCart) {
          mappedCart.isGiftCart = false
          mappedCart.giftRecipientId = null
        }
        set({ 
          cart: mappedCart, 
          normalCart: mappedCart,
          isLoading: false 
        })
        
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
      // Buscar el carrito que contiene este item
      // Primero intentar con el cartId proporcionado, luego buscar en ambos carritos
      let currentCartId = cartId
      
      if (!currentCartId) {
        const state = get()
        // Buscar en el carrito normal
        if (state.normalCart?.items?.some(item => item.id === itemId)) {
          currentCartId = state.normalCart.id
        }
        // Buscar en el carrito de regalos
        else if (state.giftCart?.items?.some(item => item.id === itemId)) {
          currentCartId = state.giftCart.id
        }
        // Si no se encuentra, usar el cart actual (compatibilidad)
        else {
          currentCartId = state.cart?.id
        }
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
        // Determinar si es normal o de regalos
        if (mappedCart.isGiftCart) {
          set({ 
            cart: mappedCart, 
            giftCart: mappedCart,
            isLoading: false 
          })
        } else {
          set({ 
            cart: mappedCart, 
            normalCart: mappedCart,
            isLoading: false 
          })
        }
        
        // Emitir evento
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cartUpdated'))
        }
      } else {
        // Si el error es NOT_FOUND, el item ya no existe, simplemente recargar el carrito
        if (response.error?.code === 'NOT_FOUND') {
          console.warn('[Cart Store] Item ya no existe, recargando carrito...')
          await get().fetchBothCarts()
          set({ isLoading: false })
          // Emitir evento para actualizar UI
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cartUpdated'))
          }
          return
        }
        throw new Error(response.error?.message || 'Error al actualizar item')
      }
    } catch (error: any) {
      // Si el error es NOT_FOUND, el item ya no existe, simplemente recargar el carrito
      if (error?.message?.includes('NOT_FOUND') || error?.message?.includes('no encontrado')) {
        console.warn('[Cart Store] Item ya no existe, recargando carrito...')
        await get().fetchBothCarts()
        set({ isLoading: false })
        // Emitir evento para actualizar UI
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cartUpdated'))
        }
        return
      }
      
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
      // Buscar el carrito que contiene este item
      // Primero intentar con el cartId proporcionado, luego buscar en ambos carritos
      let currentCartId = cartId
      
      if (!currentCartId) {
        const state = get()
        // Buscar en el carrito normal
        if (state.normalCart?.items?.some(item => item.id === itemId)) {
          currentCartId = state.normalCart.id
        }
        // Buscar en el carrito de regalos
        else if (state.giftCart?.items?.some(item => item.id === itemId)) {
          currentCartId = state.giftCart.id
        }
        // Si no se encuentra, usar el cart actual (compatibilidad)
        else {
          currentCartId = state.cart?.id
        }
      }
      
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
        // Determinar si es normal o de regalos
        if (mappedCart.isGiftCart) {
          set({ 
            cart: mappedCart, 
            giftCart: mappedCart,
            isLoading: false 
          })
        } else {
          set({ 
            cart: mappedCart, 
            normalCart: mappedCart,
            isLoading: false 
          })
        }
        
        // Emitir evento
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cartUpdated'))
        }
      } else {
        // Si el error es NOT_FOUND, el item ya no existe, simplemente recargar el carrito
        if (response.error?.code === 'NOT_FOUND') {
          console.warn('[Cart Store] Item ya no existe, recargando carrito...')
          await get().fetchBothCarts()
          set({ isLoading: false })
          // Emitir evento para actualizar UI
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cartUpdated'))
          }
          return
        }
        throw new Error(response.error?.message || 'Error al eliminar item')
      }
    } catch (error: any) {
      // Si el error es NOT_FOUND, el item ya no existe, simplemente recargar el carrito
      if (error?.message?.includes('NOT_FOUND') || error?.message?.includes('no encontrado')) {
        console.warn('[Cart Store] Item ya no existe, recargando carrito...')
        await get().fetchBothCarts()
        set({ isLoading: false })
        // Emitir evento para actualizar UI
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cartUpdated'))
        }
        return
      }
      
      console.error('[Cart Store] Error eliminando item:', error)
      set({ 
        isLoading: false,
        error: error?.message || 'Error al eliminar item'
      })
      throw error
    }
  },

  /**
   * Eliminar múltiples items del carrito
   */
  removeItems: async (itemIds: string[], cartId?: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const currentCartId = cartId || get().cart?.id
      
      if (!currentCartId) {
        throw new Error('No hay carrito disponible')
      }

      // Eliminar items uno por uno
      // Si un item no existe (NOT_FOUND), continuar con los demás
      for (const itemId of itemIds) {
        try {
          const response = await apiClient.request<Cart>(
            API_ENDPOINTS.CART.DELETE_ITEM(itemId),
            {
              method: 'DELETE',
              body: JSON.stringify({ cartId: currentCartId }),
            }
          )
          
          // Si el error es NOT_FOUND, el item ya no existe, continuar con el siguiente
          if (!response.success && response.error?.code !== 'NOT_FOUND') {
            throw new Error(response.error?.message || 'Error al eliminar items')
          }
        } catch (error: any) {
          // Si el error es NOT_FOUND, continuar con el siguiente item
          if (error?.message?.includes('NOT_FOUND') || error?.message?.includes('no encontrado')) {
            console.warn(`[Cart Store] Item ${itemId} ya no existe, continuando...`)
            continue
          }
          throw error
        }
      }
      
      // Recargar ambos carritos después de eliminar todos los items
      await get().fetchBothCarts()
      
      // Emitir evento
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cartUpdated'))
      }
      
      set({ isLoading: false })
    } catch (error: any) {
      console.error('[Cart Store] Error eliminando items:', error)
      set({ 
        isLoading: false,
        error: error?.message || 'Error al eliminar items'
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

  /**
   * Establecer carrito manualmente (útil para carrito de regalos)
   */
  setCart: (cart: Cart | null) => {
    if (cart?.isGiftCart) {
      set({ cart, giftCart: cart, error: null })
    } else {
      set({ cart, normalCart: cart, error: null })
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cartUpdated'))
    }
  },

  /**
   * Establecer carrito normal manualmente
   */
  setNormalCart: (cart: Cart | null) => {
    set({ normalCart: cart, cart: cart, error: null })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cartUpdated'))
    }
  },

  /**
   * Establecer carrito de regalos manualmente
   */
  setGiftCart: (cart: Cart | null) => {
    set({ giftCart: cart, error: null })
    // NO sobrescribir cart si es de regalos, para mantener compatibilidad
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cartUpdated'))
    }
  },

  /**
   * Obtener carrito de regalos del usuario (o crear uno vacío si no existe)
   */
  fetchGiftCart: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<Cart>(API_ENDPOINTS.CART.GET_GIFT)
      
      if (response.success) {
        if (response.data) {
          const mappedCart = mapCartFromBackend(response.data)
          set({ 
            giftCart: mappedCart,
            isLoading: false, 
            error: null 
          })
        } else {
          set({ 
            giftCart: null,
            isLoading: false, 
            error: null 
          })
        }
      } else {
        set({ 
          giftCart: null,
          isLoading: false, 
          error: response.error?.message || null 
        })
      }
    } catch (error: any) {
      console.error('[Cart Store] Error obteniendo carrito de regalos:', error)
      set({ 
        giftCart: null,
        isLoading: false,
        error: error?.message || 'Error al obtener el carrito de regalos'
      })
    }
  },

  /**
   * Obtener ambos carritos (normal y de regalos) simultáneamente
   */
  fetchBothCarts: async () => {
    set({ isLoading: true, error: null })
    try {
      // Buscar ambos carritos en paralelo
      const [normalResponse, giftResponse] = await Promise.all([
        apiClient.get<Cart>(API_ENDPOINTS.CART.GET),
        apiClient.get<Cart>(API_ENDPOINTS.CART.GET_GIFT)
      ])
      
      // Procesar carrito normal
      let normalCart: Cart | null = null
      if (normalResponse.success && normalResponse.data) {
        normalCart = mapCartFromBackend(normalResponse.data)
        if (normalCart.isGiftCart) {
          // Si el backend retornó un carrito de regalos por error, ignorarlo
          normalCart = null
        }
      }
      
      // Procesar carrito de regalos
      let giftCart: Cart | null = null
      if (giftResponse.success && giftResponse.data) {
        giftCart = mapCartFromBackend(giftResponse.data)
        if (!giftCart.isGiftCart) {
          // Si el backend retornó un carrito normal por error, ignorarlo
          giftCart = null
        }
      }
      
      // Actualizar el store con ambos carritos
      // El campo 'cart' se mantiene con el normal para compatibilidad
      set({ 
        cart: normalCart, // Compatibilidad
        normalCart,
        giftCart,
        isLoading: false, 
        error: null 
      })
      
      // Guardar cartId en localStorage para persistir carrito guest
      if (normalCart && !normalCart.userId && typeof window !== 'undefined') {
        localStorage.setItem('guest-cart-id', normalCart.id)
      } else if (normalCart?.userId && typeof window !== 'undefined') {
        localStorage.removeItem('guest-cart-id')
        console.log('[CART] Carrito asociado al usuario, guest-cart-id limpiado')
      }
      
      // Emitir evento para actualizar otros componentes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cartUpdated'))
      }
    } catch (error: any) {
      console.error('[Cart Store] Error obteniendo ambos carritos:', error)
      set({ 
        isLoading: false,
        error: error?.message || 'Error al obtener los carritos'
      })
    }
  },
}))

// Configurar listener para recargar carrito después de autenticación
// Esto permite asociar el carrito guest al usuario automáticamente
if (typeof window !== 'undefined') {
  // Listener para el evento userAuthenticated
  window.addEventListener('userAuthenticated', () => {
    console.log('[CART] Usuario autenticado, recargando carrito para asociar carrito guest...')
    // Esperar un momento para que el token esté disponible
    setTimeout(() => {
      useCartStore.getState().fetchCart().catch((error) => {
        console.error('[CART] Error recargando carrito después de autenticación:', error)
      })
    }, 500)
  })
}

