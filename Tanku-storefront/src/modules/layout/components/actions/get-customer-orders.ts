export interface CustomerOrder {
  id: string
  cart_id: string
  email: string
  payment_method: string
  total_amount: number
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  company?: string
  postal_code: string
  city: string
  country_code: string
  province: string
  phone: string
  created_at: string
  updated_at: string
  status: {
    id: string
    status: "pendiente" | "procesando" | "enviado" | "entregado" | "cancelado"
  }
  shipping_address: {
    id: string
    first_name: string
    last_name: string
    address_1: string
    address_2?: string
    company?: string
    postal_code: string
    city: string
    country_code: string
    province: string
    phone: string
  }
  orderVariants: Array<{
    id: string
    variant_id: string
    quantity: number
    unit_price: number
    original_total: number
    finalPrice: number
    dropiOrderId?: number
    product?: {
      id: string
      title: string
      handle: string
    }
    variant?: {
      id: string
      sku: string
      title: string
      price: number
    }
  }>
}

export const getCustomerOrders = async (customerId: string) => {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    
    console.log(`📋 [GET-CUSTOMER-ORDERS] Obteniendo órdenes para customer: ${customerId}`)
    
    const response = await fetch(
      `${backendUrl}/api/v1/orders?userId=${customerId}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [GET-CUSTOMER-ORDERS] Error: ${response.status} - ${errorText}`)
      throw new Error(`Error al obtener las órdenes: ${response.status}`)
    }

    const data = await response.json()
    console.log(`✅ [GET-CUSTOMER-ORDERS] Órdenes obtenidas: ${data.orders?.length || 0}`)
    
    // Mapear órdenes al formato esperado por CustomerOrder interface
    const mappedOrders = (data.orders || []).map((order: any) => {
      // Mapear status a la estructura esperada: { status: string }
      // El backend devuelve status como string (PENDING, PROCESSING, etc.)
      // Necesitamos convertirlo al formato esperado por el frontend
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
        variant_id: item.variantId || item.variant_id,
        quantity: item.quantity,
        unit_price: item.price,
        original_total: item.price * item.quantity,
        finalPrice: item.finalPrice || item.final_price || item.price,
        dropiOrderId: item.dropiOrderId,
        product: item.product,
        variant: item.variant,
      }));

      return {
        id: order.id,
        cart_id: order.metadata?.cart_id || '',
        email: order.email,
        payment_method: order.paymentMethod || 'cash_on_delivery',
        total_amount: order.total || 0,
        first_name: order.address?.firstName || '',
        last_name: order.address?.lastName || '',
        address_1: order.address?.address1 || '',
        address_2: order.address?.detail || '',
        company: '',
        postal_code: order.address?.postalCode || '',
        city: order.address?.city || '',
        country_code: order.address?.country || 'CO',
        province: order.address?.state || '',
        phone: order.address?.phone || '',
        created_at: order.createdAt || new Date().toISOString(),
        updated_at: order.updatedAt || new Date().toISOString(),
        status: statusObj,
        shipping_address: order.address
          ? {
              id: order.address.id || order.id,
              first_name: order.address.firstName,
              last_name: order.address.lastName,
              address_1: order.address.address1,
              address_2: order.address.detail || '',
              company: '',
              postal_code: order.address.postalCode,
              city: order.address.city,
              country_code: order.address.country,
              province: order.address.state,
              phone: order.address.phone,
            }
          : {
              id: '',
              first_name: '',
              last_name: '',
              address_1: '',
              address_2: '',
              company: '',
              postal_code: '',
              city: '',
              country_code: 'CO',
              province: '',
              phone: '',
            },
        orderVariants: orderVariants,
        // Campos adicionales para compatibilidad
        dropi_order_id: order.dropiOrderId || order.metadata?.dropi_order_id,
        shipping_total: order.shippingTotal || 0,
      };
    });
    
    return mappedOrders
  } catch (error) {
    console.error("❌ [GET-CUSTOMER-ORDERS] Error:", error)
    throw error
  }
}
