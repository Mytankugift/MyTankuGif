"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Eye, MagnifyingGlass, Plus, Minus, XMark } from "@medusajs/icons"
import { getListStoreOrders } from "@modules/account/actionts/get-list-orders-customer"
import { Dialog } from "@headlessui/react"

// Interfaces para los tipos de datos
interface OrderVariant {
  id: string
  variant_id: string
  quantity: number
  unit_price: number
  original_total: number
}

interface OrderDetail {
  id: string
  order_number: string
  date: string
  status: string
  total: number
  items: number
  email: string
  payment_method: string
  first_name: string
  last_name: string
  address: string
  city: string
  province: string
  variants: OrderVariant[]
  raw_data: any // Para almacenar los datos originales
}

interface Order {
  id: string
  order_number: string
  date: string
  status: string
  total: number
  items: number
}

const statusOptions = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pendiente" },
  { value: "processing", label: "Procesando" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregado" },
  { value: "paid", label: "Pagado" },
  { value: "cancelled", label: "Cancelado" },
]

const TableOrders = () => {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  
  // Estado para el modal de detalles
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  
  // Variable para almacenar los datos originales
  const [rawOrdersData, setRawOrdersData] = useState<any[]>([])

  // Función para formatear el precio en pesos colombianos
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price)
  }

  // Función para obtener el color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "shipped":
        return "bg-purple-100 text-purple-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "paid":
        return "bg-emerald-100 text-emerald-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Función para obtener el texto del estado en español
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "processing":
        return "Procesando"
      case "shipped":
        return "Enviado"
      case "delivered":
        return "Entregado"
      case "cancelled":
        return "Cancelado"
      case "paid":
        return "Pagado - Para enviar"
      default:
        return status
    }
  }

  // Efecto para filtrar órdenes cuando cambia el estado seleccionado o la búsqueda
  useEffect(() => {
    let result = orders
    
    // Filtrar por estado
    if (selectedStatus !== "all") {
      result = result.filter((order) => order.status === selectedStatus)
    }

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (order) =>
          order.order_number.toLowerCase().includes(query) ||
          formatPrice(order.total).toLowerCase().includes(query)
      )
    }

    setFilteredOrders(result)
  }, [selectedStatus, searchQuery, orders])

  // Función para ver los detalles de una orden
  const viewOrderDetails = (orderId: string) => {
    // Buscar la orden formateada en los datos de la tabla
    const orderData = orders.find(order => order.id === orderId);
    if (!orderData) return;
    
    // Buscar los datos originales completos en la estructura correcta
    const rawOrder = rawOrdersData.find(order => order.order_tanku?.id === orderId);
    if (!rawOrder) return;
    
    const rawOrderData = rawOrder.order_tanku || {};
    
    // Extraer las variantes de productos
    const variants = rawOrderData.variant && Array.isArray(rawOrderData.variant[0])
      ? rawOrderData.variant[0].map((variant: any) => ({
          id: variant.id,
          variant_id: variant.variant_id,
          quantity: variant.quantity,
          unit_price: variant.unit_price,
          original_total: variant.original_total
        }))
      : [];
    
    // Crear el objeto de detalle de orden
    const orderDetail: OrderDetail = {
      id: orderData.id,
      order_number: orderData.order_number,
      date: orderData.date,
      status: orderData.status,
      total: orderData.total,
      items: orderData.items,
      email: rawOrderData.email || "",
      payment_method: rawOrderData.payment_method || "",
      first_name: rawOrderData.first_name || "",
      last_name: rawOrderData.last_name || "",
      address: `${rawOrderData.address_1 || ""} ${rawOrderData.address_2 || ""}`.trim(),
      city: rawOrderData.city || "",
      province: rawOrderData.province || "",
      variants: variants,
      raw_data: rawOrderData
    };
    
    console.log("Detalle de orden:", orderDetail);
    
    // Establecer la orden seleccionada y abrir el modal
    setSelectedOrder(orderDetail);
    setIsDetailOpen(true);
  };
  
  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await getListStoreOrders();
        console.log("Respuesta completa:", response);
        
        // Extraer los datos de órdenes de la respuesta del workflow
        let ordersData = [];
        if (response && 
            response.transaction && 
            response.transaction.context && 
            response.transaction.context.invoke && 
            response.transaction.context.invoke["get-list-order-step"] && 
            response.transaction.context.invoke["get-list-order-step"].output && 
            response.transaction.context.invoke["get-list-order-step"].output.output) {
          
          ordersData = response.transaction.context.invoke["get-list-order-step"].output.output;
          console.log("Órdenes extraídas:", ordersData);
        }
        
        // Guardar los datos originales para usarlos en la vista detallada
        setRawOrdersData(ordersData || []);
        
        if (ordersData && Array.isArray(ordersData)) {
          // Transformar los datos al formato esperado por el componente
          const formattedOrders = ordersData.map(order => {
            // Acceder a la estructura correcta de los datos
            const orderData = order.order_tanku || {};
            
            // Obtener la cantidad de items (productos) de la orden
            const itemsCount = orderData.variant && Array.isArray(orderData.variant) && orderData.variant.length > 1 
              ? orderData.variant[1] // El segundo elemento del array es la cantidad
              : 0;
            
            // Obtener el estado formateado para mostrar
            const statusRaw = orderData.status_id || "pending_status_id";
            const status = statusRaw.replace("_status_id", "");
            
            // Formatear la fecha y hora
            const dateObj = orderData.created_at ? new Date(orderData.created_at) : new Date();
            const formattedDate = dateObj.toLocaleDateString("es-CO", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit"
            }) + ' ' + dateObj.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit"
            });
            
            // Crear el objeto formateado para la tabla
            return {
              id: orderData.id || "",
              order_number: `#${orderData.id?.substring(0, 6) || "000000"}`,
              date: formattedDate,
              status: status,
              total: orderData.total_amount || 0,
              items: itemsCount
            };
          });
          
          // Ordenar por fecha más reciente primero
         
          
          setOrders(formattedOrders);
          setFilteredOrders(formattedOrders);
        }
      } catch (error) {
        console.error("Error al cargar órdenes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrders();
  }, []);

  return (
    <div className="w-full">
      {/* Filtros y búsqueda */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Selector de estados */}
        <div className="relative w-full md:w-64">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full appearance-none rounded-md border border-gray-200 bg-white px-4 py-2 pr-10 text-gray-900 focus:border-gray-900 focus:outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
        </div>

        {/* Buscador */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Buscar por número o total"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-4 py-2 pl-10 text-gray-900 focus:border-gray-900 focus:outline-none"
          />
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {/* Tabla de órdenes */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Número
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Productos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                  Cargando órdenes...
                </td>
              </tr>
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {order.order_number}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {order.date}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatPrice(order.total)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {order.items} {order.items === 1 ? "producto" : "productos"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <button
                      onClick={() => viewOrderDetails(order.id)}
                      className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 focus:outline-none"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm text-gray-500"
                >
                  No se encontraron órdenes con los filtros seleccionados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de detalles de la orden */}
      <Dialog
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        className="relative z-50"
      >
        {/* Overlay de fondo */}
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        {/* Contenedor del modal */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-medium text-gray-900">
                Detalles de la orden {selectedOrder?.order_number}
              </Dialog.Title>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <XMark className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {selectedOrder && (
              <div className="mt-4">
                {/* Información general */}
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 font-medium text-gray-900">Información de la orden</h3>
                    <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm">
                        <span className="font-medium">Fecha:</span> {selectedOrder.date}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Estado:</span>{" "}
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                            selectedOrder.status
                          )}`}
                        >
                          {getStatusText(selectedOrder.status)}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Total:</span> {formatPrice(selectedOrder.total)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Método de pago:</span>{" "}
                        {selectedOrder.payment_method || "No especificado"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 font-medium text-gray-900">Información del cliente</h3>
                    <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm">
                        <span className="font-medium">Nombre:</span>{" "}
                        {`${selectedOrder.first_name} ${selectedOrder.last_name}`.trim() || "No especificado"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Email:</span> {selectedOrder.email || "No especificado"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Dirección:</span>{" "}
                        {selectedOrder.address || "No especificada"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Ciudad:</span>{" "}
                        {selectedOrder.city || "No especificada"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Provincia:</span>{" "}
                        {selectedOrder.province || "No especificada"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Productos */}
                <div>
                  <h3 className="mb-2 font-medium text-gray-900">Productos</h3>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Producto
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Cantidad
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Precio unitario
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {selectedOrder.variants.length > 0 ? (
                          selectedOrder.variants.map((variant) => (
                            <tr key={variant.id} className="hover:bg-gray-50">
                              <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900">
                                {variant.variant_id}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                                {variant.quantity}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                                {formatPrice(variant.unit_price)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                                {formatPrice(variant.original_total)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-4 text-center text-sm text-gray-500"
                            >
                              No hay productos disponibles
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td
                            colSpan={3}
                            className="whitespace-nowrap px-4 py-2 text-right text-sm font-medium text-gray-900"
                          >
                            Total:
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900">
                            {formatPrice(selectedOrder.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  )
}

export default TableOrders