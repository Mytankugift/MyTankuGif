import { retrieveCustomer } from "@lib/data/customer"

export const getListStoreOrders = async () => {
  try {
    // Obtener información del cliente
    const customer = await retrieveCustomer().catch(() => null)
    
    if (!customer || !customer.id) {
      console.log("No se pudo obtener la información del cliente o no está autenticado")
      return []
    }
    
    console.log("📋 [GET-ORDERS] Customer ID:", customer.id)
    
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    
    // Realizar la petición al nuevo backend
    const response = await fetch(
      `${backendUrl}/api/v1/orders?userId=${customer.id}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    
    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      console.error(`❌ [GET-ORDERS] Error en la respuesta: ${response.status} ${response.statusText}`)
      return []
    }
    
    const result = await response.json()
    console.log("✅ [GET-ORDERS] Respuesta del servidor:", {
      success: result.success,
      ordersCount: result.orders?.length || 0,
      total: result.total,
    })
    
    // Verificar si la respuesta contiene órdenes
    if (!result.orders || !Array.isArray(result.orders)) {
      console.log("⚠️ [GET-ORDERS] La respuesta no contiene órdenes o no es un array")
      return []
    }
    
    // Mapear órdenes al formato esperado por el frontend
    const mappedOrders = (result.orders || []).map((order: any) => {
      // Mapear status a la estructura esperada: { status: string }
      // El backend devuelve status como string (PENDING, PROCESSING, etc.)
      const statusString = order.status || 'PENDING';
      const statusMap: Record<string, string> = {
        'PENDING': 'pendiente',
        'PROCESSING': 'procesando',
        'SHIPPED': 'enviado',
        'DELIVERED': 'entregado',
        'CANCELLED': 'cancelado',
        'pendiente': 'pendiente',
        'procesando': 'procesando',
        'enviado': 'enviado',
        'entregado': 'entregado',
        'cancelado': 'cancelado',
      };
      const normalizedStatus = statusMap[statusString.toUpperCase()] || 'pendiente';
      
      const statusObj = {
        id: order.id,
        status: normalizedStatus as "pendiente" | "procesando" | "enviado" | "entregado" | "cancelado",
      };

      // Mapear items a orderVariants
      const orderVariants = (order.items || []).map((item: any) => ({
        id: item.id,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: item.price,
        original_total: item.price * item.quantity,
      }));

      return {
        id: order.id,
        order_id: `order_${order.id}`, // Formato: order_id
        email: order.email,
        status: statusObj, // Estructura esperada: { id, status }
        payment_status: order.paymentStatus,
        payment_method: order.paymentMethod,
        total: order.total,
        total_amount: order.total, // Alias para compatibilidad
        subtotal: order.subtotal,
        shipping_total: order.shippingTotal,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
        metadata: {
          dropi_order_id: order.dropiOrderId,
        },
        shipping_address: order.address
          ? {
              first_name: order.address.firstName,
              last_name: order.address.lastName,
              phone: order.address.phone,
              address_1: order.address.address1,
              address_2: order.address.detail || null,
              city: order.address.city,
              province: order.address.state,
              postal_code: order.address.postalCode,
              country_code: order.address.country,
            }
          : null,
        items: order.items || [],
        orderVariants: orderVariants, // Para compatibilidad con OrderCustomerTab
        dropi_order_id: order.dropiOrderId || order.metadata?.dropi_order_id,
      };
    });
    
    return mappedOrders
  } catch (error) {
    console.error("❌ [GET-ORDERS] Error al obtener las órdenes:", error)
    return []
  }
}