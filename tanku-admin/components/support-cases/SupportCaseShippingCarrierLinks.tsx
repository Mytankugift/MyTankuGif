'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { SupportCaseDropiOrderItem } from '@/lib/types/support-cases'
import { formatSupportCaseDropiOrderItemLabel } from '@/lib/support-case-dropi-labels'
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock'

interface SupportCaseShippingCarrierLinksProps {
  dropiOrderItems: SupportCaseDropiOrderItem[]
  emptyLabel?: string
  variant?: 'summary' | 'inline'
}

function CarriersList({ items }: { items: SupportCaseDropiOrderItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.orderItemId}
          className="min-w-0 rounded-lg border border-gray-100 bg-gray-50/80 p-3"
        >
          <p className="text-sm font-medium text-gray-900 leading-snug">
            {formatSupportCaseDropiOrderItemLabel(item)}
          </p>
          <p className="mt-2 text-sm text-gray-800">{item.shippingCompany}</p>
          {item.shippingGuide ? (
            <p className="mt-1 font-mono text-xs text-gray-600">
              Guía: {item.shippingGuide}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function CarriersModal({
  open,
  onClose,
  items,
}: {
  open: boolean
  onClose: () => void
  items: SupportCaseDropiOrderItem[]
}) {
  useBodyScrollLock(open)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shipping-carriers-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85vh,520px)] w-full max-w-md flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 id="shipping-carriers-modal-title" className="text-base font-semibold text-gray-900">
            Transportadoras
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-sm text-gray-500">
            Cada producto puede ir con una transportadora distinta según Dropi.
          </p>
          <CarriersList items={items} />
        </div>
      </div>
    </div>
  )
}

export function SupportCaseShippingCarrierLinks({
  dropiOrderItems,
  emptyLabel = '—',
  variant = 'summary',
}: SupportCaseShippingCarrierLinksProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const itemsWithCarrier = dropiOrderItems.filter(
    (i) => i.shippingCompany != null && i.shippingCompany.trim() !== ''
  )

  if (itemsWithCarrier.length === 0) {
    return <span className="text-sm text-gray-900">{emptyLabel}</span>
  }

  if (variant === 'inline') {
    const item = itemsWithCarrier[0]
    return (
      <p className="text-xs text-gray-700">
        {item.shippingCompany}
        {item.shippingGuide ? (
          <span className="mt-0.5 block font-mono text-[11px] text-gray-500">
            Guía {item.shippingGuide}
          </span>
        ) : null}
      </p>
    )
  }

  const count = itemsWithCarrier.length
  const summaryLabel =
    count === 1
      ? 'Ver 1 producto y transportadora'
      : `Ver ${count} productos y transportadoras`

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="text-left text-sm font-medium text-sky-700 hover:text-sky-900 hover:underline"
      >
        {summaryLabel}
      </button>
      <CarriersModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        items={itemsWithCarrier}
      />
    </>
  )
}
