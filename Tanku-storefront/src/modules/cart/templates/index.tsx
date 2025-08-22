import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  return (
    <div className="py-4 sm:py-8 md:py-12 bg-[#1E1E1E] min-h-[100vh] flex flex-col items-center -mb-2">
      <div className="content-container w-full px-4 py-10 md:py-1 sm:px-6 md:px-8" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-y-6 sm:gap-y-8 lg:gap-y-0 lg:gap-x-8 xl:gap-x-12 2xl:gap-x-20 bg-[#1E1E1E]">
            <div className="flex flex-col bg-[#1E1E1E] rounded-lg py-4 sm:py-6 gap-y-4 sm:gap-y-6">
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider className="bg-gray-700" />
                </>
              )}
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-4 sm:gap-y-6 md:gap-y-8 lg:sticky lg:top-12">
                {cart && cart.region && (
                  <div className="bg-[#1E1E1E] rounded-lg py-4 sm:py-6">
                    <Summary cart={cart as any} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto ">
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
