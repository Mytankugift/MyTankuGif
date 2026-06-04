'use client'

import { InformationCircleIcon } from '@heroicons/react/24/outline'
import type { OrderItemDropiMetaInput } from '@/lib/order-item-dropi-meta'

interface OrderItemDropiShippingActionsProps {
  item: OrderItemDropiMetaInput
  onViewShipping: () => void
  className?: string
}

export function OrderItemDropiShippingActions({
  item,
  onViewShipping,
  className = '',
}: OrderItemDropiShippingActionsProps) {
  if (!item.dropiOrderId) return null

  return (
    <button
      type="button"
      onClick={onViewShipping}
      className={`inline-flex items-center gap-1 text-left text-xs font-medium text-[#73FFA2] hover:text-[#66DEDB] ${className}`}
      title="Ver detalle de envío Dropi"
    >
      <InformationCircleIcon className="h-3.5 w-3.5 shrink-0" />
      Ver estado de envío
    </button>
  )
}
