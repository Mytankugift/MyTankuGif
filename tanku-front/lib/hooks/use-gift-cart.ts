/**
 * Hook para manejar carrito de regalos
 */

'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCartStore } from '@/lib/stores/cart-store'
import type { Cart } from '@/types/api'

interface GiftRecipientEligibility {
  canReceive: boolean
  hasAddress: boolean
  allowGiftShipping: boolean
  useMainAddressForGifts: boolean
  reason?: string
  canSendGift?: boolean
  sendGiftReason?: string
}

export function useGiftCart() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()
  const { cart, setCart, removeItems, fetchCart } = useCartStore()

  /**
   * Validar si un usuario puede recibir regalos
   */
  const validateRecipient = async (recipientId: string): Promise<GiftRecipientEligibility> => {
    try {
      const response = await apiClient.get<GiftRecipientEligibility>(
        API_ENDPOINTS.GIFTS.RECIPIENT_ELIGIBILITY(recipientId)
      )

      if (!response.success || !response.data) {
        throw new Error('Error al validar destinatario')
      }

      return response.data
    } catch (error: any) {
      console.error('Error validando destinatario:', error)
      throw error
    }
  }

  /**
   * Agregar item al carrito de regalos
   */
  const addToGiftCart = async (
    variantId: string,
    recipientId: string,
    quantity: number = 1,
    cartId?: string | null
  ): Promise<void> => {
    if (!user?.id) {
      throw new Error('Debes estar autenticado para enviar regalos')
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Validar que el destinatario puede recibir regalos
      const eligibility = await validateRecipient(recipientId)

      if (!eligibility.canReceive) {
        throw new Error(eligibility.reason || 'Este usuario no puede recibir regalos')
      }

      if (eligibility.canSendGift === false) {
        throw new Error(eligibility.sendGiftReason || 'No puedes enviar regalos a este usuario')
      }

      // 2. Verificar si el carrito actual es de regalos y tiene otro destinatario
      // Si tiene items y otro destinatario, lanzar error para que el frontend muestre el modal
      // NO hacer el POST al backend si hay otro destinatario y el carrito tiene items
      if (cart && cart.isGiftCart && cart.giftRecipientId && cart.giftRecipientId !== recipientId) {
        const hasItems = cart.items && cart.items.length > 0
        if (hasItems) {
          // Crear un error especial que no se loguee como error en la consola
          const differentRecipientError = new Error('DIFFERENT_RECIPIENT')
          // Marcar como error esperado para que no se muestre en consola
          ;(differentRecipientError as any).isExpected = true
          throw differentRecipientError
        }
        // Si el carrito está vacío, permitir continuar (el backend cambiará el destinatario)
      }

      // 3. Agregar item al carrito de regalos
      // Si el carrito actual es de regalos y tiene el mismo destinatario, usar su ID
      // Si el carrito está vacío (sin items) o tiene otro destinatario, pasar el cartId para que el backend lo maneje
      // El backend eliminará los items existentes y cambiará el giftRecipientId si es necesario
      const currentCartId = cart && cart.isGiftCart && cart.giftRecipientId === recipientId && cart.items && cart.items.length > 0
        ? cart.id 
        : (cart && cart.isGiftCart)
          ? cart.id // Pasar cartId para que el backend elimine items y cambie destinatario si es necesario
          : cartId || null

      const response = await apiClient.post<Cart | { cart: Cart }>(API_ENDPOINTS.CART.ADD_GIFT_ITEM, {
        cart_id: currentCartId,
        variant_id: variantId,
        quantity,
        recipient_id: recipientId,
      })

      if (!response.success) {
        // Verificar si el error es DIFFERENT_RECIPIENT
        const errorCode = response.error?.code || response.error?.message
        if (errorCode === 'DIFFERENT_RECIPIENT' || response.error?.message === 'DIFFERENT_RECIPIENT') {
          const differentRecipientError = new Error('DIFFERENT_RECIPIENT')
          ;(differentRecipientError as any).isExpected = true
          throw differentRecipientError
        }
        throw new Error(response.error?.message || 'Error al agregar item al carrito de regalos')
      }

      if (!response.data) {
        throw new Error('Error al agregar item al carrito de regalos')
      }

      // 4. Actualizar el carrito en el store
      // El backend retorna el carrito en response.data.cart o response.data
      const cartData = ('cart' in response.data ? response.data.cart : response.data) as Cart
      if (cartData) {
        // Mapear el carrito del backend al formato del frontend
        const mappedCart: Cart = {
          ...cartData,
          items: cartData.items?.map((item: any) => ({
            ...item,
            productId: item.product?.id || item.variant?.product?.id,
            price: item.unitPrice || item.price,
          })) || [],
          isGiftCart: true,
          giftRecipientId: recipientId,
        }
        console.log('[useGiftCart] Carrito actualizado:', mappedCart) // Debug
        // Actualizar el carrito de regalos en el store
        useCartStore.getState().setGiftCart(mappedCart)
        // También actualizar cart para compatibilidad
        useCartStore.getState().setCart(mappedCart)
        
        // Emitir evento para actualizar otros componentes
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cartUpdated'))
        }
      } else {
        console.error('[useGiftCart] No se recibió carrito en la respuesta:', response.data)
        throw new Error('No se recibió carrito en la respuesta del servidor')
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Error al agregar item al carrito de regalos'
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Obtener carrito de regalos para un destinatario
   */
  const getGiftCart = async (recipientId: string) => {
    if (!user?.id) {
      throw new Error('Debes estar autenticado')
    }

    setIsLoading(true)
    setError(null)

    try {
      // El backend maneja esto internamente, pero podemos validar primero
      const eligibility = await validateRecipient(recipientId)

      if (!eligibility.canReceive) {
        throw new Error(eligibility.reason || 'Este usuario no puede recibir regalos')
      }

      // El carrito se obtiene automáticamente cuando agregamos items
      return eligibility
    } catch (error: any) {
      const errorMessage = error.message || 'Error al obtener carrito de regalos'
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Limpiar carrito de regalos
   */
  const clearGiftCart = async () => {
    if (!user?.id) {
      throw new Error('Debes estar autenticado')
    }

    setIsLoading(true)
    setError(null)

    try {
      const currentCart = cart
      
      // Si hay un carrito de regalos, eliminar todos sus items
      if (currentCart && currentCart.isGiftCart && currentCart.items && currentCart.items.length > 0) {
        const itemIds = currentCart.items.map(item => item.id)
        
        if (itemIds.length > 0) {
          // Eliminar todos los items del carrito de regalos
          await removeItems(itemIds, currentCart.id)
        }
      }
      
      // Nota: El giftRecipientId se reseteará automáticamente cuando se agregue un nuevo item
      // No necesitamos resetearlo explícitamente aquí
      
      // Limpiar el estado local completamente
      useCartStore.getState().setGiftCart(null)
      useCartStore.getState().setCart(null)
      
      // Recargar ambos carritos para asegurar que estén actualizados
      await useCartStore.getState().fetchBothCarts()
      
      // Verificar que el carrito de regalos esté limpio
      const { giftCart: reloadedGiftCart } = useCartStore.getState()
      if (reloadedGiftCart && reloadedGiftCart.giftRecipientId) {
        // Si todavía tiene giftRecipientId, forzar la limpieza del estado
        useCartStore.getState().setGiftCart({
          ...reloadedGiftCart,
          giftRecipientId: null,
        })
      }
    } catch (error: any) {
      console.error('Error limpiando carrito de regalos:', error)
      setError(error.message || 'Error al limpiar carrito de regalos')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    addToGiftCart,
    getGiftCart,
    clearGiftCart,
    validateRecipient,
    isLoading,
    error,
  }
}

