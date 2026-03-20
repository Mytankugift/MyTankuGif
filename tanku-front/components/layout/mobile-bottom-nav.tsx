'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'

/**
 * Barra inferior móvil (< md). Vive fuera del Sidebar y se renderiza después de <main>
 * para que no quede tapada por el contenido (p. ej. /events con scroll propio).
 */
export default function MobileBottomNav() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()

  const isActiveRoute = (route: string) => {
    if (route === '/feed') {
      return pathname === '/feed' || pathname === '/'
    }
    return pathname === route || pathname.startsWith(route + '/')
  }

  return (
    <nav
      className="pointer-events-auto md:hidden fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around px-2 py-1"
      style={{
        backgroundColor: 'rgba(38, 38, 38, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        minHeight: '50px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
      aria-label="Navegación principal"
    >
      <Link
        href="/feed"
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${
          isActiveRoute('/feed') ? 'opacity-100' : 'opacity-50 hover:opacity-70'
        }`}
        style={{
          filter: isActiveRoute('/feed')
            ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))'
            : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))',
        }}
      >
        <Image
          src="/icons_tanku/tanku_logo_menu_MyTanku_verde.svg"
          alt="My TANKU"
          width={32}
          height={32}
          className="object-contain"
          style={{ width: '32px', height: '32px' }}
        />
      </Link>

      {isAuthenticated ? (
        <Link
          href="/wishlist"
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${
            isActiveRoute('/wishlist') ? 'opacity-100' : 'opacity-50 hover:opacity-70'
          }`}
          style={{
            filter: isActiveRoute('/wishlist')
              ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))'
              : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))',
          }}
        >
          <Image
            src="/icons_tanku/tanku_logo_menu_whislist_verde.svg"
            alt="Wishlist"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </Link>
      ) : (
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg opacity-30 cursor-not-allowed">
          <Image
            src="/icons_tanku/tanku_logo_menu_whislist_verde.svg"
            alt="Wishlist"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </div>
      )}

      <button
        type="button"
        className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative -mt-5"
        style={{
          background: 'transparent',
          border: '3px solid #73FFA2',
          boxShadow: '0 0 16px rgba(115, 255, 162, 0.8), 0 0 24px rgba(115, 255, 162, 0.6)',
        }}
        title="Próximamente"
      >
        <span className="text-white text-7xl leading-none">+</span>
      </button>

      {isAuthenticated ? (
        <Link
          href="/stalkergift"
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${
            isActiveRoute('/stalkergift') ? 'opacity-100' : 'opacity-50 hover:opacity-70'
          }`}
          style={{
            filter: isActiveRoute('/stalkergift')
              ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))'
              : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))',
          }}
        >
          <Image
            src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
            alt="StalkerGift"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </Link>
      ) : (
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg opacity-30 cursor-not-allowed">
          <Image
            src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
            alt="StalkerGift"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </div>
      )}

      {isAuthenticated ? (
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${
            isActiveRoute('/profile') ? 'opacity-100' : 'opacity-50 hover:opacity-70'
          }`}
          style={{
            filter: isActiveRoute('/profile')
              ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))'
              : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))',
          }}
        >
          <Image
            src="/icons_tanku/tanku_logo_menu_miperfil_verde.svg"
            alt="Mi Perfil"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </Link>
      ) : (
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg opacity-30 cursor-not-allowed">
          <Image
            src="/icons_tanku/tanku_logo_menu_miperfil_verde.svg"
            alt="Mi Perfil"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </div>
      )}
    </nav>
  )
}
