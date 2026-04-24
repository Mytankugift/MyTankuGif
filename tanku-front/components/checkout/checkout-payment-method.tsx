'use client'

import React from 'react'

interface CheckoutPaymentMethodProps {
  value: string
  onChange: (method: string) => void
  isGiftCart?: boolean
}

/** Misma caja de método que en `/checkout/gift-direct` (fondo translúcido, acento #66DEDB) */
const methodCardClass = (active: boolean) =>
  `w-full rounded-xl border px-3 py-2.5 text-left backdrop-blur-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#66DEDB]/50 ${
    active
      ? 'border-[#66DEDB] bg-[#66DEDB]/10 ring-1 ring-inset ring-[#66DEDB]/25'
      : 'border-white/[0.08] bg-black/20 ring-1 ring-inset ring-white/[0.04] hover:border-white/[0.15]'
  }`

const paymentMethods = [
  {
    id: 'cash_on_delivery',
    name: 'Contra entrega',
    description: 'Paga cuando recibas tu pedido',
  },
  {
    id: 'epayco',
    name: 'Epayco',
    description: 'Tarjeta o medios con pasarela segura',
  },
]

export function CheckoutPaymentMethod({ value, onChange, isGiftCart = false }: CheckoutPaymentMethodProps) {
  const availableMethods = isGiftCart ? paymentMethods.filter((m) => m.id === 'epayco') : paymentMethods

  React.useEffect(() => {
    if (isGiftCart && value === 'cash_on_delivery') {
      onChange('epayco')
    }
  }, [isGiftCart, value, onChange])

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Método de pago">
      {availableMethods.map((method) => {
        const active = value === method.id
        return (
          <button
            key={method.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(method.id)}
            className={methodCardClass(active)}
          >
            <p
              className={`text-sm font-medium ${active ? 'text-[#66DEDB]' : 'text-zinc-200'}`}
            >
              {method.name}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">{method.description}</p>
          </button>
        )
      })}
    </div>
  )
}
