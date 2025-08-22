import { Heading } from "@medusajs/ui"

import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"

const CheckoutSummary = ({ cart }: { cart: any }) => {
  return (
    <div className="sticky top-0 flex flex-col-reverse sm:flex-col gap-y-2 sm:gap-y-4 py-3 sm:py-4 md:py-0">
      <div className="w-full flex flex-col text-white overflow-x-hidden px-2 sm:px-3 md:px-4">
        <Divider className="my-4 sm:my-6 sm:hidden" />
        <Heading
          level="h2"
          className="flex flex-row text-xl sm:text-2xl font-bold items-baseline text-[#66DEDB]"
        >
          Resumen de compra
        </Heading>
        <Divider className="my-4 sm:my-6" />
        <CartTotals totals={cart} />
        <ItemsPreviewTemplate cart={cart} />
        {/* <div className="my-4 sm:my-6">
          <DiscountCode cart={cart} />
        </div> */}
      </div>
    </div>
  )
}

export default CheckoutSummary
