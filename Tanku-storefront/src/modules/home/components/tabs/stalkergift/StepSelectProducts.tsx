"use client"

import { useState, useEffect } from "react"
import {
  ShoppingBag,
  Heart,
  Plus,
  Minus,
  InformationCircleSolid,
  XMark
} from "@medusajs/icons"
import Image from "next/image"
import { getProducts, getProductPrice, MedusaProduct } from "@/lib/data/products"

// Tipos
type Product = MedusaProduct

interface WishList {
  id: string
  title: string
  state: {
    id: string
    state: string
  }
  products?: Product[]
}

interface SelectedProduct {
  product: Product
  quantity: number
  variantId?: string
}

interface StepSelectProductsProps {
  recipientId: string
  recipientName: string
  onContinue: (products: SelectedProduct[], totalAmount: number) => void
  onBack: () => void
  initialProducts?: SelectedProduct[]
}

export default function StepSelectProducts({
  recipientId,
  recipientName,
  onContinue,
  onBack,
  initialProducts = [],
}: StepSelectProductsProps) {
  const [wishlists, setWishlists] = useState<WishList[]>([])
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(initialProducts)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"wishlists" | "suggestions">("wishlists")
  const [selectedWishlistId, setSelectedWishlistId] = useState<string | null>(null)
  const [error, setError] = useState<string>("")

  // Cargar wishlists públicas del destinatario
  useEffect(() => {
    loadRecipientWishlists()
  }, [recipientId])

  // Cargar productos sugeridos cuando se cambia a la pestaña de sugerencias
  useEffect(() => {
    if (activeTab === "suggestions" && suggestedProducts.length === 0 && !isLoading) {
      loadSuggestedProducts()
    }
  }, [activeTab, isLoading])

  const loadRecipientWishlists = async () => {
    setIsLoading(true)
    setError("")

    try {
      // TODO: Reemplazar con llamada real al API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/wish-list/${recipientId}`,
        {
          credentials: "include",
          headers: {
            "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
          },
        }
      )

      if (!response.ok) {
        throw new Error("Error al cargar wishlists")
      }

      const data = await response.json()

      // Filtrar solo wishlists públicas
      const publicWishlists = data.data?.filter(
        (wl: WishList) => wl.state?.state === "PUBLIC" || wl.state?.id === "PUBLIC_ID"
      ) || []

      setWishlists(publicWishlists)

      // Si no hay wishlists públicas, cambiar a sugerencias
      if (publicWishlists.length === 0) {
        setActiveTab("suggestions")
      } else {
        setSelectedWishlistId(publicWishlists[0]?.id || null)
      }
    } catch (error) {
      console.error("Error loading wishlists:", error)
      setError("Error al cargar las listas de deseos")
      // Fallback a productos sugeridos
      setActiveTab("suggestions")
    } finally {
      setIsLoading(false)
    }
  }

  const loadSuggestedProducts = async () => {
    try {
      // Usar el servicio de productos con región Colombia y moneda COP
      const data = await getProducts({
        limit: 12,
        region_id: "reg_01K8XGKQ9ZQXQXQXQXQXQXQXQX", // Opcional: ID de región Colombia
        currency_code: "COP",
        expand: "variants,variants.prices", // Expandir variantes y precios
      })

      setSuggestedProducts(data.products || [])
    } catch (error) {
      console.error("Error loading suggested products:", error)
      setSuggestedProducts([])
    }
  }

  // Agregar producto a la selección
  const addProduct = (product: Product, variantId?: string) => {
    const existingIndex = selectedProducts.findIndex(
      (sp) => sp.product.id === product.id && sp.variantId === variantId
    )

    if (existingIndex >= 0) {
      // Incrementar cantidad
      const updated = [...selectedProducts]
      updated[existingIndex].quantity += 1
      setSelectedProducts(updated)
    } else {
      // Agregar nuevo producto
      setSelectedProducts([
        ...selectedProducts,
        { product, quantity: 1, variantId },
      ])
    }
  }

  // Remover producto de la selección
  const removeProduct = (productId: string, variantId?: string) => {
    setSelectedProducts(
      selectedProducts.filter(
        (sp) => !(sp.product.id === productId && sp.variantId === variantId)
      )
    )
  }

  // Actualizar cantidad
  const updateQuantity = (productId: string, delta: number, variantId?: string) => {
    const updated = selectedProducts.map((sp) => {
      if (sp.product.id === productId && sp.variantId === variantId) {
        const newQuantity = sp.quantity + delta
        return newQuantity > 0 ? { ...sp, quantity: newQuantity } : sp
      }
      return sp
    })

    // Filtrar productos con cantidad 0
    setSelectedProducts(updated.filter((sp) => sp.quantity > 0))
  }

  // Calcular total
  const calculateTotal = (): number => {
    return selectedProducts.reduce((total, sp) => {
      const priceData = getProductPrice(sp.product)
      const price = priceData.amount / 100 // Medusa guarda precios en centavos
      return total + price * sp.quantity
    }, 0)
  }

  const formatPrice = (amount: number, currencyCode: string = "COP"): string => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleContinue = () => {
    if (selectedProducts.length === 0) {
      setError("Debes seleccionar al menos un producto")
      return
    }

    const total = calculateTotal()
    onContinue(selectedProducts, total)
  }

  const ProductCard = ({ product }: { product: Product }) => {
    const isSelected = selectedProducts.some((sp) => sp.product.id === product.id)
    const selectedItem = selectedProducts.find((sp) => sp.product.id === product.id)
    const priceData = getProductPrice(product)
    const price = priceData.amount / 100 // Medusa guarda precios en centavos
    const currencyCode = priceData.currency_code

    return (
      <div
        className={`
          group relative bg-gradient-to-br from-[#262626] to-[#66DEDB]/10
          border-2 rounded-xl overflow-hidden transition-all duration-300
          ${
            isSelected
              ? "border-[#66DEDB] shadow-lg shadow-[#66DEDB]/30"
              : "border-[#66DEDB]/30 hover:border-[#66DEDB]/60"
          }
        `}
      >
        {/* Badge de seleccionado */}
        {isSelected && (
          <div className="absolute top-2 right-2 z-10 bg-[#66DEDB] text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
            <span>✓</span>
            <span>x{selectedItem?.quantity}</span>
          </div>
        )}

        {/* Imagen del producto */}
        <div className="relative aspect-square bg-[#1a1a1a]">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-16 h-16 text-gray-600" />
            </div>
          )}
        </div>

        {/* Info del producto */}
        <div className="p-4">
          <h3 className="text-white font-semibold mb-2 line-clamp-2 min-h-[3rem]">
            {product.title}
          </h3>
          <p className="text-[#66DEDB] font-bold text-lg mb-3">
            {formatPrice(price, currencyCode)}
          </p>

          {/* Controles */}
          {isSelected ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 bg-[#1a1a1a] rounded-lg p-1">
                <button
                  onClick={() => updateQuantity(product.id, -1)}
                  className="w-8 h-8 flex items-center justify-center bg-[#66DEDB]/20 hover:bg-[#66DEDB]/30 text-[#66DEDB] rounded transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-white font-bold min-w-[2rem] text-center">
                  {selectedItem?.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(product.id, 1)}
                  className="w-8 h-8 flex items-center justify-center bg-[#66DEDB]/20 hover:bg-[#66DEDB]/30 text-[#66DEDB] rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => removeProduct(product.id)}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg transition-colors flex items-center space-x-1"
              >
                <XMark className="w-4 h-4" />
                <span className="text-sm">Quitar</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => addProduct(product)}
              className="w-full py-2 bg-gradient-to-r from-[#66DEDB] to-[#5FE085] hover:shadow-lg hover:shadow-[#66DEDB]/30 text-white font-semibold rounded-lg transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-[#66DEDB] hover:text-[#66DEDB]/80 transition-colors mb-4 flex items-center space-x-2"
        >
          <span>←</span>
          <span>Volver</span>
        </button>

        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-r from-[#66DEDB] to-[#66DEDB]/70 rounded-full px-6 py-2 mb-4">
            <h2 className="text-2xl font-bold text-white">
              Selecciona los Productos
            </h2>
          </div>
          <p className="text-gray-300">
            Elige los regalos que quieres enviar a <span className="text-[#66DEDB] font-semibold">{recipientName}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      {wishlists.length > 0 && (
        <div className="flex space-x-2 mb-6 border-b border-[#66DEDB]/20">
          <button
            onClick={() => setActiveTab("wishlists")}
            className={`
              flex-1 py-3 px-4 font-semibold transition-all relative
              ${
                activeTab === "wishlists"
                  ? "text-[#66DEDB]"
                  : "text-gray-400 hover:text-gray-300"
              }
            `}
          >
            <div className="flex items-center justify-center space-x-2">
              <Heart className="w-5 h-5" />
              <span>Lista de Deseos</span>
            </div>
            {activeTab === "wishlists" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#66DEDB]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("suggestions")}
            className={`
              flex-1 py-3 px-4 font-semibold transition-all relative
              ${
                activeTab === "suggestions"
                  ? "text-[#66DEDB]"
                  : "text-gray-400 hover:text-gray-300"
              }
            `}
          >
            <div className="flex items-center justify-center space-x-2">
              <ShoppingBag className="w-5 h-5" />
              <span>Sugerencias</span>
            </div>
            {activeTab === "suggestions" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#66DEDB]" />
            )}
          </button>
        </div>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#66DEDB] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Wishlists */}
          {activeTab === "wishlists" && wishlists.length > 0 && (
            <div>
              {/* Selector de wishlist */}
              {wishlists.length > 1 && (
                <div className="mb-6">
                  <label className="text-white font-semibold mb-2 block">
                    Selecciona una lista:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {wishlists.map((wl) => (
                      <button
                        key={wl.id}
                        onClick={() => setSelectedWishlistId(wl.id)}
                        className={`
                          px-4 py-2 rounded-lg font-semibold transition-all
                          ${
                            selectedWishlistId === wl.id
                              ? "bg-[#66DEDB] text-white"
                              : "bg-[#262626] text-gray-300 hover:bg-[#66DEDB]/20"
                          }
                        `}
                      >
                        {wl.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Productos de la wishlist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {wishlists
                  .find((wl) => wl.id === selectedWishlistId)
                  ?.products?.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  )) || (
                  <div className="col-span-full text-center py-12">
                    <Heart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Esta lista está vacía</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Productos sugeridos */}
          {activeTab === "suggestions" && (
            <div>
              {wishlists.length === 0 && (
                <div className="bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-xl p-4 mb-6 flex items-start space-x-3">
                  <InformationCircleSolid className="w-5 h-5 text-[#66DEDB] flex-shrink-0 mt-0.5" />
                  <p className="text-[#66DEDB] text-sm">
                    {recipientName} no tiene listas de deseos públicas. Aquí hay
                    algunos productos sugeridos que podrían interesarle.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {suggestedProducts.length > 0 ? (
                  suggestedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <ShoppingBag className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">
                      No hay productos disponibles en este momento
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Resumen de selección fijo en la parte inferior */}
      {selectedProducts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a] to-transparent p-6 z-50">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-[#262626] to-[#66DEDB]/10 border-2 border-[#66DEDB] rounded-xl p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-[#66DEDB] rounded-full w-12 h-12 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">
                      {selectedProducts.length}{" "}
                      {selectedProducts.length === 1 ? "producto" : "productos"}{" "}
                      seleccionados
                    </p>
                    <p className="text-white text-2xl font-bold">
                      {formatPrice(calculateTotal())}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleContinue}
                  className="px-8 py-4 bg-gradient-to-r from-[#66DEDB] to-[#5FE085] hover:shadow-lg hover:shadow-[#66DEDB]/30 text-white font-bold rounded-xl transition-all hover:scale-[1.02]"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500/20 border border-red-500 text-red-500 px-4 py-3 rounded-lg z-50">
          {error}
        </div>
      )}

      {/* Espacio para el resumen fijo */}
      {selectedProducts.length > 0 && <div className="h-32" />}
    </div>
  )
}