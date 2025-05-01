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
      <header className="relative h-16 px-16 py-4  duration-200 bg-blackTanku ">
        <nav className=" txt-xsmall-plus text-ui-fg-subtle flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center">
            <Image src="/logoTanku.png" alt="Logo" width={40} height={40} />
          </div>

          <div className="flex items-center gap-x-6 h-full w-[65%] justify-start">
            <LocalizedClientLink href="/" className="flex items-center gap-x-2 txt-compact-xlarge-plus hover:text-greenBlueTanku uppercase text-white">
              <House className="text-ui-fg-interactive " color="white" />
              HOME
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/"
              className="flex items-center txt-compact-xlarge-plus hover:text-greenBlueTanku uppercase text-white gap-x-2"
              data-testid="nav-store-link"
            >
              <Image src="/miniLogo.png" alt="miniLogoTanku" width={17} height={17} />
              MY TANKU
            </LocalizedClientLink>
          
          <LocalizedClientLink
              href="/"
              className="flex items-center txt-compact-xlarge-plus hover:text-greenBlueTanku uppercase text-white gap-x-2"
              data-testid="nav-store-link"
            >
              <Image src="/CarritoTanku.png" alt="cartLogo" width={17} height={17} />
              SORPRENDE
            </LocalizedClientLink>
            </div>

          {/* Buscador */}
          <div className="flex items-center justify-center mr-6">
            <div className="relative w-full max-w-md ">
              <input
                type="text"
                placeholder="Buscar"
                className="w-full bg-transparent border border-white/30 rounded-full px-4 py-2  text-white placeholder-white/50 focus:outline-none focus:border-greenBlueTanku"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <MagnifyingGlass className="text-white" />
              </button>
            </div>
          </div>

          {/* Iconos de la derecha */}
          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <div className="flex items-center gap-x-4 h-full">
              <LocalizedClientLink
                className="hover:text-greenBlueTanku text-white"
                href="/account"
                data-testid="nav-account-link"
                aria-label="Cuenta"
              >
                <User  />
              </LocalizedClientLink>
              
              <LocalizedClientLink
                className="hover:text-greenBlueTanku text-white"
                href="/wishlist"
                data-testid="nav-wishlist-link"
                aria-label="Lista de deseos"
              >
                <Heart  />
              </LocalizedClientLink>
                
              <LocalizedClientLink
                className="hover:text-greenBlueTanku text-white"
                href="/notifications"
                data-testid="nav-notifications-link"
                aria-label="Notificaciones"
              >
                <BellAlert />
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
              <Avatar 
                src="https://mytanku.com/wp-content/themes/socialv/assets/images/redux/default-avatar.jpg"
                fallback="M"
              />
            </div>

            
           
          </div>
        </nav>
      </header>
    </div>
  )
}
