"use client"

import { useState, useEffect } from "react"
import SelectableUsersList, { SelectableUser } from "../components/SelectableUsersList"
import { getPublicWishlists, PublicWishlist, WishlistProduct } from "../../../../../social/actions/get-public-wishlists"
import { getProductSuggestions, ProductSuggestion } from "../../../../../social/actions/get-product-suggestions"
import CheckoutView from "./CheckoutView"
import OrderSummaryView from "./OrderSummaryView"
import { usePersonalInfo } from "../../../../../../lib/context"

interface ForTankuUserViewProps {
  onBack: () => void
  currentUserName?: string
}

export default function ForTankuUserView({ onBack, currentUserName = "Usuario" }: ForTankuUserViewProps) {
  const { personalInfo } = usePersonalInfo()
  const [selectedUser, setSelectedUser] = useState<SelectableUser | null>(null)
  const [wishlists, setWishlists] = useState<PublicWishlist[]>([])
  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showWishlists, setShowWishlists] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<(WishlistProduct | ProductSuggestion)[]>([])
  const [pseudonym, setPseudonym] = useState("")
  const [showPseudonymInput, setShowPseudonymInput] = useState(false)
  const [currentView, setCurrentView] = useState<'selection' | 'checkout' | 'summary'>('selection')
  const [orderId, setOrderId] = useState("")

  // Obtener el nombre real del usuario actual
  const realUserName = personalInfo ? `${personalInfo.first_name} ${personalInfo.last_name}`.trim() : currentUserName

  const handleUserSelect = async (user: SelectableUser) => {
    setSelectedUser(user)
    setIsLoading(true)
    setShowWishlists(false)
    setShowSuggestions(false)
    setSelectedProducts([]) // Limpiar productos seleccionados al cambiar usuario
    setPseudonym("") // Limpiar seudónimo al cambiar usuario
    setShowPseudonymInput(false) // Cerrar input de seudónimo si está abierto
    
    try {
      // Intentar obtener wishlists públicas
      const wishlistsResponse = await getPublicWishlists(user.id)
      
      if (wishlistsResponse.success && wishlistsResponse.data.length > 0) {
        // Verificar si las wishlists tienen productos
        const wishlistsWithProducts = wishlistsResponse.data.filter(wishlist => 
          wishlist.products && wishlist.products.length > 0
        )
        
        if (wishlistsWithProducts.length > 0) {
          // Hay wishlists con productos - solo mostrar wishlists
          setWishlists(wishlistsWithProducts)
          setShowWishlists(true)
          setShowSuggestions(false)
        } else {
          // Hay wishlists pero están vacías - mostrar wishlists vacías + sugerencias
          setWishlists(wishlistsResponse.data)
          setShowWishlists(true)
          
          // También obtener sugerencias
          const suggestionsResponse = await getProductSuggestions(15)
          if (suggestionsResponse.success) {
            setProductSuggestions(suggestionsResponse.data)
            setShowSuggestions(true)
          }
        }
      } else {
        // No hay wishlists públicas - solo mostrar sugerencias
        const suggestionsResponse = await getProductSuggestions(15)
        if (suggestionsResponse.success) {
          setProductSuggestions(suggestionsResponse.data)
          setShowSuggestions(true)
          setShowWishlists(false)
        }
      }
    } catch (error) {
      console.error("Error al cargar datos del usuario:", error)
      // En caso de error, mostrar sugerencias
      try {
        const suggestionsResponse = await getProductSuggestions(15)
        if (suggestionsResponse.success) {
          setProductSuggestions(suggestionsResponse.data)
          setShowSuggestions(true)
          setShowWishlists(false)
        }
      } catch (suggestionError) {
        console.error("Error al cargar sugerencias:", suggestionError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const toggleProductSelection = (product: WishlistProduct | ProductSuggestion) => {
    setSelectedProducts(prev => {
      const isSelected = prev.some(p => p.id === product.id)
      if (isSelected) {
        return prev.filter(p => p.id !== product.id)
      } else {
        return [...prev, product]
      }
    })
  }

  const isProductSelected = (productId: string) => {
    return selectedProducts.some(p => p.id === productId)
  }

  const handlePseudonymSubmit = () => {
    if (pseudonym.trim()) {
      setShowPseudonymInput(false)
    }
  }

  const handleContinueToCheckout = () => {
    if (selectedProducts.length === 0) {
      alert("Por favor selecciona al menos un producto")
      return
    }
    // El seudónimo es opcional, no bloqueamos si está vacío
    setCurrentView('checkout')
  }

  const handleCompleteOrder = () => {
    // Generar un ID de orden simulado
    const newOrderId = `STG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    setOrderId(newOrderId)
    setCurrentView('summary')
  }

  const handleNewGift = () => {
    // Resetear todo para empezar de nuevo
    setSelectedUser(null)
    setWishlists([])
    setProductSuggestions([])
    setSelectedProducts([])
    setPseudonym("")
    setShowPseudonymInput(false)
    setCurrentView('selection')
    setOrderId("")
  }

  // Mostrar vista de checkout
  if (currentView === 'checkout' && selectedUser) {
    return (
      <CheckoutView
        selectedUser={selectedUser}
        pseudonym={pseudonym || realUserName}
        selectedProducts={selectedProducts}
        onBack={() => setCurrentView('selection')}
        onCompleteOrder={handleCompleteOrder}
      />
    )
  }

  // Mostrar vista de resumen
  if (currentView === 'summary' && selectedUser && orderId) {
    return (
      <OrderSummaryView
        selectedUser={selectedUser}
        pseudonym={pseudonym || realUserName}
        selectedProducts={selectedProducts}
        orderId={orderId}
        onNewGift={handleNewGift}
      />
    )
  }

  // Vista de selección (por defecto)
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-[#66DEDB] hover:text-[#5FE085] transition-colors duration-300"
        >
          <span className="mr-2">←</span> Volver a opciones
        </button>
      </div>

      <div className="bg-gradient-to-r from-[#66DEDB]/10 to-[#5FE085]/10 border border-[#66DEDB]/30 rounded-2xl p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#66DEDB] mb-2">
            🎁 Regalo Para Usuario Tanku
          </h2>
          <p className="text-gray-300">
            Selecciona un usuario registrado en Tanku para enviarle un regalo anónimo
          </p>
        </div>
    
        <SelectableUsersList 
          onUserSelect={handleUserSelect}
          selectedUserId={selectedUser?.id}
        />

        {/* Información del usuario seleccionado */}
        {selectedUser && (
          <div className="mt-6 bg-[#262626]/30 rounded-xl p-4 border border-[#66DEDB]/20">
            <div className="flex items-center space-x-4">
              <div className="relative w-12 h-12">
                <img
                  src="/feed/avatar.png"
                  alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                  className="w-full h-full rounded-full object-cover border-2 border-[#66DEDB]"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h3>
                <p className="text-gray-400 text-sm">{selectedUser.email}</p>
                <p className="text-[#66DEDB] text-xs">ID: {selectedUser.id}</p>
              </div>
              <div className="ml-auto">
                <div className="text-[#5FE085] flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Seleccionado</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input de seudónimo */}
        {selectedUser && (
          <div className="mt-6 bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
            <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">🎭</span>
              Seudónimo del Remitente
            </h3>
            {!showPseudonymInput ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white mb-2">
                    {pseudonym ? `Seudónimo: "${pseudonym}"` : "No has ingresado un seudónimo"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {pseudonym 
                      ? "El destinatario verá este seudónimo" 
                      : "El destinatario verá tu nombre real (seudónimo opcional)"
                    }
                  </p>
                </div>
                <button
                  onClick={() => setShowPseudonymInput(true)}
                  className="bg-[#66DEDB] text-white px-4 py-2 rounded-lg hover:bg-[#5FE085] transition-colors"
                >
                  {pseudonym ? "Cambiar" : "Ingresar"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Ingresa tu seudónimo (opcional)
                  </label>
                  <input
                    type="text"
                    value={pseudonym}
                    onChange={(e) => setPseudonym(e.target.value)}
                    placeholder="Ej: Un amigo secreto, Tu crush, etc. (opcional)"
                    className="w-full px-4 py-3 bg-[#1E1E1E] border border-[#66DEDB]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66DEDB] focus:border-transparent"
                    maxLength={50}
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    Máximo 50 caracteres. Puedes dejarlo vacío para enviar con tu nombre real.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handlePseudonymSubmit}
                    className="bg-[#66DEDB] text-white px-6 py-2 rounded-lg hover:bg-[#5FE085] transition-colors"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setShowPseudonymInput(false)}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="mt-6 text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#66DEDB]"></div>
            <p className="text-gray-300 mt-4">Cargando datos del usuario...</p>
          </div>
        )}

        {/* Wishlists públicas */}
        {showWishlists && wishlists.length > 0 && (
          <div className="mt-6 bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
            <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">📋</span>
              Wishlists Públicas ({wishlists.length})
            </h3>
            <div className="space-y-4">
              {wishlists.map((wishlist) => (
                <div key={wishlist.id} className="bg-[#1E1E1E]/50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">{wishlist.title}</h4>
                  {wishlist.products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {wishlist.products.map((product) => (
                        <div 
                          key={product.id} 
                          onClick={() => toggleProductSelection(product)}
                          className={`bg-[#262626]/50 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:scale-105 ${
                            isProductSelected(product.id) 
                              ? 'ring-2 ring-[#66DEDB] bg-[#66DEDB]/20' 
                              : 'hover:bg-[#66DEDB]/10'
                          }`}
                        >
                          <div className="w-full h-24 relative mb-2 overflow-hidden rounded-lg">
                            <img
                              src={product.thumbnail || '/placeholder.png'}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                            {isProductSelected(product.id) && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-[#66DEDB] rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <h5 className="text-sm font-medium text-white line-clamp-2">{product.title}</h5>
                          {product.variants && product.variants.length > 0 && product.variants[0].inventory?.price && product.variants[0].inventory.price > 0 ? (
                            <p className="text-[#66DEDB] text-xs font-semibold mt-1">
                              {product.variants[0].inventory.currency_code} {product.variants[0].inventory.price.toLocaleString()}
                            </p>
                          ) : (
                            <p className="text-gray-400 text-xs mt-1">Precio no disponible</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">Esta wishlist no tiene productos</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje cuando las wishlists están vacías */}
        {showWishlists && wishlists.length > 0 && wishlists.every(wishlist => !wishlist.products || wishlist.products.length === 0) && (
          <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl mr-2">📋</span>
              <h3 className="text-lg font-semibold text-yellow-400">Wishlists Vacías</h3>
            </div>
            <p className="text-yellow-300 text-sm">
              Este usuario tiene wishlists públicas pero no contienen productos. 
              Te mostramos sugerencias de productos para elegir.
            </p>
          </div>
        )}

        {/* Sugerencias de productos */}
        {showSuggestions && productSuggestions.length > 0 && (
          <div className="mt-6 bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
            <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">💡</span>
              Sugerencias de Productos ({productSuggestions.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {productSuggestions.map((product) => (
                <div 
                  key={product.id} 
                  onClick={() => toggleProductSelection(product)}
                  className={`bg-[#1E1E1E]/50 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:scale-105 ${
                    isProductSelected(product.id) 
                      ? 'ring-2 ring-[#66DEDB] bg-[#66DEDB]/20' 
                      : 'hover:bg-[#66DEDB]/10'
                  }`}
                >
                  <div className="w-full h-32 relative mb-3 overflow-hidden rounded-lg">
                    <img
                      src={product.thumbnail || '/placeholder.png'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    {isProductSelected(product.id) && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-[#66DEDB] rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-white line-clamp-2 mb-2">{product.title}</h4>
                  {product.variants[0]?.inventory && product.variants[0].inventory.price && product.variants[0].inventory.price > 0 ? (
                    <p className="text-[#66DEDB] text-sm font-bold">
                      {product.variants[0].inventory.currency_code} {product.variants[0].inventory.price.toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm">Precio no disponible</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumen de productos seleccionados */}
        {selectedProducts.length > 0 && (
          <div className="mt-6 bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">🛒</span>
              Productos Seleccionados ({selectedProducts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {selectedProducts.map((product) => (
                <div key={product.id} className="bg-[#262626]/50 rounded-lg p-3 flex items-center space-x-3">
                  <div className="w-12 h-12 relative overflow-hidden rounded-lg flex-shrink-0">
                    <img
                      src={product.thumbnail || '/placeholder.png'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white line-clamp-2">{product.title}</h4>
                    <p className="text-xs text-gray-400">Cantidad: 1</p>
                  </div>
                  <button
                    onClick={() => toggleProductSelection(product)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="text-center">
              <button 
                onClick={handleContinueToCheckout}
                className="bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] text-white px-6 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
              >
                Continuar con el Envío
              </button>
            </div>
          </div>
        )}
          
        {/* Mensaje cuando no hay datos */}
        {selectedUser && !isLoading && !showWishlists && !showSuggestions && (
          <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
            <p className="text-yellow-400">No se pudieron cargar los datos del usuario</p>
        </div>
        )}

      </div>
    </div>
  )
}
