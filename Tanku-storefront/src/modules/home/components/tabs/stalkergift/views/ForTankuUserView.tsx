"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import SelectableUsersList, { SelectableUser } from "../components/SelectableUsersList"
import { getPublicWishlists, PublicWishlist, WishlistProduct } from "../../../../../social/actions/get-public-wishlists"
import { getProductSuggestions, ProductSuggestion } from "../../../../../social/actions/get-product-suggestions"
import CheckoutView from "./CheckoutView"
import OrderSummaryView from "./OrderSummaryView"
import { usePersonalInfo } from "../../../../../../lib/context"
import { usePayment } from "../hooks/usePayment"
import { useStalkerGift } from "../../../../../../lib/context"
import { createStalkerGift, CreateStalkerGiftData } from "../../../actions/create-stalker-gift"
import { retrieveCustomer } from "@lib/data/customer"
import { getCommonGroups, FriendGroup } from "../../../../../layout/components/actions/friend-groups"

interface ForTankuUserViewProps {
  onBack: () => void
  currentUserName?: string
}

export default function ForTankuUserView({ onBack, currentUserName = "Usuario" }: ForTankuUserViewProps) {
  const { personalInfo, updatePseudonym } = usePersonalInfo()
  const { stalkerGiftData, setAlias, setRecipientName, setMessage, toggleProductSelection: contextToggleProductSelection } = useStalkerGift()
  
  // Hook de pago
  const {
    selectedPaymentMethod,
    paymentEpayco,
    isProcessingPayment,
    createdOrder,
    showInvitationUrl,
    paymentStatus,
    paymentDetails,
    calculateTotals,
    handlePayment,
    handlePaymentMethodSelect,
    copyToClipboard,
    setPaymentEpayco
  } = usePayment()

  const [selectedUser, setSelectedUser] = useState<SelectableUser | null>(null)
  const [wishlists, setWishlists] = useState<PublicWishlist[]>([])
  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showWishlists, setShowWishlists] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Array<WishlistProduct | ProductSuggestion & { quantity?: number }>>([])
  const [commonGroups, setCommonGroups] = useState<FriendGroup[]>([])
  const [loadingCommonGroups, setLoadingCommonGroups] = useState(false)
  const [pseudonym, setPseudonym] = useState("")
  const [showPseudonymInput, setShowPseudonymInput] = useState(false)
  const [showPseudonymPopup, setShowPseudonymPopup] = useState(false)
  const [tempPseudonym, setTempPseudonym] = useState("")
  const [pseudonymError, setPseudonymError] = useState<string | null>(null)
  const [pseudonymSaving, setPseudonymSaving] = useState(false)
  const [currentView, setCurrentView] = useState<'selection' | 'checkout' | 'payment' | 'summary'>('selection')
  const [orderId, setOrderId] = useState("")
  const [localSelectedPaymentMethod, setLocalSelectedPaymentMethod] = useState<string>("")
  const [localIsProcessingPayment, setLocalIsProcessingPayment] = useState(false)

  // Obtener el nombre real del usuario actual
  const realUserName = personalInfo ? `${personalInfo.first_name} ${personalInfo.last_name}`.trim() : currentUserName

  // Prefill con seudónimo guardado si existe
  useEffect(() => {
    if (!pseudonym && personalInfo?.pseudonym) {
      setPseudonym(personalInfo.pseudonym)
    }
  }, [personalInfo?.pseudonym, pseudonym])

  // Efecto para manejar cuando el pago se complete
  useEffect(() => {
    if (createdOrder && paymentStatus === 'success') {
      handlePaymentSuccess(createdOrder)
    }
  }, [createdOrder, paymentStatus])

  const handleUserSelect = async (user: SelectableUser) => {
    setSelectedUser(user)
    setIsLoading(true)
    setShowWishlists(false)
    setShowSuggestions(false)
    setSelectedProducts([]) // Limpiar productos seleccionados al cambiar usuario
    setPseudonym("") // Limpiar seudónimo al cambiar usuario
    setShowPseudonymInput(false) // Cerrar input de seudónimo si está abierto
    setCommonGroups([]) // Limpiar grupos en común
    
    try {
      // Si es amigo, cargar grupos en común
      if (user.is_friend && personalInfo?.id) {
        console.log("Cargando grupos en común para:", {
          userId: personalInfo.id,
          friendId: user.id,
          isFriend: user.is_friend
        })
        setLoadingCommonGroups(true)
        try {
          const groups = await getCommonGroups(personalInfo.id, user.id)
          console.log("Grupos en común encontrados:", groups)
          setCommonGroups(groups)
        } catch (error) {
          console.error("Error al cargar grupos en común:", error)
          setCommonGroups([])
        } finally {
          setLoadingCommonGroups(false)
        }
      } else {
        console.log("No se cargan grupos en común:", {
          isFriend: user.is_friend,
          hasPersonalInfo: !!personalInfo?.id,
          personalInfoId: personalInfo?.id
        })
      }
      
      // Intentar obtener wishlists públicas
      const wishlistsResponse = await getPublicWishlists(user.id)
      
      // Siempre cargar sugerencias de productos (15 productos)
      const suggestionsResponse = await getProductSuggestions(15)
      if (suggestionsResponse.success) {
        setProductSuggestions(suggestionsResponse.data)
        setShowSuggestions(true)
      }
      
      if (wishlistsResponse.success && wishlistsResponse.data.length > 0) {
        // Verificar si las wishlists tienen productos
        const wishlistsWithProducts = wishlistsResponse.data.filter(wishlist => 
          wishlist.products && wishlist.products.length > 0
        )
        
        if (wishlistsWithProducts.length > 0) {
          // Hay wishlists con productos - mostrar wishlists Y sugerencias
          setWishlists(wishlistsWithProducts)
          setShowWishlists(true)
        } else {
          // Hay wishlists pero están vacías - mostrar wishlists vacías + sugerencias
          setWishlists(wishlistsResponse.data)
          setShowWishlists(true)
        }
      } else {
        // No hay wishlists públicas - solo mostrar sugerencias
        setShowWishlists(false)
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
    setSelectedProducts((prev: Array<WishlistProduct | ProductSuggestion & { quantity?: number }>) => {
      const isSelected = prev.some((p: WishlistProduct | ProductSuggestion) => p.id === product.id)
      if (isSelected) {
        return prev.filter((p: WishlistProduct | ProductSuggestion) => p.id !== product.id)
      } else {
        return [...prev, { ...product, quantity: 1 }]
      }
    })
  }

  const isProductSelected = (productId: string) => {
    return selectedProducts.some((p: WishlistProduct | ProductSuggestion) => p.id === productId)
  }

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return
    
    setSelectedProducts(prev => 
      prev.map(p => 
        p.id === productId 
          ? { ...p, quantity: Math.min(quantity, 10) } // Máximo 10 unidades
          : p
      )
    )
  }

  const getProductQuantity = (productId: string) => {
    const product = selectedProducts.find(p => p.id === productId)
    return (product as any)?.quantity || 1
  }

  const handlePseudonymSubmit = async () => {
    const value = pseudonym.trim()
    if (value.length < 2) {
      setPseudonymError("El seudónimo debe tener al menos 2 caracteres")
      return
    }
    if (value.length > 40) {
      setPseudonymError("El seudónimo no puede exceder 40 caracteres")
      return
    }
    setPseudonymError(null)
    try {
      setPseudonymSaving(true)
      // Persistir vía contexto
      if (updatePseudonym) {
        const resp = await updatePseudonym(value)
        if (!resp.success) {
          setPseudonymError(resp.error || "No se pudo guardar el seudónimo")
          return
        }
      }
      setShowPseudonymInput(false)
    } finally {
      setPseudonymSaving(false)
    }
  }

  const handleContinueToCheckout = () => {
    if (selectedProducts.length === 0) {
      alert("Por favor selecciona al menos un producto")
      return
    }
    // Siempre pedir confirmación del seudónimo en popup (aun si ya existe)
    setTempPseudonym(pseudonym)
    setShowPseudonymPopup(true)
  }

  const handleProceedToPayment = () => {
    setCurrentView('payment')
  }

  const handlePaymentSuccess = (orderData: any) => {
    setOrderId(orderData.id)
    setCurrentView('summary')
  }

  // Función local para manejar la selección de método de pago
  const handleLocalPaymentMethodSelect = (method: string) => {
    console.log('Seleccionando método de pago:', method)
    setLocalSelectedPaymentMethod(method)
    handlePaymentMethodSelect(method)
  }

  // Función local para procesar el pago
  const handleLocalPayment = async () => {
    if (!selectedUser || !pseudonym || selectedProducts.length === 0) {
      alert("Faltan datos para procesar el pago")
      return
    }

    try {
      setLocalIsProcessingPayment(true)
      
      // Obtener datos del usuario actual
      const userCustomer = await retrieveCustomer().catch(() => null)
      if (!userCustomer) {
        alert("Debe iniciar sesión para realizar el pago")
        return
      }

      // Calcular totales
      const subtotal = selectedProducts.reduce((total, product) => {
        const price = product.variants?.[0]?.inventory?.price || 0
        const quantity = (product as any).quantity || 1
        return total + (price * quantity)
      }, 0)
      const tax = subtotal * 0.16
      const shipping = subtotal > 50000 ? 0 : 5000
      const total = subtotal + tax + shipping

      // Crear datos para el stalker gift
      const orderData: CreateStalkerGiftData = {
        total_amount: total,
        first_name: userCustomer.first_name || "Usuario",
        phone: userCustomer.phone || "000000000",
        email: userCustomer.email,
        alias: pseudonym,
        recipient_name: `${selectedUser.first_name} ${selectedUser.last_name}`,
        contact_methods: [
          { type: 'email', value: selectedUser.email },
          { type: 'phone', value: userCustomer.phone || "000000000" }
        ],
        products: selectedProducts,
        message: "",
        customer_giver_id: userCustomer.id,
        customer_recipient_id: selectedUser.id, // Agregar ID del destinatario
        payment_method: "epayco",
        payment_status: "recibida" // Estado recibida para este ejercicio
      }

      console.log('Creando stalker gift con datos:', orderData)
      console.log('Productos seleccionados con cantidades:', selectedProducts.map(p => ({
        id: p.id,
        title: p.title,
        quantity: (p as any).quantity || 1,
        price: p.variants?.[0]?.inventory?.price || 0
      })))

      // Crear el stalker gift en la BD
      const response = await createStalkerGift(orderData)
      
      console.log('Stalker gift creado:', response)

      // Simular éxito del pago y continuar al summary
      handlePaymentSuccess(response.stalkerGift)

    } catch (error) {
      console.error('Error al procesar el pago:', error)
      alert('Error al procesar el pago. Por favor intenta de nuevo.')
    } finally {
      setLocalIsProcessingPayment(false)
    }
  }

  const handleNewGift = () => {
    // Resetear todo para empezar de nuevo
    setSelectedUser(null)
    setWishlists([])
    setProductSuggestions([])
    setSelectedProducts([])
    setPseudonym("")
    setShowPseudonymInput(false)
    setShowPseudonymPopup(false)
    setTempPseudonym("")
    setCurrentView('selection')
    setOrderId("")
    setLocalSelectedPaymentMethod("")
    
    // Resetear contexto de stalker gift
    setAlias("")
    setRecipientName("")
    setMessage("")
    
    // Limpiar productos del contexto
    stalkerGiftData.selectedProducts.forEach(product => {
      contextToggleProductSelection(product)
    })
  }

  const handlePseudonymPopupSubmit = async () => {
    const value = tempPseudonym.trim()
    if (value.length < 2) {
      alert("El seudónimo debe tener al menos 2 caracteres")
      return
    }
    if (value.length > 40) {
      alert("El seudónimo no puede exceder 40 caracteres")
      return
    }
    // Persistir en perfil antes de continuar
    if (updatePseudonym) {
      const resp = await updatePseudonym(value)
      if (!resp.success) {
        alert(resp.error || 'No se pudo guardar el seudónimo')
        return
      }
    }
    setPseudonym(value)
    setAlias(value)
    if (selectedUser) {
      setRecipientName(`${selectedUser.first_name} ${selectedUser.last_name}`)
    }
    // Sincronizar productos seleccionados con el contexto
    selectedProducts.forEach(product => {
      if (!stalkerGiftData.selectedProducts.some(p => p.id === product.id)) {
        const contextProduct = {
          id: product.id,
          handle: product.id,
          title: product.title,
          thumbnail: product.thumbnail,
          variants: product.variants?.map(variant => ({
            inventory: variant.inventory ? {
              price: variant.inventory.price,
              currency_code: variant.inventory.currency_code || 'COP'
            } : undefined
          })) || []
        }
        contextToggleProductSelection(contextProduct)
      }
    })
    setShowPseudonymPopup(false)
    setCurrentView('checkout')
  }

  const handlePseudonymPopupCancel = () => {
    setShowPseudonymPopup(false)
    setTempPseudonym("")
  }

  // Mostrar vista de checkout
  if (currentView === 'checkout' && selectedUser) {
    return (
      <CheckoutView
        selectedUser={selectedUser}
        pseudonym={pseudonym || realUserName}
        selectedProducts={selectedProducts}
        onBack={() => setCurrentView('selection')}
        onCompleteOrder={handleProceedToPayment}
      />
    )
  }

  // Mostrar vista de pago
  if (currentView === 'payment' && selectedUser) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button 
            onClick={() => setCurrentView('checkout')}
            className="flex items-center text-[#66DEDB] hover:text-[#5FE085] transition-colors duration-300"
          >
            <span className="mr-2">←</span> Volver al resumen
          </button>
          <h2 className="text-3xl font-bold text-white mt-4 flex items-center">
            <span className="mr-3">💳</span>
            Procesar Pago
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Resumen del pedido */}
          <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
            <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">📋</span>
              Resumen del Pedido
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image
                    src={selectedUser.avatar_url || "/feed/avatar.png"}
                    alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                    width={48}
                    height={48}
                    className="rounded-full object-cover border-2 border-[#66DEDB] w-12 h-12"
                    style={{ aspectRatio: '1/1' }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-semibold text-white">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </h4>
                    {selectedUser.is_friend && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#66DEDB]/20 text-[#66DEDB] border border-[#66DEDB]/30">
                        Amigos
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{selectedUser.email}</p>
                </div>
              </div>
              
              {/* Grupos en común - Solo si es amigo */}
              {selectedUser.is_friend && (
                <div className="bg-[#1E1E1E]/50 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-[#66DEDB] mb-2">
                    Grupos en común
                  </h5>
                  {loadingCommonGroups ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#66DEDB]"></div>
                      Cargando grupos...
                    </div>
                  ) : commonGroups.length > 0 ? (
                    <div className="space-y-2">
                      {commonGroups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center gap-2 p-2 bg-[#1E1E1E]/30 rounded-lg hover:bg-[#1E1E1E]/50 transition-colors"
                        >
                          {group.image_url ? (
                            <Image
                              src={group.image_url}
                              alt={group.group_name}
                              width={24}
                              height={24}
                              className="rounded-lg object-cover w-6 h-6"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-gradient-to-r from-[#1A485C] to-[#73FFA2] rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{group.group_name}</p>
                            {group.description && (
                              <p className="text-gray-400 text-xs truncate">{group.description}</p>
                            )}
                          </div>
                          {group.is_private && (
                            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No hay grupos en común</p>
                  )}
                </div>
              )}
              
              <div className="bg-[#1E1E1E]/50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-[#66DEDB] mb-2">Remitente:</h5>
                <p className="text-white">"{pseudonym}"</p>
              </div>

              {/* Totales */}
              <div className="bg-[#1E1E1E]/50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-[#66DEDB] mb-2">Resumen de Costos:</h5>
                {(() => {
                  // Calcular totales directamente desde los productos seleccionados
                  const subtotal = selectedProducts.reduce((total, product) => {
                    const price = product.variants?.[0]?.inventory?.price || 0
                    const quantity = (product as any).quantity || 1
                    return total + (price * quantity)
                  }, 0)
                  
                  const tax = subtotal * 0.16 // 16% IVA adicional
                  const shipping = subtotal > 50000 ? 0 : 5000 // Envío gratis si es mayor a $50,000 (ajustado para pesos colombianos)
                  const total = subtotal + tax + shipping
                  
                  return (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Subtotal:</span>
                        <span className="text-white">${subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">IVA (16% adicional):</span>
                        <span className="text-white">${tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Envío:</span>
                        <span className="text-white">${shipping.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-600 pt-2 mt-2">
                        <span className="text-[#66DEDB] font-semibold">Total:</span>
                        <span className="text-[#66DEDB] font-bold text-lg">${total.toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Formulario de pago */}
          <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
            <h3 className="text-xl font-bold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">💳</span>
              Método de Pago
            </h3>
            
            <div className="space-y-4">
              <button
                onClick={() => {
                  console.log('Seleccionando ePayco...')
                  handleLocalPaymentMethodSelect("epayco")
                }}
                className={`w-full p-4 rounded-lg border-2 transition-colors ${
                  localSelectedPaymentMethod === "epayco"
                    ? "border-[#66DEDB] bg-[#66DEDB]/10"
                    : "border-gray-600 hover:border-[#66DEDB]/50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#66DEDB]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#66DEDB] font-bold">E</span>
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">ePayco</p>
                    <p className="text-gray-400 text-sm">Pago seguro con tarjeta</p>
                  </div>
                  {localSelectedPaymentMethod === "epayco" && (
                    <div className="ml-auto">
                      <div className="w-5 h-5 bg-[#66DEDB] rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Debug info */}
            <div className="mt-4 p-3 bg-gray-800 rounded-lg text-xs">
              <p className="text-gray-400">Debug Info:</p>
              <p className="text-white">selectedPaymentMethod (hook): {selectedPaymentMethod || 'null'}</p>
              <p className="text-white">localSelectedPaymentMethod: {localSelectedPaymentMethod || 'null'}</p>
              <p className="text-white">selectedProducts: {selectedProducts.length}</p>
              <p className="text-white">pseudonym: {pseudonym || 'null'}</p>
            </div>

            {localSelectedPaymentMethod && (
              <div className="mt-6">
                <button
                  onClick={handleLocalPayment}
                  disabled={localIsProcessingPayment}
                  className="w-full bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] text-white px-6 py-3 rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {localIsProcessingPayment ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </div>
                  ) : (
                    "Procesar Pago"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Mostrar vista de resumen
  if (currentView === 'summary' && selectedUser && orderId) {
    console.log('Pasando datos a OrderSummaryView:', {
      selectedProducts: selectedProducts.map(p => ({
        id: p.id,
        title: p.title,
        quantity: (p as any).quantity || 1
      }))
    })
    
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
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src={selectedUser.avatar_url || "/feed/avatar.png"}
                  alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                  width={48}
                  height={48}
                  className="rounded-full object-cover border-2 border-[#66DEDB] w-12 h-12"
                  style={{ aspectRatio: '1/1' }}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-white">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </h3>
                  {selectedUser.is_friend && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#66DEDB]/20 text-[#66DEDB] border border-[#66DEDB]/30">
                      Amigos
                    </span>
                  )}
                </div>
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
            
            {/* Grupos en común - Solo si es amigo */}
            {selectedUser.is_friend && (
              <div className="mt-4 bg-[#1E1E1E]/50 rounded-lg p-4 border border-[#66DEDB]/20">
                <h5 className="text-sm font-medium text-[#66DEDB] mb-2">
                  Grupos en común
                </h5>
                {loadingCommonGroups ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#66DEDB]"></div>
                    Cargando grupos...
                  </div>
                ) : commonGroups.length > 0 ? (
                  <div className="space-y-2">
                    {commonGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center gap-2 p-2 bg-[#1E1E1E]/30 rounded-lg hover:bg-[#1E1E1E]/50 transition-colors"
                      >
                        {group.image_url ? (
                          <Image
                            src={group.image_url}
                            alt={group.group_name}
                            width={24}
                            height={24}
                            className="rounded-lg object-cover w-6 h-6"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gradient-to-r from-[#1A485C] to-[#73FFA2] rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{group.group_name}</p>
                          {group.description && (
                            <p className="text-gray-400 text-xs truncate">{group.description}</p>
                          )}
                        </div>
                        {group.is_private && (
                          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No hay grupos en común</p>
                )}
              </div>
            )}
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
                    {pseudonym ? `Seudónimo: "${pseudonym}"` : "⚠️ No has ingresado un seudónimo"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {pseudonym 
                      ? "El destinatario verá este seudónimo" 
                      : "Debes ingresar un seudónimo para continuar"
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
                    Ingresa tu seudónimo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={pseudonym}
                    onChange={(e) => {
                      const v = e.target.value
                      setPseudonym(v)
                      if (!v.trim()) {
                        setPseudonymError("El seudónimo es obligatorio")
                      } else if (v.trim().length < 2) {
                        setPseudonymError("Mínimo 2 caracteres")
                      } else if (v.trim().length > 40) {
                        setPseudonymError("Máximo 40 caracteres")
                      } else {
                        setPseudonymError(null)
                      }
                    }}
                    placeholder="Ej: Un amigo secreto, Tu crush, etc."
                    className="w-full px-4 py-3 bg-[#1E1E1E] border border-[#66DEDB]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66DEDB] focus:border-transparent"
                    maxLength={40}
                    required
                  />
                  <p className={`text-xs mt-1 ${pseudonymError ? 'text-red-400' : 'text-gray-400'}`}>
                    {pseudonymError ? pseudonymError : 'Máximo 40 caracteres. Este campo es obligatorio.'}
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handlePseudonymSubmit}
                    disabled={!!pseudonymError || pseudonymSaving}
                    className={`px-6 py-2 rounded-lg transition-colors ${pseudonymError || pseudonymSaving ? 'bg-[#66DEDB]/50 cursor-not-allowed' : 'bg-[#66DEDB] hover:bg-[#5FE085]'} text-white`}
                  >
                    {pseudonymSaving ? 'Guardando...' : 'Confirmar'}
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
                    <p className="text-xs text-gray-400">
                      Precio: ${product.variants?.[0]?.inventory?.price?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Controles de cantidad */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => updateProductQuantity(product.id, ((product as any).quantity || 1) - 1)}
                        disabled={((product as any).quantity || 1) <= 1}
                        className="w-6 h-6 rounded-full bg-[#66DEDB]/20 text-[#66DEDB] hover:bg-[#66DEDB]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <span className="text-xs">-</span>
                      </button>
                      <span className="text-sm text-white min-w-[20px] text-center">
                        {(product as any).quantity || 1}
                      </span>
                      <button
                        onClick={() => updateProductQuantity(product.id, ((product as any).quantity || 1) + 1)}
                        disabled={((product as any).quantity || 1) >= 10}
                        className="w-6 h-6 rounded-full bg-[#66DEDB]/20 text-[#66DEDB] hover:bg-[#66DEDB]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <span className="text-xs">+</span>
                      </button>
                  </div>
                  <button
                    onClick={() => toggleProductSelection(product)}
                      className="text-red-400 hover:text-red-300 transition-colors ml-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  </div>
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

      {/* Popup de confirmación/ingreso de Seudónimo */}
      {showPseudonymPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] rounded-xl p-6 w-full max-w-md border border-[#66DEDB]/30">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[#66DEDB]/20 rounded-full flex items-center justify-center mr-3">
                <span className="text-2xl">🎭</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {personalInfo?.pseudonym ? 'Confirmar seudónimo' : 'Seudónimo Requerido'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {personalInfo?.pseudonym
                    ? 'Este es tu último seudónimo usado. ¿Quieres seguir usándolo o cambiarlo antes de continuar?'
                    : 'Necesitas un seudónimo para continuar'}
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-white text-sm font-medium mb-2">
                {personalInfo?.pseudonym ? 'Confirma o edita tu seudónimo' : 'Ingresa tu seudónimo'} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={tempPseudonym}
                onChange={(e) => setTempPseudonym(e.target.value)}
                placeholder="Ej: Un amigo secreto, Tu crush, etc."
                className="w-full px-4 py-3 bg-[#262626] border border-[#66DEDB]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66DEDB] focus:border-transparent"
                maxLength={40}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePseudonymPopupSubmit()
                  }
                }}
              />
              <p className="text-gray-400 text-xs mt-1">
                Máximo 40 caracteres. Este campo es obligatorio.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handlePseudonymPopupCancel}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                {personalInfo?.pseudonym ? 'Volver' : 'Cancelar'}
              </button>
              <button
                onClick={handlePseudonymPopupSubmit}
                className="flex-1 bg-[#66DEDB] text-white px-4 py-2 rounded-lg hover:bg-[#5FE085] transition-colors"
              >
                {personalInfo?.pseudonym ? 'Usar este seudónimo' : 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
