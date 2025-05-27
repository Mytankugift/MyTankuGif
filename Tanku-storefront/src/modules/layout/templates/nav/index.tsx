import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import Image from "next/image"
import { House, MagnifyingGlass, User, Heart, BellAlert } from "@medusajs/icons"
import { Avatar } from "@medusajs/ui"

export default async function Nav() {
  const regions = await listRegions().then((regions: StoreRegion[]) => regions)

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-28 px-16 py-20  duration-200 bg-blackTanku ">
        <nav className=" txt-xsmall-plus text-ui-fg-subtle flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center">
            <Image src="/logoTanku.png" alt="Logo" width={90} height={90} />
          </div>

          <div className="flex items-center gap-x-6 h-full w-[50%] justify-start pl-10">
            <LocalizedClientLink href="https://mytanku.com/home/home/" className="flex items-center gap-x-2 txt-compact-xlarge-plus hover:text-greenBlueTanku uppercase text-white">
              <House className=" text-2xl" color="white"  />
              HOME
            </LocalizedClientLink>
            <LocalizedClientLink
              href="https://mytanku.com/home/activity/"
              className="flex items-center txt-compact-xlarge-plus hover:text-greenBlueTanku uppercase text-white gap-x-2"
              data-testid="nav-store-link"
            >
              <Image src="/miniLogo.png" alt="miniLogoTanku" width={30} height={30} className="object-contain" />
              MY TANKU
            </LocalizedClientLink>
          
          <LocalizedClientLink
              href="/"
              className="flex items-center txt-compact-xlarge-plus hover:text-greenBlueTanku uppercase text-white gap-x-2"
              data-testid="nav-store-link"
            >
              <Image src="/CarritoTanku.png" alt="cartLogo" width={30} height={30} className="object-contain" />
              SORPRENDE
            </LocalizedClientLink>
            </div>

          {/* Buscador */}
          <div className="flex items-center justify-center mr-6 w-[300px]">
            <div className="relative w-full max-w-xl ">
              <input
                type="text"
                placeholder="Buscar"
                className="w-full bg-transparent border border-white/30 rounded-full px-4 py-2  text-white placeholder-white/50 focus:outline-none focus:border-greenBlueTanku"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <MagnifyingGlass className="text-white"  />
              </button>
            </div>
          </div>

          {/* Iconos de la derecha */}
          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <div className="flex items-center gap-x-6 h-full">
              <LocalizedClientLink
                className="hover:text-greenBlueTanku text-white flex items-end justify-center"
                href="/account"
                data-testid="nav-account-link"
                aria-label="Cuenta"
              >
                <User width={24} height={24} className="items-end pt-2" />
              </LocalizedClientLink>
              
              <LocalizedClientLink
                className="hover:text-greenBlueTanku text-white flex items-center justify-center"
                href="/wishlist"
                data-testid="nav-wishlist-link"
                aria-label="Lista de deseos"
              >
                <Heart width={24} height={24} className="items-end pt-2" />
              </LocalizedClientLink>
                
              <LocalizedClientLink
                className="hover:text-greenBlueTanku text-white flex items-center justify-center"
                href="/notifications"
                data-testid="nav-notifications-link"
                aria-label="Notificaciones"
              >
                <BellAlert width={24} height={24} className="items-end pt-2" />
              </LocalizedClientLink>
              <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-greenBlueTanku text-white flex items-center"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
              <LocalizedClientLink
                href="/account"
                className="flex items-center justify-center"
                data-testid="nav-user-avatar-link"
                aria-label="Mi cuenta"
              >
                <div className="w-8 h-8 mx-3 bg-white rounded-full flex items-center justify-center hover:bg-greenBlueTanku hover:text-white transition-colors">
                  <User width={15} height={15} />
                </div>
              </LocalizedClientLink>
            </div>
          </div>
        </nav>
      </header>
    </div>
  )
}
