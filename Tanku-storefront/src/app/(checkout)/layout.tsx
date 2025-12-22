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
    </div>
  )
}
