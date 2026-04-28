'use client'

import Image from 'next/image'
import Link from 'next/link'

/** Mismo patrón que el nav de /cart: volver al feed con icono universal */
export function NavBackToFeedLink() {
  return (
    <Link
      href="/feed"
      aria-label="Volver al feed"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
    >
      <Image
        src="/icons_tanku/mobile_tanku_menu_ir_atras_Universal.svg"
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 object-contain"
        unoptimized
      />
    </Link>
  )
}
