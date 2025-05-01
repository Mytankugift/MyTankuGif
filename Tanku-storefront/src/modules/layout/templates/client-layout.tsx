"use client"

import { usePathname } from "next/navigation"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavAndFooter = pathname?.includes('components');

  return (
    <>
      {!hideNavAndFooter && <Nav />}
      {children}
      {!hideNavAndFooter && <Footer />}
    </>
  )
}
