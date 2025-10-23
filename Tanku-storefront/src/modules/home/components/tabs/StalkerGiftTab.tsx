"use client"

import { useState } from "react"
import { useStalkerGift } from "../../../../lib/context"
import { 
  IntroView, 
  ForMeView, 
  ForTankuUserView, 
  ForExternalUserView, 
  ProductSelectionView, 
  CheckoutView 
} from "./stalkergift/views"
import { useProducts, usePayment, useFloatingButton } from "./stalkergift/hooks"

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

type StalkerGiftOption = 'intro' | 'for-me' | 'for-tanku-user' | 'for-external-user' | 'product-selection' | 'checkout'

export default function StalkerGiftTab() {
  const [currentView, setCurrentView] = useState<StalkerGiftOption>('intro')
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
    setPaymentEpayco
  } = usePayment()
  const { isFloatingButtonVisible, originalButtonRef } = useFloatingButton(currentView)

  // Funciones de navegación
  const handleSelectOption = (option: 'for-me' | 'for-tanku-user' | 'for-external-user') => {
    setCurrentView(option)
  }

  const handleBackToIntro = () => {
    setCurrentView('intro')
  }

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
    <>
      {(() => {
        switch (currentView) {
          case 'for-me':
            return <ForMeView onBack={handleBackToIntro} />
          case 'for-tanku-user':
            return <ForTankuUserView onBack={handleBackToIntro} />
          case 'for-external-user':
            return <ForExternalUserView 
              onBack={handleBackToIntro} 
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
            return <CheckoutView 
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
            />
          default:
            return <IntroView onSelectOption={handleSelectOption} />
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
    </>
  )
}