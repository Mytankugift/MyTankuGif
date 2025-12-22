import { Metadata } from "next"
import TableOrders from "@modules/account/components/orders-table-tanku"

export const metadata: Metadata = {
  title: "Órdenes",
  description: "Historial de tus órdenes",
}

export default async function Orders() {
  return (
    <div className="w-full space-y-6">
      <h2 className="text-2xl font-bold">Mis Órdenes</h2>
      <p className="text-gray-600">Consulta el estado de tus pedidos y su historial</p>
      
      <TableOrders/>
    </div>
  )
}
