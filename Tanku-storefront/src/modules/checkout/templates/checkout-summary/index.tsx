import { Heading } from "@medusajs/ui"

import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"

const CheckoutSummary = ({ cart }: { cart: any }) => {
  return (
    <div className="sticky top-0 flex flex-col-reverse small:flex-col gap-y-4 py-4 small:py-0">
      <div className="w-full flex flex-col text-white overflow-x-hidden">
        <Divider className="my-6 small:hidden" />
        <Heading
          level="h2"
          className="flex flex-row text-2xl font-bold items-baseline text-[#66DEDB]"
        >
          Resumen de compra
        </Heading>
        <Divider className="my-6" />
        <CartTotals totals={cart} />
        <ItemsPreviewTemplate cart={cart} />
        {/* <div className="my-6">
          <DiscountCode cart={cart} />
        </div> */}
      </div>
    </div>
  )
}

export default CheckoutSummary
