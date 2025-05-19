import { retrieveCustomer } from "@lib/data/customer"

export const getListStoreOrders = async () => {
  try {
    // Obtener información del cliente
    const customer = await retrieveCustomer().catch(() => null)
    
    if (!customer || !customer.id) {
      console.log("No se pudo obtener la información del cliente o no está autenticado")
      return []
    }
    
    console.log("Customer ID:", customer.id)
    
    // Realizar la petición al backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/account/order?customerId=${customer.id}`,
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
      console.error(`Error en la respuesta: ${response.status} ${response.statusText}`)
      return []
    }
    
    const result = await response.json()
    console.log("Respuesta del servidor:", result)
    
    // Verificar si la respuesta contiene órdenes
    if (!result.orders) {
      console.log("La respuesta no contiene órdenes")
      return []
    }
    
    return result.orders
  } catch (error) {
    console.error("Error al obtener las órdenes:", error)
    return []
  }
}