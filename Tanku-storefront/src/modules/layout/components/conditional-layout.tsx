"use client"

import { usePathname } from "next/navigation"
import React from "react"

interface ConditionalLayoutProps {
  children: React.ReactNode
  navComponent: React.ReactNode
  footerComponent: React.ReactNode
}

export default function ConditionalLayout({
  children,
  navComponent,
  footerComponent,
}: ConditionalLayoutProps) {
  const pathname = usePathname()
  const hideNavAndFooter = pathname?.includes("/components")

  return (
    <>
      {!hideNavAndFooter && navComponent}
      {children}
      {!hideNavAndFooter && footerComponent}
    </>
  )
}
