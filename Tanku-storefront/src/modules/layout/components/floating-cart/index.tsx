"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"

const FloatingCart = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = cartState?.subtotal ?? 0
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    open()
  }

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  // open cart dropdown when modifying the cart items, but only if we're not on the cart page
  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, itemRef.current])

  return (
    <div
      className="fixed top-3 sm:top-4 right-3 sm:right-4 z-50"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative">
        
        <PopoverButton className="flex items-center justify-center bg-[#1E1E1E] rounded-full shadow-md p-2 sm:p-3 relative transition-transform duration-200 hover:scale-110 active:scale-95">
          <div className="relative">
            <Image 
              src="/feed/Icons/Shopping_Cart_Blue.png" 
              alt="Carrito" 
              width={22} 
              height={22} 
              className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]"
            />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                {totalItems}
              </span>
            )}
          </div>
        </PopoverButton>
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-300"
          enterFrom="opacity-0 translate-y-2 scale-95"
          enterTo="opacity-100 translate-y-0 scale-100"
          leave="transition ease-in duration-200"
          leaveFrom="opacity-100 translate-y-0 scale-100"
          leaveTo="opacity-0 translate-y-2 scale-95"
        >
          <PopoverPanel
            static
            className="absolute top-[calc(100%+8px)] right-0 bg-[#1E1E1E] border border-gray-600 w-[280px] sm:w-[320px] md:w-[380px] text-[#66DEDB] rounded-md shadow-lg"
            data-testid="floating-cart-dropdown"
          >
            <div className="p-3 sm:p-4 flex items-center justify-center border-b border-gray-600">
              <h3 className="text-base sm:text-lg font-semibold text-[#66DEDB]">Carrito</h3>
            </div>
            {cartState && cartState.items?.length ? (
              <>
                <div className="overflow-y-auto max-h-[250px] sm:max-h-[300px] px-3 sm:px-4 grid grid-cols-1 gap-y-6 sm:gap-y-8 scrollbar-hide py-3 sm:py-4">
                  {cartState.items
                    .sort((a, b) => {
                      return (a.created_at ?? "") > (b.created_at ?? "")
                        ? -1
                        : 1
                    })
                    .map((item) => (
                      <div
                        className="grid grid-cols-[70px_1fr] sm:grid-cols-[80px_1fr] gap-x-3 sm:gap-x-4"
                        key={item.id}
                        data-testid="floating-cart-item"
                      >
                        <LocalizedClientLink
                          href={`/products/${item.product_handle}`}
                          className="w-[70px] sm:w-20"
                        >
                          <Thumbnail
                            thumbnail={item.thumbnail}
                            images={item.variant?.product?.images}
                            size="square"
                          />
                        </LocalizedClientLink>
                        <div className="flex flex-col justify-between flex-1 min-w-0">
                          <div className="flex flex-col flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-col flex-1 min-w-0">
                                <h3 className="text-xs sm:text-sm font-medium text-[#3B9BC3] truncate">
                                  <LocalizedClientLink
                                    href={`/products/${item.product_handle}`}
                                    data-testid="product-link"
                                  >
                                    {item.title}
                                  </LocalizedClientLink>
                                </h3>
                                <div className="text-[#66DEDB] [&_*]:!text-[#66DEDB] [&_*]:!color-[#66DEDB]">
                                  <LineItemOptions
                                    variant={item.variant}
                                    data-testid="cart-item-variant"
                                    data-value={item.variant}
                                  />
                                </div>
                                <span
                                  className="text-[10px] sm:text-xs text-[#66DEDB]"
                                  data-testid="cart-item-quantity"
                                  data-value={item.quantity}
                                >
                                  Cantidad: {item.quantity}
                                </span>
                              </div>
                              <div className="flex justify-end flex-shrink-0">
                                <div className="text-[#66DEDB] [&_*]:!text-[#66DEDB] [&_span]:!text-[#66DEDB] [&_p]:!text-[#66DEDB]">
                                  <LineItemPrice
                                    item={item}
                                    style="tight"
                                    currencyCode={cartState.currency_code}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <DeleteButton
                            id={item.id}
                            className="mt-1 text-[10px] sm:text-xs text-[#E73230] hover:text-[#ff5652]"
                            data-testid="cart-item-remove-button"
                          >
                            Eliminar
                          </DeleteButton>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="p-3 sm:p-4 flex flex-col gap-y-3 sm:gap-y-4 text-small-regular border-t border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-[#66DEDB] font-semibold text-xs sm:text-sm">
                      Subtotal{" "}
                      <span className="font-normal text-[10px] sm:text-xs">(excl. impuestos)</span>
                    </span>
                    <span
                      className="text-sm sm:text-base font-semibold text-[#66DEDB]"
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                    >
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: cartState.currency_code,
                      })}
                    </span>
                  </div>
                  <LocalizedClientLink href="/cart" passHref>
                    <Button
                      className="w-full bg-[#3B9BC3] hover:bg-[#2A7A9B] text-white border-none text-xs sm:text-sm py-2 sm:py-3 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                      size="large"
                      data-testid="go-to-cart-button"
                      onClick={close}
                    >
                      Ir al carrito
                    </Button>
                  </LocalizedClientLink>
                </div>
              </>
            ) : (
              <div>
                <div className="flex py-8 sm:py-12 flex-col gap-y-3 sm:gap-y-4 items-center justify-center">
                  <div className="bg-[#3B9BC3] text-small-regular flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-white">
                    <span>0</span>
                  </div>
                  <span className="text-xs sm:text-sm text-[#66DEDB]">Tu carrito está vacío.</span>
                  <div>
                    <LocalizedClientLink href="/store">
                      <>
                        <span className="sr-only">Ir a todos los productos</span>
                        <Button 
                          onClick={close} 
                          size="small"
                          className="bg-[#3B9BC3] hover:bg-[#2A7A9B] text-white border-none text-xs sm:text-sm py-1.5 sm:py-2 px-3 sm:px-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Explorar productos
                        </Button>
                      </>
                    </LocalizedClientLink>
                  </div>
                </div>
              </div>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default FloatingCart
