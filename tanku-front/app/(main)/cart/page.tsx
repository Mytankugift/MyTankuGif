'use client'

import { useEffect, Suspense, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { clsx } from 'clsx'
import { useCartStore } from '@/lib/stores/cart-store'
import { CartItem } from '@/components/cart/cart-item'
import { CartSummary, buildCartCheckoutHref } from '@/components/cart/cart-summary'
import { Button } from '@/components/ui/button'
import type { Cart } from '@/types/api'
import { BaseNav } from '@/components/layout/base-nav'
import {
  CHECKOUT_TANKU_PAGE_BG,
  CHECKOUT_TANKU_SCROLL_INNER,
  CHECKOUT_TANKU_SECTION_LABEL,
  CHECKOUT_TANKU_SURFACE,
} from '@/lib/checkout-tanku-design'

const navBack = (
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

const cartBaseNav = (
  <BaseNav
    showStories={false}
    canHide={false}
    isVisible={true}
    pageTitle="Carrito"
    pageSubtitle="Revisa tus productos, ajusta cantidades y continúa al checkout"
    pageTitleColor="#FFFFFF"
    startContent={navBack}
    mobileBackCenterTitleCartOnly
    mobileTranslucentNav
  />
)

function CartPageContent() {
  const normalCart = useCartStore((s) => s.normalCart)
  const fetchCart = useCartStore((s) => s.fetchCart)
  const [ready, setReady] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cart-selected-items')
      if (saved) {
        try {
          return new Set(JSON.parse(saved))
        } catch {
          return new Set()
        }
      }
    }
    return new Set()
  })

  useEffect(() => {
    void fetchCart().finally(() => setReady(true))
  }, [fetchCart])

  const currentCart = normalCart

  useEffect(() => {
    if (currentCart && currentCart.items.length > 0) {
      const currentItemIds = new Set(currentCart.items.map((item) => item.id))

      if (selectedItems.size === 0) {
        const allItems = new Set(currentCart.items.map((item) => item.id))
        setSelectedItems(allItems)
        if (typeof window !== 'undefined') {
          localStorage.setItem('cart-selected-items', JSON.stringify(Array.from(allItems)))
        }
      } else {
        const filtered = new Set(Array.from(selectedItems).filter((id) => currentItemIds.has(id)))
        if (filtered.size !== selectedItems.size) {
          setSelectedItems(filtered)
          if (typeof window !== 'undefined') {
            localStorage.setItem('cart-selected-items', JSON.stringify(Array.from(filtered)))
          }
        }
      }
    } else if (!currentCart || currentCart.items.length === 0) {
      setSelectedItems(new Set())
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart-selected-items')
      }
    }
  }, [currentCart])

  useEffect(() => {
    if (typeof window !== 'undefined' && selectedItems.size >= 0) {
      localStorage.setItem('cart-selected-items', JSON.stringify(Array.from(selectedItems)))
    }
  }, [selectedItems])

  const scrollShell = (content: ReactNode, opts?: { extraMobilePadding?: boolean; mobileCta?: ReactNode }) => (
    <>
      {cartBaseNav}
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden" id="cart-scroll-root">
        <div
          className={clsx(
            CHECKOUT_TANKU_SCROLL_INNER,
            opts?.extraMobilePadding && 'max-lg:!pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))]',
          )}
          style={CHECKOUT_TANKU_PAGE_BG}
        >
          <div className="mx-auto max-w-4xl">{content}</div>
        </div>
      </div>
      {opts?.mobileCta}
    </>
  )

  if (!ready) {
    return scrollShell(
      <div className="text-center text-zinc-500">
        <div className={`${CHECKOUT_TANKU_SURFACE} mx-auto max-w-md px-8 py-14`}>
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#73FFA2] border-t-transparent" />
          <span className="text-sm">Cargando carrito…</span>
        </div>
      </div>,
    )
  }

  const hasNormalItems = normalCart && normalCart.items.length > 0

  if (!hasNormalItems) {
    return scrollShell(
      <div className="flex flex-col items-center px-2 py-4 text-center sm:px-0">
        <div className={`${CHECKOUT_TANKU_SURFACE} w-full max-w-md`}>
          <div className="mb-6 flex justify-center">
            <svg
              className="h-20 w-20 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold text-white sm:text-2xl">Tu carrito está vacío</h1>
          <p className="mb-8 text-sm text-zinc-400">Agrega productos increíbles para comenzar.</p>
          <Link href="/feed">
            <Button
              className="w-full py-2.5 text-sm font-semibold hover:!bg-[#5ac8c4] sm:py-3 sm:text-base"
              style={{
                backgroundColor: '#66DEDB',
                color: '#2C3137',
                borderRadius: '25px',
                boxShadow: '0px 4px 4px 0px #00000040 inset',
              }}
            >
              Continuar comprando
            </Button>
          </Link>
        </div>
      </div>,
    )
  }

  const currentItems = currentCart?.items || []
  const currentCartForSummary =
    currentCart ||
    ({
      id: '',
      items: [],
      subtotal: 0,
      total: 0,
      isGiftCart: false,
      giftRecipientId: null,
    } as Cart)

  const checkoutHref = buildCartCheckoutHref(currentCartForSummary, selectedItems)
  const checkoutDisabled = selectedItems.size === 0

  const mobileCheckoutBar = (
    <div
      className="pointer-events-none fixed left-0 right-0 z-[100] md:hidden"
      style={{
        bottom: 'max(4.5rem, calc(4.5rem + env(safe-area-inset-bottom, 0px)))',
      }}
    >
      <div className="pointer-events-auto border-t border-white/10 bg-[#171B21]/95 px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <Link href={checkoutHref} className="block">
          <Button
            disabled={checkoutDisabled}
            className="w-full py-2.5 text-sm font-semibold hover:!bg-[#5ac8c4] disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: '#66DEDB',
              color: '#2C3137',
              borderRadius: '25px',
              boxShadow: '0px 4px 4px 0px #00000040 inset',
            }}
          >
            Proceder al pago{selectedItems.size > 0 ? ` (${selectedItems.size})` : ''}
          </Button>
        </Link>
      </div>
    </div>
  )

  return scrollShell(
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
      <div className="order-2 space-y-6 lg:order-1 lg:col-span-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className={`${CHECKOUT_TANKU_SECTION_LABEL} !mb-0`}>Productos</p>
          <button
            type="button"
            onClick={() => {
              const newSelected =
                selectedItems.size === currentItems.length && currentItems.length > 0
                  ? new Set<string>()
                  : new Set(currentItems.map((item) => item.id))
              setSelectedItems(newSelected)
              if (typeof window !== 'undefined') {
                localStorage.setItem('cart-selected-items', JSON.stringify(Array.from(newSelected)))
              }
            }}
            className="shrink-0 self-end rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-[#66DEDB]/35 hover:text-white sm:self-auto sm:text-sm"
          >
            {selectedItems.size > 0
              ? `${selectedItems.size} de ${currentItems.length} seleccionados`
              : 'Seleccionar todos'}
          </button>
        </div>

        <div className="space-y-3">
          {[...currentItems]
            .sort((a, b) => {
              const dateA = new Date(a.createdAt || 0).getTime()
              const dateB = new Date(b.createdAt || 0).getTime()
              return dateB - dateA
            })
            .map((item) => (
              <CartItem
                key={item.id}
                item={item}
                isSelected={selectedItems.has(item.id)}
                onSelectChange={(itemId, selected) => {
                  const newSelected = new Set(selectedItems)
                  if (selected) {
                    newSelected.add(itemId)
                  } else {
                    newSelected.delete(itemId)
                  }
                  setSelectedItems(newSelected)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('cart-selected-items', JSON.stringify(Array.from(newSelected)))
                  }
                }}
              />
            ))}
        </div>
      </div>

      <div className="order-1 lg:order-2 lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
        <CartSummary cart={currentCartForSummary} selectedItems={selectedItems} />
      </div>
    </div>,
    { extraMobilePadding: true, mobileCta: mobileCheckoutBar },
  )
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <>
          {cartBaseNav}
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden" id="cart-scroll-root">
            <div className={CHECKOUT_TANKU_SCROLL_INNER} style={CHECKOUT_TANKU_PAGE_BG}>
              <div className="mx-auto max-w-4xl text-center text-zinc-500">
                <div className={`${CHECKOUT_TANKU_SURFACE} mx-auto max-w-md px-8 py-14`}>
                  <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#73FFA2] border-t-transparent" />
                  <span className="text-sm">Cargando…</span>
                </div>
              </div>
            </div>
          </div>
        </>
      }
    >
      <CartPageContent />
    </Suspense>
  )
}
