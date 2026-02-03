'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface GiftCartConfirmationModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  onGoToCart?: () => void
  currentRecipientName?: string
  newRecipientName?: string
}

export function GiftCartConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  onGoToCart,
  currentRecipientName,
  newRecipientName,
}: GiftCartConfirmationModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const handleGoToCart = () => {
    if (onGoToCart) {
      onGoToCart()
    } else {
      router.push('/cart')
    }
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-[#73FFA2]/40 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-[#73FFA2]">Carrito de regalos</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-white mb-2">
            Tienes productos en el carrito de regalos para{' '}
            <span className="font-semibold text-[#66DEDB]">
              {currentRecipientName || 'otra persona'}
            </span>
            .
          </p>
          <p className="text-gray-300 mb-4">
            ¿Qué deseas hacer?
          </p>
          <div className="space-y-2 text-sm text-gray-400">
            <p>• <span className="text-[#66DEDB]">Limpiar y agregar</span>: Vaciar el carrito actual y agregar este producto para {newRecipientName || 'este usuario'}</p>
            <p>• <span className="text-[#66DEDB]">Ir al carrito</span>: Ver y comprar los productos que ya están en el carrito de regalos</p>
            <p>• <span className="text-[#66DEDB]">Cancelar</span>: No hacer nada</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full px-4 py-2.5 bg-[#73FFA2] text-gray-900 font-semibold rounded-lg hover:bg-[#66DEDB] transition-colors"
          >
            Limpiar y agregar
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleGoToCart}
              className="flex-1 px-4 py-2 bg-[#66DEDB] text-gray-900 font-semibold rounded-lg hover:bg-[#5accc9] transition-colors"
            >
              Ir al carrito
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

