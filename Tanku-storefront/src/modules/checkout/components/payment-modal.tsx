"use client"

import { Button } from "@medusajs/ui"
import { CreditCard, CheckCircleSolid, XMark } from "@medusajs/icons"
import Script from "next/script"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPaymentMethod: string
  onPaymentMethodSelect: (method: string) => void
  onPayment: () => void
  paymentEpayco: any
  canUseCashOnDelivery?: boolean
}

export default function PaymentModal({
  isOpen,
  onClose,
  selectedPaymentMethod,
  onPaymentMethodSelect,
  onPayment,
  paymentEpayco,
  canUseCashOnDelivery = false,
}: PaymentModalProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-700/50 backdrop-blur-sm w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#66DEDB]/20 rounded-lg">
                <CreditCard className="w-5 h-5 text-[#66DEDB]" />
              </div>
              <h2 className="text-xl font-bold text-[#66DEDB]">Métodos de Pago</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XMark className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => onPaymentMethodSelect("epayco")}
              className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                selectedPaymentMethod === "epayco"
                  ? "border-[#66DEDB] bg-[#66DEDB]/10"
                  : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedPaymentMethod === "epayco" && (
                    <CheckCircleSolid className="w-4 h-4 text-[#66DEDB]" />
                  )}
                  <span className="font-semibold text-white text-sm">ePayco</span>
                </div>
                <div className="text-xs text-gray-400">Pago seguro</div>
              </div>
            </button>
            
            {canUseCashOnDelivery && (
              <button
                onClick={() => onPaymentMethodSelect("cash_on_delivery")}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                  selectedPaymentMethod === "cash_on_delivery"
                    ? "border-[#73FFA2] bg-[#73FFA2]/10"
                    : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedPaymentMethod === "cash_on_delivery" && (
                      <CheckCircleSolid className="w-4 h-4 text-[#73FFA2]" />
                    )}
                    <span className="font-semibold text-white text-sm">Contra Entrega</span>
                  </div>
                  <div className="text-xs text-gray-400">Paga al recibir</div>
                </div>
              </button>
            )}
          </div>

          {/* Actions */}
          {selectedPaymentMethod && (
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium text-sm rounded-lg transition-all"
              >
                Cancelar
              </Button>
              <Button
                onClick={onPayment}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] hover:from-[#5accc9] hover:to-[#66e68f] text-black font-semibold text-sm rounded-lg transition-all"
              >
                Proceder
              </Button>
            </div>
          )}

          {/* ePayco Payment Button */}
          {paymentEpayco && (
            <>
              <Script
                id="epayco-script"
                src="https://checkout.epayco.co/checkout.js"
                strategy="afterInteractive"
              />
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-300 mb-4 text-center">
                  Haz clic para proceder con el pago seguro
                </p>
                <Button
                  type="button"
                  id="epayco-custom-button"
                  className="w-full px-4 py-2 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] hover:from-[#5accc9] hover:to-[#66e68f] text-black font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2"
                  onClick={() => {
                    if (typeof window.ePayco === "undefined") {
                      console.error("ePayco no está cargado correctamente")
                      alert("Error al cargar el sistema de pago. Por favor, intente nuevamente.")
                      return
                    }

                    try {
                      const container = document.createElement("div")
                      container.style.display = "none"
                      container.id = "epayco-container"
                      document.body.appendChild(container)

                      const handler = window.ePayco?.checkout.configure({
                        key: "a5bd3d6eaf8d072b2ad4265bd2dfaed9",
                        test: true,
                      })

                      if (!handler) {
                        throw new Error("No se pudo configurar el checkout de ePayco")
                      }

                      handler.open({
                        amount: paymentEpayco.total_amount,
                        name: "Orden Tanku Test",
                        description: "Pasarela de pago Tanku",
                        currency: "cop",
                        country: "co",
                        external: false,
                        response: `${window.location.origin}/profile?tab=MIS_COMPRAS`,
                        confirmation: `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"}/api/v1/webhook/epayco/${paymentEpayco.id}`,
                        name_billing: paymentEpayco.first_name,
                        mobilephone_billing: paymentEpayco.phone,
                      })
                    } catch (error) {
                      console.error("Error al iniciar el pago con ePayco:", error)
                      alert("Error al iniciar el pago. Por favor, intente nuevamente.")
                    }
                  }}
                >
                  <span>Pagar con ePayco</span>
                  <CreditCard className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

