"use client"

import { useRef } from "react"
import Image from "next/image"
import { 
  useStalkerGift, 
  getContactMethodLabel, 
  getContactMethodIcon,
  ContactMethod,
  Product
} from "../../../../../../lib/context"

interface ProductSelectionViewProps {
  onBack: () => void
  onProceedToCheckout: () => void
  products: Product[]
  isLoadingProducts: boolean
  isFloatingButtonVisible: boolean
  originalButtonRef: React.RefObject<HTMLDivElement | null>
}

export default function ProductSelectionView({ 
  onBack, 
  onProceedToCheckout, 
  products, 
  isLoadingProducts,
  isFloatingButtonVisible,
  originalButtonRef
}: ProductSelectionViewProps) {
  const { 
    stalkerGiftData, 
    toggleProductSelection, 
    getFilledContactMethods,
    isProductSelected 
  } = useStalkerGift()

  const filledMethods = getFilledContactMethods()

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-[#66DEDB] hover:text-[#5FE085] transition-colors duration-300"
        >
          <span className="mr-2">←</span> Volver al formulario
        </button>
      </div>

      {/* Resumen de datos ingresados */}
      <div className="bg-gradient-to-r from-[#66DEDB]/10 to-[#5FE085]/10 border border-[#66DEDB]/30 rounded-2xl p-6 mb-8">
        <h2 className="text-2xl font-bold text-[#66DEDB] mb-6 text-center">
          📋 Resumen de tu Regalo Anónimo
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Información del remitente */}
          <div className="bg-[#262626]/30 rounded-xl p-4 border border-[#66DEDB]/20">
            <h3 className="text-lg font-semibold text-[#66DEDB] mb-3 flex items-center">
              <span className="mr-2">🎭</span> Tu Alias
            </h3>
            <p className="text-gray-300">{stalkerGiftData.alias}</p>
          </div>

          {/* Información del destinatario */}
          <div className="bg-[#262626]/30 rounded-xl p-4 border border-[#66DEDB]/20">
            <h3 className="text-lg font-semibold text-[#66DEDB] mb-3 flex items-center">
              <span className="mr-2">👤</span> Destinatario
            </h3>
            <p className="text-gray-300 mb-2">{stalkerGiftData.recipient.name}</p>
            <div className="space-y-1">
              {filledMethods.map((method: ContactMethod) => (
                <div key={method.type} className="flex items-center text-sm text-gray-400">
                  <span className="mr-2">{getContactMethodIcon(method.type)}</span>
                  <span className="mr-2">{getContactMethodLabel(method.type)}:</span>
                  <span>{method.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selección de productos */}
      <div className="bg-gradient-to-r from-[#66DEDB]/10 to-[#5FE085]/10 border border-[#66DEDB]/30 rounded-2xl p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#66DEDB] mb-2">
            🎁 Selecciona los Productos para Regalar
          </h2>
          <p className="text-gray-300">
            Puedes seleccionar múltiples productos para crear el regalo perfecto
          </p>
          {stalkerGiftData.selectedProducts.length > 0 && (
            <p className="text-[#5FE085] text-sm mt-2">
              ✨ {stalkerGiftData.selectedProducts.length} producto(s) seleccionado(s)
            </p>
          )}
        </div>

        {/* Lista de productos */}
        {isLoadingProducts ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#66DEDB]"></div>
            <p className="text-gray-300 mt-4">Cargando productos...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className={`relative bg-[#262626]/30 border-2 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-105 ${
                  isProductSelected(product.id)
                    ? 'border-[#66DEDB] shadow-lg shadow-[#66DEDB]/20'
                    : 'border-[#66DEDB]/20 hover:border-[#66DEDB]/50'
                }`}
                onClick={() => toggleProductSelection(product)}
              >
                {/* Checkbox */}
                <div className="absolute top-2 right-2 z-10">
                  <input
                    type="checkbox"
                    checked={isProductSelected(product.id)}
                    onChange={() => toggleProductSelection(product)}
                    className="w-5 h-5 text-[#66DEDB] bg-[#262626] border-[#66DEDB]/30 rounded focus:ring-[#66DEDB] focus:ring-2"
                  />
                </div>

                {/* Imagen del producto */}
                <div className="w-full h-32 sm:h-40 relative mb-3 overflow-hidden rounded-lg">
                  <Image
                    src={product.thumbnail || '/placeholder.png'}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Información del producto */}
                <h3 className="text-sm sm:text-base font-semibold text-white mb-2 line-clamp-2">
                  {product.title}
                </h3>

                {/* Precio */}
                <div className="text-sm sm:text-base font-bold text-[#66DEDB]">
                  {product.variants?.[0]?.inventory?.currency_code || '$'} {' '}
                  {product.variants?.[0]?.inventory?.price?.toLocaleString() || '0'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">No se encontraron productos disponibles</p>
          </div>
        )}

        {/* Botón de continuar */}
        {stalkerGiftData.selectedProducts.length > 0 && (
          <div ref={originalButtonRef} className="mt-8 text-center">
            <button
              onClick={onProceedToCheckout}
              className="bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 hover:shadow-2xl hover:shadow-[#3B9BC3]/50 transition-all duration-300"
            >
              Continuar con el Envío ({stalkerGiftData.selectedProducts.length} productos)
            </button>
          </div>
        )}
      </div>

      {/* Mensaje de confianza */}
      <div className="mt-6 text-center">
        <p className="text-[#66DEDB]/80 text-sm font-medium">
          🔒 Tu identidad permanecerá en secreto hasta que decidas revelarla
        </p>
      </div>
    </div>
  )
}
