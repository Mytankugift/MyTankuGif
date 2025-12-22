import { retrieveCustomer } from "@lib/data/customer"
import { Toaster } from "@medusajs/ui"
import AccountLayout from "@modules/account/templates/account-layout"
import { redirect } from "next/navigation"
import LoginRedirectHandler from "@modules/account/components/login-redirect-handler"

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)

  return (
    <AccountLayout customer={customer}>
      {customer ? (
        <>
          <LoginRedirectHandler />
          {dashboard}
        </>
      ) : login}
      <Toaster />
    </AccountLayout>
  )
}
