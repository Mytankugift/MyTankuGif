"use client"

import { Metadata } from "next"
import { usePathname } from "next/navigation"

import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { getBaseURL } from "@lib/util/env"
import { StoreCartShippingOption } from "@medusajs/types"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"



export default function PageLayout(props: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavAndFooter = pathname?.includes('components');

  return (
    <>
      {!hideNavAndFooter && <Nav />}
      {props.children}
      {!hideNavAndFooter && <Footer />}
    </>
  )
}
