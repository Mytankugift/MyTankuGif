import { Metadata } from "next"
import { getBaseURL } from "@lib/util/env"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import ConditionalLayout from "@modules/layout/components/conditional-layout"
import { retrieveCustomer } from "@lib/data/customer"


export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) return <> {props.children}</>
    
 
    return (
      <>
        <Nav />
        <div className="ml-52 min-h-screen max-w-full overflow-x-hidden">
          {props.children}
        </div>
      </>
    )
}
