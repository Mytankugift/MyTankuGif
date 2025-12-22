"use client"

import { useState } from "react"
import { useStalkerGift } from "@lib/context"
import { 
  ForExternalUserView, 
  ProductSelectionView, 
} from "@modules/home/components/tabs/stalkergift/views"
import CheckoutViewUsersOutside from "@modules/home/components/tabs/stalkergift/views/CheckoutViewUsersOutside"
import { useProducts, usePayment, useFloatingButton } from "@modules/home/components/tabs/stalkergift/hooks"

// Declaración para TypeScript para el objeto ePayco en window
declare global {
  interface Window {
    ePayco?: {
      checkout: {
        configure: (config: any) => {
          open: (options: any) => void
        }
      }
    }
  }
}

type ExternalGiftView = 'for-external-user' | 'product-selection' | 'checkout'

export default function ExternalGiftPage() {
  const [currentView, setCurrentView] = useState<ExternalGiftView>('for-external-user')
  const { stalkerGiftData } = useStalkerGift()
  
  // Hooks personalizados
  const { products, isLoadingProducts, loadProducts } = useProducts()
  const { 
    selectedPaymentMethod,
    paymentEpayco,
    isProcessingPayment,
    createdOrder,
    showInvitationUrl,
    paymentStatus,
    paymentDetails,
    calculateTotals,
    handlePaymentMethodSelect,
    copyToClipboard,
    setPaymentEpayco,
    setCreatedOrder,
    setPaymentStatus,
    setShowInvitationUrl,
    setIsProcessingPayment,
    setSelectedPaymentMethod
  } = usePayment()
  const { isFloatingButtonVisible, originalButtonRef } = useFloatingButton(currentView)

  const handleBackToExternalUser = () => {
    setCurrentView('for-external-user')
  }

  const handleBackToProductSelection = () => {
    setCurrentView('product-selection')
  }

  const handleSubmitExternalUser = async () => {
    // Cargar productos y cambiar a vista de selección
    await loadProducts()
    setCurrentView('product-selection')
  }

  const handleProceedToCheckout = () => {
    setCurrentView('checkout')
  }

  // Renderizar vista según el estado actual
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#1E1E1E" }}>
      {(() => {
        switch (currentView) {
          case 'for-external-user':
            return <ForExternalUserView 
              onBack={() => window.history.back()} 
              onSubmit={handleSubmitExternalUser} 
            />
          case 'product-selection':
            return <ProductSelectionView 
              onBack={handleBackToExternalUser}
              onProceedToCheckout={handleProceedToCheckout}
              products={products}
              isLoadingProducts={isLoadingProducts}
              isFloatingButtonVisible={isFloatingButtonVisible}
              originalButtonRef={originalButtonRef}
            />
          case 'checkout':
            return <CheckoutViewUsersOutside
              onBack={handleBackToProductSelection}
              calculateTotals={calculateTotals}
              selectedPaymentMethod={selectedPaymentMethod}
              paymentEpayco={paymentEpayco}
              isProcessingPayment={isProcessingPayment}
              createdOrder={createdOrder}
              showInvitationUrl={showInvitationUrl}
              paymentStatus={paymentStatus}
              paymentDetails={paymentDetails}
              onPaymentMethodSelect={handlePaymentMethodSelect}
              copyToClipboard={copyToClipboard}
              setPaymentEpayco={setPaymentEpayco}
              setCreatedOrder={setCreatedOrder}
              setPaymentStatus={setPaymentStatus}
              setShowInvitationUrl={setShowInvitationUrl}
              setIsProcessingPayment={setIsProcessingPayment}
              setSelectedPaymentMethod={setSelectedPaymentMethod}
            />
          default:
            return <ForExternalUserView 
              onBack={() => window.history.back()} 
              onSubmit={handleSubmitExternalUser} 
            />
        }
      })()}

      {/* Botón flotante */}
      {isFloatingButtonVisible && (
        <div className="fixed bottom-6 right-[40%] z-50 animate-bounce">
          <button
            onClick={handleProceedToCheckout}
            className="px-6 py-3 bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] text-white font-semibold rounded-full shadow-2xl hover:scale-110 hover:shadow-[#3B9BC3]/50 transition-all duration-300 flex items-center space-x-2"
          >
            <span>🛒</span>
            <span>Continuar ({stalkerGiftData.selectedProducts.length})</span>
          </button>
        </div>
      )}
    </div>
  )
}

