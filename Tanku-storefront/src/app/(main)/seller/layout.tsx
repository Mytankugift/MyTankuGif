import { retrieveCustomer } from "@lib/data/customer"
import { Toaster } from "@medusajs/ui"
import SellerLayout from "@modules/seller/templates/seller-layout"

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)

  return (
    <SellerLayout customer={customer}>
      {customer ? dashboard : login}
      <Toaster />
    </SellerLayout>
  )
}
