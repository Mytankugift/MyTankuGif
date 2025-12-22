import { Metadata } from "next"
import { getBaseURL } from "@lib/util/env"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import ConditionalLayout from "@modules/layout/components/conditional-layout"
import { retrieveCustomer } from "@lib/data/customer"
import OnboardingModal from "@modules/onboarding/components/modal"
import SocialChat from "@modules/layout/components/social-chat"
import { retrieveCart } from "@lib/data/cart"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  const customer = await retrieveCustomer().catch(() => null)
  const cart = await retrieveCart().catch(() => null)

  return (
    <>
      <Nav />
      {customer && (
        <>
          <OnboardingModal customer_id={customer.id} />
          <SocialChat customerId={customer.id} />
        </>
      )}
      <div className="lg:ml-60 ml-0 min-h-screen max-w-full overflow-x-hidden mb-16 lg:mb-0">
        {props.children}
      </div>
    </>
  )
}
