"use client"
import { TankuProduct, TankuProductVariant } from "../../../../types/global"
import { Button } from "@medusajs/ui"
import { addToCart } from "@lib/data/cart"
import { useRegion } from "@lib/context/region-context" 
import { useRouter } from "next/navigation"

import { useState } from "react"
import { captureUserBehavior } from "@lib/data/events_action_type"

type ProductActionsTankuProps = {
  product: TankuProduct
  disabled?: boolean
}

const ProductActionsTanku: React.FC<ProductActionsTankuProps> = ({
  product,
  disabled = false,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [selectedVariant, setSelectedVariant] = useState<TankuProductVariant | null>(product.variants[0])
  const [isAdding, setIsAdding] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const { region } = useRegion()
  const router = useRouter()

 
 

  // Verificar si todas las opciones han sido seleccionadas
  const allOptionsSelected = product.options.every(option => 
    selectedOptions[option.id] !== undefined
  )

  // Verificar si existe una variante con la combinación seleccionada
  const hasMatchingVariant = product.variants.some((v) => {
    return Object.entries(v.option_values).every(
      ([key, value]) => selectedOptions[key] === value
    )
  })

  // Verificar si la variante seleccionada tiene stock
  const inStock = selectedVariant && (
    !selectedVariant.manage_inventory || 
    selectedVariant.allow_backorder || 
    (selectedVariant.manage_inventory && (selectedVariant.inventory?.quantity_stock || 0) > 0)
  )

  const handleOptionChange = (optionId: string, value: string) => {
    const newOptions = { ...selectedOptions, [optionId]: value }
    setSelectedOptions(newOptions)

    // Encontrar la variante que coincide con las opciones seleccionadas
    const variant = product.variants.find((v) => {
      return Object.entries(v.option_values).every(
        ([key, value]) => newOptions[key] === value
      )
    })

    if (variant) {
      setSelectedVariant(variant)
    } else {
      // Si no hay variante que coincida, establecer selectedVariant a null
      setSelectedVariant(null)
    }
  }

  // Agregar la variante seleccionada al carrito
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)
    captureUserBehavior(product.title + selectedVariant.title, "add_to_cart")
    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: quantity,
        countryCode: region?.countries?.[0]?.iso_2 || "co",
      })
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setIsAdding(false)
    }
  }

  // Comprar ahora - agregar al carrito y redirigir al checkout
  const handleBuyNow = async () => {
    if (!selectedVariant?.id) return null

    setIsBuyingNow(true)
    captureUserBehavior(product.title + selectedVariant.title, "buy_now")
    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: quantity,
        countryCode: region?.countries?.[0]?.iso_2 || "co",
      })
      
      // Redirigir directamente al checkout
      router.push('/checkout')
    } catch (error) {
      console.error("Error in buy now:", error)
    } finally {
      setIsBuyingNow(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div>
        <h3 className="text-xl font-semibold mb-4 text-[#3B9BC3]">Opciones del Producto</h3>
        {product.options.map((option) => (
          <div key={option.id} className="mb-4">
            <h4 className="text-base font-medium mb-2 text-[#3B9BC3]">{option.title}</h4>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => (
                <Button
                  key={value.id}
                  variant="secondary"
                  className={`${selectedOptions[option.id] === value.value ? 'bg-[#3B9BC3] text-white hover:bg-[#2A7A9B]' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                  onClick={() => {handleOptionChange(option.id, value.value)
                    captureUserBehavior(value.value, "navigation")
                  }}
                  disabled={disabled}
                >
                  {value.value}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-y-2">
        {selectedVariant ? (
          <>
            <div className="flex items-center justify-between text-xl">
              <span className="text-[#3B9BC3] font-medium">Precio:</span>
              <span className="text-[#66DEDB] font-bold">
                {selectedVariant.inventory?.price 
                  ? new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: selectedVariant.inventory.currency_code || 'COP',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(selectedVariant.inventory.price)
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#3B9BC3] font-medium">Stock disponible:</span>
              <span className="text-[#66DEDB]">{selectedVariant.inventory?.quantity_stock} unidades</span>
            </div>
            <div className="flex items-center justify-between gap-x-2 mt-2">
              <span className="text-[#3B9BC3] font-medium">Cantidad:</span>
              <input
                type="number"
                min="1"
                max={selectedVariant.inventory?.quantity_stock || 1}
                value={quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value || "1")
                  if (value > 0 && value <= (selectedVariant.inventory?.quantity_stock || 1)) {
                    setQuantity(value)
                  }
                }}
                className="w-20 px-2 py-1 border rounded-md bg-gray-100 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3B9BC3]"
              />
            </div>
          </>
        ) : allOptionsSelected && (
          <div className="text-red-500 text-center">
            No existe producto con esta combinación
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleAddToCart}
            disabled={disabled || !selectedVariant || !selectedVariant.inventory?.quantity_stock || !hasMatchingVariant || isAdding || isBuyingNow}
            className="w-full bg-[#3B9BC3] hover:bg-[#2A7A9B] text-white border-none"
            isLoading={isAdding}
          >
            {!allOptionsSelected ? "Selecciona una opción" :
             !hasMatchingVariant ? "Combinación no disponible" :
             !selectedVariant?.inventory?.quantity_stock ? "Sin stock" :
             isAdding ? "Agregando..." :
             "Agregar al carrito"}
          </Button>
          
          {/* Botón Comprar ahora */}
          {selectedVariant?.inventory?.quantity_stock && hasMatchingVariant && allOptionsSelected && (
            <Button
              onClick={handleBuyNow}
              disabled={disabled || !selectedVariant || !selectedVariant.inventory?.quantity_stock || !hasMatchingVariant || isAdding || isBuyingNow}
              className="w-full bg-[#73FFA2] hover:bg-[#66e68f] text-black font-semibold border-none"
              isLoading={isBuyingNow}
            >
              {isBuyingNow ? "Procesando..." : "Comprar ahora"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductActionsTanku
