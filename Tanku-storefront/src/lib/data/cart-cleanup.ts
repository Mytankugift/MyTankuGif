/**
 * Utilidades para limpiar el carrito después de una compra exitosa
 */

export async function clearCartAfterPurchase(cartId: string): Promise<void> {
  try {
    console.log("🧹 [CART-CLEANUP] Limpiando carrito después de compra exitosa...")
    
    // Limpiar carrito en el backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/carts/${cartId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
      },
    })
    
    if (!response.ok) {
      console.warn("⚠️ [CART-CLEANUP] No se pudo eliminar carrito del backend:", response.status)
    }
    
    // Limpiar localStorage si se usa
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cart_id')
      localStorage.removeItem('cart')
      
      // Disparar evento personalizado para notificar a otros componentes
      window.dispatchEvent(new CustomEvent('cartCleared'))
    }
    
    console.log("✅ [CART-CLEANUP] Carrito limpiado exitosamente")
  } catch (error) {
    console.error("⚠️ [CART-CLEANUP] Error limpiando carrito:", error)
    // No fallar por esto, es mejor que la compra se complete
  }
}

export function clearCartLocalStorage(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cart_id')
      localStorage.removeItem('cart')
      
      // Disparar evento personalizado
      window.dispatchEvent(new CustomEvent('cartCleared'))
      
      console.log("✅ [CART-CLEANUP] LocalStorage del carrito limpiado")
    }
  } catch (error) {
    console.error("⚠️ [CART-CLEANUP] Error limpiando localStorage:", error)
  }
}