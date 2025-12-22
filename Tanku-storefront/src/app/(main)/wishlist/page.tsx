"use client"

import { Metadata } from "next"
import WishlistManager from "@modules/layout/components/wishlist-manager"

export default function WishlistPage() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#1E1E1E" }}>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <WishlistManager />
      </div>
    </div>
  )
}

