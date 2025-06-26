"use client"
import { TankuProduct, TankuProductVariant } from "../../../../types/global"
import { Button } from "@medusajs/ui"
import { addToCart } from "@lib/data/cart"
import { useRegion } from "@lib/context/region-context" 

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
  const [quantity, setQuantity] = useState(1)
  const { region } = useRegion()

 
 

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

  return (
    <div className="flex flex-col gap-y-4">
      <div>
        <h3 className="text-xl-semi mb-4">Opciones del Producto</h3>
        {product.options.map((option) => (
          <div key={option.id} className="mb-4">
            <h4 className="text-base-semi mb-2">{option.title}</h4>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => (
                <Button
                  key={value.id}
                  variant={selectedOptions[option.id] === value.value ? "primary" : "secondary"}
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
              <span>Precio:</span>
              <span>{selectedVariant.inventory?.price} {selectedVariant.inventory?.currency_code}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Stock disponible:</span>
              <span>{selectedVariant.inventory?.quantity_stock} unidades</span>
            </div>
            <div className="flex items-center justify-between gap-x-2 mt-2">
              <span>Cantidad:</span>
              <input
                type="number"
                min="1"
                max={selectedVariant.inventory?.quantity_stock || 1}
                value={quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (value > 0 && value <= (selectedVariant.inventory?.quantity_stock || 1)) {
                    setQuantity(value)
                  }
                }}
                className="w-20 px-2 py-1 border rounded-md"
              />
            </div>
          </>
        ) : allOptionsSelected && (
          <div className="text-red-500 text-center">
            No existe producto con esta combinación
          </div>
        )}
        <Button
          onClick={handleAddToCart}
          disabled={disabled || !selectedVariant || !selectedVariant.inventory?.quantity_stock || !hasMatchingVariant || isAdding}
          className="w-full"
          isLoading={isAdding}
        >
          {!allOptionsSelected ? "Selecciona todas las opciones" :
           !hasMatchingVariant ? "Combinación no disponible" :
           !selectedVariant?.inventory?.quantity_stock ? "Sin stock" :
           isAdding ? "Agregando..." :
           "Agregar al carrito"}
        </Button>
      </div>
    </div>
  )
}

export default ProductActionsTanku
