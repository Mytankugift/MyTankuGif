'use client'

import { useState } from 'react'
import { ArrowTopRightOnSquareIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { dropiProviderDashboardUrl } from '@/lib/admin/dropi-dashboard'
import type { SupportCaseDropiOrderItem } from '@/lib/types/support-cases'
import {
  formatDropiSupplierLinkLabel,
  formatSupportCaseDropiOrderItemLabel,
} from '@/lib/support-case-dropi-labels'
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock'

interface SupportCaseDropiProviderLinksProps {
  dropiOrderItems: SupportCaseDropiOrderItem[]
  emptyLabel?: string
  /** Resumen del caso: 1 inline, varios → modal. Cards: enlace sin título de producto. */
  variant?: 'summary' | 'list' | 'inline'
}

const linkClass =
  'inline-flex w-fit max-w-full items-center gap-1 rounded-md border border-teal-200 bg-teal-50/80 px-2 py-0.5 text-xs font-medium text-teal-800 hover:bg-teal-100'

function DropiProvidersList({ items }: { items: SupportCaseDropiOrderItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const id = item.dropiSupplierId!
        return (
          <li key={item.orderItemId} className="min-w-0 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
            <p className="text-sm font-medium text-gray-900 leading-snug">
              {formatSupportCaseDropiOrderItemLabel(item)}
            </p>
            <a
              href={dropiProviderDashboardUrl(id)}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-2 ${linkClass}`}
            >
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" />
              {formatDropiSupplierLinkLabel(id, item.dropiSupplierName)}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function DropiProvidersModal({
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
      aria-labelledby="dropi-providers-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85vh,520px)] w-full max-w-md flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 id="dropi-providers-modal-title" className="text-base font-semibold text-gray-900">
            Proveedores Dropi
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
            Cada producto del pedido puede tener un proveedor distinto en Dropi.
          </p>
          <DropiProvidersList items={items} />
        </div>
      </div>
    </div>
  )
}

export function SupportCaseDropiProviderLinks({
  dropiOrderItems,
  emptyLabel = '—',
  variant = 'list',
}: SupportCaseDropiProviderLinksProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const itemsWithSupplier = dropiOrderItems.filter(
    (i) => i.dropiSupplierId != null && Number.isFinite(i.dropiSupplierId)
  )

  if (itemsWithSupplier.length === 0) {
    return <span className="text-sm text-gray-900">{emptyLabel}</span>
  }

  if (variant === 'inline') {
    const item = itemsWithSupplier[0]
    const id = item.dropiSupplierId!
    return (
      <a
        href={dropiProviderDashboardUrl(id)}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" />
        {formatDropiSupplierLinkLabel(id, item.dropiSupplierName)}
      </a>
    )
  }

  if (variant === 'summary') {
    const count = itemsWithSupplier.length
    const summaryLabel =
      count === 1
        ? 'Ver 1 producto y proveedor Dropi'
        : `Ver ${count} productos y proveedores Dropi`

    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-left text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline"
        >
          {summaryLabel}
        </button>
        <DropiProvidersModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          items={itemsWithSupplier}
        />
      </>
    )
  }

  return <DropiProvidersList items={itemsWithSupplier} />
}
