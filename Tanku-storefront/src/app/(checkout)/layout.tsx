import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import MedusaCTA from "@modules/layout/components/medusa-cta"
import Nav from "@modules/layout/templates/nav"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full bg-[#1E1E1E] text-white ">
      <Nav />
     
        <div className="lg:ml-52 ml-0 min-h-screen max-w-full overflow-x-hidden mb-16 lg:mb-0" data-testid="checkout-container">
          {children}
        </div>
      
      <div className="py-4 w-full flex items-center justify-center bg-zinc-800 mt-8">
        <MedusaCTA />
      </div>
    </div>
  )
}
