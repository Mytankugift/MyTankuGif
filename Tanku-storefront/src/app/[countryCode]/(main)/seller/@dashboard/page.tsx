import { Metadata } from "next"

import OverviewStore from "@modules/seller/components/store-overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"

export const metadata: Metadata = {
  title: "Storefront - Account Overview",
  description: "Overview of your account activity store.",
}

export default async function OverviewTemplate() {
  const customer = await retrieveCustomer().catch(() => null)
  const orders = (await listOrders().catch(() => null)) || null

  if (!customer) {
    notFound()
  }

  return <OverviewStore customer={customer} orders={orders} />
}
