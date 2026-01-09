'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import type { Cart } from '@/types/api'

interface CheckoutConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  cart: Cart
  paymentMethod: string
  isSubmitting: boolean
}

export function CheckoutConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  cart,
  paymentMethod,
  isSubmitting,
}: CheckoutConfirmationModalProps) {
  if (!isOpen) return null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getPaymentMethodName = () => {
    switch (paymentMethod) {
      case 'cash_on_delivery':
        return 'Contra entrega'
      case 'epayco':
        return 'Epayco'
      default:
        return paymentMethod
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-[#66DEDB]">Confirmar pedido</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">Total:</span>
              <span className="text-xl font-bold text-[#66DEDB]">
                {formatPrice(cart.total)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Método de pago:</span>
              <span>{getPaymentMethodName()}</span>
            </div>
          </div>

          <p className="text-sm text-gray-300">
            ¿Estás seguro de que deseas crear este pedido? Una vez confirmado, 
            {paymentMethod === 'epayco' 
              ? ' serás redirigido a la pasarela de pago de Epayco.' 
              : ' se procesará el pedido para envío contra entrega.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold"
          >
            {isSubmitting ? 'Procesando...' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

