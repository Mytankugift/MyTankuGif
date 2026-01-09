'use client'

interface CheckoutPaymentMethodProps {
  value: string
  onChange: (method: string) => void
}

const paymentMethods = [
  {
    id: 'cash_on_delivery',
    name: 'Contra entrega',
    description: 'Paga cuando recibas tu pedido',
    icon: '💰',
  },
  {
    id: 'epayco',
    name: 'Epayco',
    description: 'Pago con tarjeta de crédito o débito',
    icon: '💳',
  },
]

export function CheckoutPaymentMethod({ value, onChange }: CheckoutPaymentMethodProps) {
  return (
    <div className="space-y-2">
      {paymentMethods.map((method) => (
        <label
          key={method.id}
          className={`
            flex items-center gap-2.5 p-2.5 rounded border cursor-pointer transition-colors
            ${
              value === method.id
                ? 'border-[#66DEDB] bg-[#66DEDB]/5'
                : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
            }
          `}
        >
          <input
            type="radio"
            name="payment_method"
            value={method.id}
            checked={value === method.id}
            onChange={(e) => onChange(e.target.value)}
            className="w-3.5 h-3.5 text-[#66DEDB] focus:ring-[#66DEDB] focus:ring-1"
          />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base">{method.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-white">{method.name}</span>
              <p className="text-xs text-gray-400 truncate">{method.description}</p>
            </div>
          </div>
        </label>
      ))}
    </div>
  )
}

