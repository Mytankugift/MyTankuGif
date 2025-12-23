"use client"

import { HttpTypes } from "@medusajs/types"
import { Container, Button } from "@medusajs/ui"
import Checkbox from "@modules/common/components/checkbox"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"
import {
  postCheckoutOrder,
  CheckoutPayload,
  AddressPayload,
} from "@modules/checkout/actions/post-checkout-order"
import { retrieveCustomer } from "@lib/data/customer"
import { updateCart } from "@lib/data/cart"
import Script from "next/script"
import { captureUserBehavior } from "@lib/data/events_action_type"
import { usePersonalInfo } from "@lib/context/personal-info-context"
import { CreditCard, Plus, CheckCircleSolid, PencilSquare, Trash } from "@medusajs/icons"
import PaymentModal from "../payment-modal"
import AddressModal from "../address-modal"
import BillingModal from "../billing-modal"
import LoginModal from "../login-modal"

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

type AddressField =
  | "first_name"
  | "last_name"
  | "address_1"
  | "address_2"
  | "company"
  | "postal_code"
  | "city"
  | "country_code"
  | "province"
  | "phone"

interface PaymentEpayco {
  id: string
  cart_id: string
  email: string
  payment_method: string
  total_amount: number
  first_name: string
  last_name: string
  address_1: string
  address_2: string
  company: string
  postal_code: string
  city: string
  country_code: string
  province: string
  phone: string
  status_id: string
  shipping_address_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  orderVariants: []
}

const isAddressField = (field: string): field is AddressField => {
  return [
    "first_name",
    "last_name",
    "address_1",
    "address_2",
    "company",
    "postal_code",
    "city",
    "country_code",
    "province",
    "phone",
  ].includes(field)
}

const FormTanku = ({
  customer: initialCustomer,
  cart,
  onContinueButtonClick,
  isFormValidForButton,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  onContinueButtonClick?: (isValid: boolean, handleContinue: () => void) => void
  isFormValidForButton?: boolean
}) => {
  const { getUser } = usePersonalInfo()
  const userData = getUser()
  
  // Estado local para customer (se refresca después de guardar direcciones)
  const [customer, setCustomer] = useState<HttpTypes.StoreCustomer | null>(initialCustomer)
  
  // Sincronizar customer inicial con estado local
  useEffect(() => {
    if (initialCustomer) {
      setCustomer(initialCustomer)
    }
  }, [initialCustomer])
  
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [paymentEpayco, setPaymentEpayco] = useState<PaymentEpayco | null>(null)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState<HttpTypes.StoreCustomerAddress | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showBillingModal, setShowBillingModal] = useState(false)
  const [hasBillingData, setHasBillingData] = useState(false)
  const [defaultAddressId, setDefaultAddressId] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; cities: Array<{ id: number; name: string }>; hasError?: boolean }>>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  const [availableCities, setAvailableCities] = useState<Array<{ id: number; name: string }>>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [shippingCost, setShippingCost] = useState<number | null>(null)
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)
  const [canUseCashOnDelivery, setCanUseCashOnDelivery] = useState(false)
  
  // ✅ useRef para evitar bucles - rastrear si hay un cálculo en curso sin recrear la función
  const isCalculatingRef = useRef(false)
  // ✅ useRef para rastrear la última ciudad calculada (evitar recalcular la misma dirección)
  const lastCalculatedCityRef = useRef<string | null>(null)
  // ✅ useRef para rastrear si se seleccionó una dirección manualmente (reducir debounce)
  const isManualAddressSelectRef = useRef(false)
  
  // Pre-llenar datos personales del customer si existen
  const initialFormData = useMemo(() => {
    const parsePhone = (phone: string) => {
      if (!phone) return { code: "+57", number: "" }
      const match = phone.match(/^(\+?\d{1,3})(.*)$/)
      if (match) {
        return {
          code: match[1].startsWith("+") ? match[1] : `+${match[1]}`,
          number: match[2].trim()
        }
      }
      return { code: "+57", number: phone }
    }
    
    const customerPhone = customer?.phone || userData?.phone || ""
    const { code, number } = parsePhone(customerPhone)
    
    const baseData = {
      "shipping_address.first_name": cart?.shipping_address?.first_name || customer?.first_name || userData?.firstName || "",
      "shipping_address.last_name": cart?.shipping_address?.last_name || customer?.last_name || userData?.lastName || "",
      "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
      "shipping_address.address_2": cart?.shipping_address?.address_2 || "",
      "shipping_address.company": cart?.shipping_address?.company || "",
      "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
      "shipping_address.city": cart?.shipping_address?.city || "",
      "shipping_address.country_code": cart?.shipping_address?.country_code || "co",
      "shipping_address.province": cart?.shipping_address?.province || "",
      "billing_address.first_name": cart?.billing_address?.first_name || customer?.first_name || userData?.firstName || "",
      "billing_address.last_name": cart?.billing_address?.last_name || customer?.last_name || userData?.lastName || "",
      "billing_address.address_1": cart?.billing_address?.address_1 || "",
      "billing_address.address_2": cart?.billing_address?.address_2 || "",
      "billing_address.company": cart?.billing_address?.company || "",
      "billing_address.postal_code": cart?.billing_address?.postal_code || "",
      "billing_address.city": cart?.billing_address?.city || "",
      "billing_address.country_code": cart?.billing_address?.country_code || "co",
      "billing_address.province": cart?.billing_address?.province || "",
      "billing_address.phone": cart?.billing_address?.phone || customer?.phone || userData?.phone || "",
      email: cart?.email || customer?.email || userData?.email || "",
      phone: number,
      phone_country_code: code,
    }
    return baseData
  }, [cart, customer, userData])

  const [formData, setFormData] = useState<Record<string, any>>(initialFormData)
  const [checked, setChecked] = useState(true)

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  // check if customer has saved addresses that are in the current region
  // Si no hay region definida, mostrar todas las direcciones (compatibilidad)
  const addressesInRegion = useMemo(
    () => {
      if (!customer?.addresses || customer.addresses.length === 0) {
        return []
      }
      
      // Si no hay region o countries definidos, mostrar todas las direcciones
      if (!countriesInRegion || countriesInRegion.length === 0) {
        return customer.addresses
      }
      
      // Filtrar por región si existe
      return customer.addresses.filter(
        (a) => a.country_code && countriesInRegion.includes(a.country_code)
      )
    },
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    address &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.address_2": address?.address_2 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.country_code": address?.country_code || "co",
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": (address as any)?.phone || formData.phone || "",
        // Mantener el teléfono completo (con código de país si existe)
        phone: formData.phone || (address as any)?.phone || "",
      }))

    email &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        email: email,
      }))
  }

  // Cargar departamentos y ciudades desde API pública
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepartments(true)
      try {
        const response = await fetch("/api/colombia/departments")
        if (response.ok) {
          const data = await response.json()
          setDepartments(data)
        } else {
          console.error("Error al cargar departamentos:", await response.text())
        }
      } catch (error) {
        console.error("Error al cargar departamentos:", error)
      } finally {
        setLoadingDepartments(false)
      }
    }
    fetchDepartments()
  }, [])

  // Cuando se selecciona un departamento, cargar sus ciudades
  useEffect(() => {
    if (selectedDepartmentId && departments.length > 0) {
      const selectedDept = departments.find(d => d.id === selectedDepartmentId)
      if (selectedDept) {
        setAvailableCities(selectedDept.cities || [])
        // Actualizar el nombre del departamento en formData
        setFormData(prev => ({
          ...prev,
          "shipping_address.province": selectedDept.name,
          "shipping_address.city": "" // Limpiar ciudad al cambiar departamento
        }))
      }
    } else {
      setAvailableCities([])
    }
  }, [selectedDepartmentId, departments])

  useEffect(() => {
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address, cart?.email)
      // Buscar el departamento por nombre
      const dept = departments.find(d => d.name === cart.shipping_address?.province)
      if (dept) {
        setSelectedDepartmentId(dept.id)
      }
    } else if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    } else if (!cart?.shipping_address && initialFormData) {
      // Pre-llenar con datos del customer si no hay dirección en el cart
      setFormData(initialFormData)
    }
    
    // Establecer dirección predeterminada si existe
    if (customer?.addresses && addressesInRegion) {
      const defaultAddr = addressesInRegion.find(a => a.is_default_shipping)
      if (defaultAddr && !selectedAddressId) {
        // ✅ Limpiar el ref para permitir que se calcule el envío de la dirección predeterminada
        if (defaultAddr.city) {
          console.log(`🔄 [DEFAULT-ADDRESS] Estableciendo dirección predeterminada: ${defaultAddr.city}`)
          lastCalculatedCityRef.current = null // Permitir cálculo inicial
          isManualAddressSelectRef.current = true // Marcar como selección para reducir debounce
        }
        
        setDefaultAddressId(defaultAddr.id)
        setSelectedAddressId(defaultAddr.id)
        // Usar setTimeout para asegurar que setFormAddress se ejecute y actualice formData
        setTimeout(() => {
          setFormAddress(defaultAddr as HttpTypes.StoreCartAddress, customer?.email)
          // Buscar el departamento por nombre
          const dept = departments.find(d => d.name === defaultAddr.province)
          if (dept) {
            setSelectedDepartmentId(dept.id)
          }
          
          // ✅ Calcular envío directamente para dirección predeterminada
          if (defaultAddr.city && cart?.subtotal && cart.subtotal > 0) {
            setTimeout(() => {
              if (lastCalculatedCityRef.current !== defaultAddr.city) {
                console.log(`🔄 [DEFAULT-ADDRESS] Calculando envío para dirección predeterminada: ${defaultAddr.city}`)
                lastCalculatedCityRef.current = null // Limpiar para permitir cálculo
                calculateShipping()
              }
            }, 150) // Delay corto para asegurar que formData se actualice
          }
        }, 100)
      }
    }
  }, [cart, customer, addressesInRegion, selectedAddressId, departments])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const isFormValid = () => {
    const requiredFields = [
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.address_1",
      "shipping_address.postal_code",
      "shipping_address.city",
      "shipping_address.country_code",
      "email",
      "phone", // Teléfono ahora es requerido
    ]

    const billingFields = checked
      ? []
      : [
          "billing_address.first_name",
          "billing_address.last_name",
          "billing_address.address_1",
          "billing_address.postal_code",
          "billing_address.city",
          "billing_address.country_code",
        ]

    return [...requiredFields, ...billingFields].every(
      (field) => formData[field] && formData[field].trim() !== ""
    )
  }

  const handleContinue = useCallback(() => {
    const isValid = isFormValid()
    if (isValid) {
      setShowPaymentModal(true)
    }
  }, [formData, checked])

  // Exponer handleContinue y isFormValid al componente padre
  useEffect(() => {
    if (onContinueButtonClick) {
      // Usar setTimeout para asegurar que formData se haya actualizado completamente
      const timeoutId = setTimeout(() => {
        const isValid = isFormValid()
        onContinueButtonClick(isValid, handleContinue)
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [formData, checked, selectedAddressId, onContinueButtonClick, handleContinue])

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method)
  }

  const handleAddressSelect = (addressId: string) => {
    const address = addressesInRegion?.find(a => a.id === addressId)
    if (address) {
      const newCity = address.city
      const currentCity = formData["shipping_address.city"]
      
      // ✅ Si es la misma ciudad que ya está calculada, no hacer nada
      if (currentCity === newCity && lastCalculatedCityRef.current === newCity) {
        console.log(`⏭️ [ADDRESS-SELECT] Misma ciudad (${newCity}), no se actualizará ni recalculará`)
        // Solo actualizar el selectedAddressId para mantener la UI sincronizada
        setSelectedAddressId(addressId)
        setDefaultAddressId(addressId)
        return
      }
      
      // ✅ Si es una ciudad diferente, actualizar y calcular
      console.log(`🔄 [ADDRESS-SELECT] Nueva dirección seleccionada: ${newCity} (anterior: ${currentCity}, última calculada: ${lastCalculatedCityRef.current})`)
      
      setSelectedAddressId(addressId)
      setDefaultAddressId(addressId)
      setFormAddress(address as HttpTypes.StoreCartAddress, customer?.email)
      // Buscar y establecer el departamento seleccionado
      const dept = departments.find(d => d.name === address.province)
      if (dept) {
        setSelectedDepartmentId(dept.id)
      }
      
      // ✅ Calcular envío directamente después de actualizar (con pequeño delay para asegurar que formData se actualice)
      if (newCity && cart?.subtotal && cart.subtotal > 0) {
        setTimeout(() => {
          // Verificar que la ciudad siga siendo diferente antes de calcular
          if (lastCalculatedCityRef.current !== newCity) {
            console.log(`🔄 [ADDRESS-SELECT] Calculando envío directamente para: ${newCity}`)
            lastCalculatedCityRef.current = null // Limpiar para permitir cálculo
            calculateShipping()
          }
        }, 150) // Delay corto para asegurar que formData se actualice
      }
    }
  }

  const handleNewAddress = () => {
    // Si no hay customer, mostrar modal de login
    if (!customer) {
      setShowLoginModal(true)
      return
    }
    setEditingAddress(null)
    setShowAddressModal(true)
  }
  
  const handleLoginSuccess = async () => {
    // Refrescar customer después del login
    try {
      const updatedCustomer = await retrieveCustomer()
      if (updatedCustomer) {
        setCustomer(updatedCustomer)
        // Ahora abrir el modal de dirección
        setEditingAddress(null)
        setShowAddressModal(true)
      }
    } catch (error) {
      console.error("Error refreshing customer after login:", error)
    }
  }

  const handleEditAddress = (address: HttpTypes.StoreCustomerAddress) => {
    setEditingAddress(address)
    setShowAddressModal(true)
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta dirección?")) {
      return
    }
    
    try {
      const { deleteCustomerAddress } = await import("@lib/data/customer")
      await deleteCustomerAddress(addressId)
      
      // Si la dirección eliminada estaba seleccionada, limpiar la selección
      if (selectedAddressId === addressId) {
        setSelectedAddressId(null)
        setFormData((prev: Record<string, any>) => ({
          ...prev,
          "shipping_address.first_name": "",
          "shipping_address.last_name": "",
          "shipping_address.address_1": "",
          "shipping_address.address_2": "",
          "shipping_address.city": "",
          "shipping_address.province": "",
          "shipping_address.postal_code": "",
        }))
      }
      
      // Refrescar customer para obtener direcciones actualizadas
      try {
        const updatedCustomer = await retrieveCustomer()
        if (updatedCustomer) {
          setCustomer(updatedCustomer)
        }
      } catch (refreshError) {
        console.error("Error refreshing customer:", refreshError)
        // Fallback: recargar página si falla el refresh
        window.location.reload()
      }
    } catch (error) {
      console.error("Error deleting address:", error)
      alert("Error al eliminar la dirección")
    }
  }

  const handleAddressSaved = async (address: HttpTypes.StoreCartAddress) => {
    setFormAddress(address as HttpTypes.StoreCartAddress, customer?.email)
    setShowAddressModal(false)
    setEditingAddress(null)
    
    // Refrescar customer para obtener direcciones actualizadas
    try {
      const updatedCustomer = await retrieveCustomer()
      if (updatedCustomer) {
        setCustomer(updatedCustomer)
        
        // Si es una dirección nueva o editada, seleccionarla automáticamente
        if (updatedCustomer.addresses && updatedCustomer.addresses.length > 0) {
          const savedAddress = updatedCustomer.addresses.find(a => 
            a.address_1 === address.address_1 && 
            a.city === address.city
          ) || updatedCustomer.addresses[updatedCustomer.addresses.length - 1]
          
          if (savedAddress) {
            setSelectedAddressId(savedAddress.id)
            setFormAddress(savedAddress as HttpTypes.StoreCartAddress, updatedCustomer?.email)
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing customer:", error)
      // Fallback: recargar página si falla el refresh
      window.location.reload()
    }
  }

  const handlePayment = async () => {
    const userCustomer = await retrieveCustomer().catch(() => null)

    if (!userCustomer) {
      return alert("Debe iniciar sesión para realizar el pago")
    }

    try {
      // Preparar payload común para ambos métodos de pago
      const payload: CheckoutPayload = {
        shipping_address: {} as AddressPayload,
        billing_address: {} as AddressPayload,
        email: formData.email,
        payment_method: selectedPaymentMethod,
        cart_id: cart?.id,
      }

      // Map shipping address fields
      Object.keys(formData).forEach((key) => {
        if (key.startsWith("shipping_address.")) {
          const field = key.replace("shipping_address.", "")
          if (isAddressField(field)) {
            payload.shipping_address[field as keyof AddressPayload] =
              formData[key]
          }
        }
      })
      
      // Agregar teléfono completo si existe
      if (formData.phone && formData.phone.trim()) {
        const fullPhone = `${formData.phone_country_code || '+57'}${formData.phone.trim()}`
        payload.shipping_address.phone = fullPhone
        console.log(`📞 [CHECKOUT] Teléfono agregado al payload: ${fullPhone}`)
      } else {
        console.warn(`⚠️ [CHECKOUT] No hay teléfono para agregar al payload`)
      }

      // Map billing address fields
      if (!checked) {
        Object.keys(formData).forEach((key) => {
          if (key.startsWith("billing_address.")) {
            const field = key.replace("billing_address.", "")
            if (isAddressField(field)) {
              payload.billing_address[field as keyof AddressPayload] =
                formData[key]
            }
          }
        })
      } else {
        payload.billing_address = { ...payload.shipping_address }
      }

      // Mapear items del carrito para compatibilidad con el endpoint
      const producVariants = cart?.items
        ?.filter((item) => item.variant_id !== undefined)
        .map((item) => ({
          title: item.title || item.variant?.title || "",
          variant_id: item.variant_id as string,
          quantity: item.quantity,
          original_total: item.total || (item.unit_price || 0) * item.quantity,
          unit_price: item.unit_price || 0,
        }))

      if (!producVariants?.length) {
        return
      }

      const response = await postCheckoutOrder(payload, {
        customer_id: userCustomer?.id || "",
        cart_id: cart?.id || "",
        producVariants: producVariants,
      })

      // Validar que la respuesta tenga la estructura esperada
      if (!response || !response.order || !response.order.id) {
        throw new Error("La respuesta del servidor no tiene la estructura esperada. Por favor, intenta nuevamente.")
      }

      // Capturar comportamiento del usuario
      producVariants.forEach((item) => {
        console.log("este es el ejecutable de captureUserBehavior", item.title)
        captureUserBehavior(item.title, "purchase")
      })
      console.log("✅ [CHECKOUT] Orden creada:", response.order)
      
      // Manejar creación de orden en Dropi según el método de pago
      // NOTA: La orden en Dropi ya se crea automáticamente en el backend para contra entrega
      if (selectedPaymentMethod === "cash_on_delivery") {
        // Para contra entrega, la orden ya fue creada en Dropi por el backend
        console.log("✅ [CHECKOUT] Orden creada (contra entrega), Dropi ya procesado por backend")
        
        // Limpiar carrito después de compra exitosa
        try {
          const { clearCartAfterPurchase } = await import("@lib/data/cart-cleanup")
          await clearCartAfterPurchase(cart.id)
        } catch (clearError) {
          console.warn("⚠️ [CHECKOUT] Error limpiando carrito:", clearError)
        }
        
        // Redirigir directamente a Mis compras en el perfil
        // Establecer la pestaña en localStorage antes de navegar
        if (typeof window !== 'undefined') {
          localStorage.setItem('tanku_profile_tab', 'MIS COMPRAS')
        }
        window.location.href = `/profile`
        return // No continuar con el flujo de ePayco
      }
      // Para ePayco, la orden en Dropi se creará después del pago exitoso (en webhook)
      
      // Preparar datos para ePayco
      // El backend ya devuelve total_amount, usar directamente
      const orderForEpayco = {
        id: response.order.id,
        total_amount: response.order.total_amount || response.order.total,
        first_name: response.order.shipping_address?.first_name || userCustomer?.first_name || "",
        phone: response.order.shipping_address?.phone || userCustomer?.phone || "",
        email: response.order.email || userCustomer?.email || "",
      }
      
      setPaymentEpayco(orderForEpayco)
    } catch (error: any) {
      console.error("❌ [CHECKOUT] Error al procesar el pedido:", error)
      console.error("❌ [CHECKOUT] Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      })
      
      // Mostrar error al usuario de forma más amigable
      const errorMessage = error?.message || "Error al procesar el pedido. Por favor, intenta nuevamente."
      alert(errorMessage)
      
      // No re-lanzar el error para evitar que se propague
      return
    }
  }

  // Verificar si todos los productos permiten "Contra Entrega"
  const checkCashOnDeliveryAvailability = useCallback(async () => {
    if (!cart?.items || cart.items.length === 0) {
      setCanUseCashOnDelivery(false)
      return
    }
    
    // Verificar que todos los productos tengan variant con SKU que contenga "DP-" (indica que viene de Dropi)
    // Todos los productos de Dropi deberían soportar contra entrega
    const allHaveDropiId = cart.items.every((item: any) => {
      // Verificar si el SKU del variant contiene "DP-" (formato: DP-{dropi_id}-{sku})
      const sku = item.variant?.sku || item.variant_id
      return sku && typeof sku === 'string' && sku.includes('DP-')
    })
    
    // Si todos tienen SKU de Dropi, permitir contra entrega
    // Si no hay items o no todos tienen SKU de Dropi, aún así permitir contra entrega por defecto
    // (asumimos que todos los productos en el sistema vienen de Dropi)
    setCanUseCashOnDelivery(true) // Siempre permitir contra entrega por ahora
  }, [cart])

  // Calcular costo de envío con Dropi cuando se tiene ciudad destino
  const calculateShipping = useCallback(async () => {
    const destinationCity = formData["shipping_address.city"]
    
    // ✅ No calcular si es la misma ciudad que ya se calculó
    if (lastCalculatedCityRef.current === destinationCity) {
      console.log(`⏭️ [CALCULATE-SHIPPING] Misma ciudad (${destinationCity}), omitiendo cálculo...`)
      return
    }
    
    // ✅ Protección contra llamadas simultáneas usando useRef (no causa bucles)
    if (isCalculatingRef.current) {
      console.log(`⏭️ [CALCULATE-SHIPPING] Ya hay un cálculo en curso, omitiendo...`)
      return
    }
    // Calcular monto de orden con incremento (15% + $10,000 por producto)
    const orderAmount = cart?.items?.reduce((sum, item) => {
      const basePrice = item.unit_price || item.variant?.calculated_price?.calculated_amount || item.variant?.price || 0
      if (basePrice <= 0) return sum
      // Fórmula: (precio * 1.15) + 10,000
      const finalPrice = Math.round((basePrice * 1.15) + 10000)
      return sum + (finalPrice * (item.quantity || 0))
    }, 0) || (cart?.subtotal || 0)
    
    console.log(`🚚 [CALCULATE-SHIPPING] Iniciando cálculo de envío:`, {
      destinationCity,
      orderAmount,
      originalSubtotal: cart?.subtotal,
      extraAmount,
      totalQuantity,
      paymentMethod: selectedPaymentMethod,
      timestamp: new Date().toISOString()
    })
    
    // Validar que tengamos los datos necesarios
    if (!destinationCity || !orderAmount || orderAmount <= 0) {
      console.log(`⚠️ [CALCULATE-SHIPPING] Datos insuficientes para calcular envío`)
      setShippingCost(null)
      setShippingError(null)
      return
    }
    
    setIsCalculatingShipping(true)
    setShippingError(null)
    
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
    
    // Preparar cartItems para enviar al backend
    const cartItems = cart?.items
      ?.filter((item: any) => item.variant_id !== undefined)
      .map((item: any) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
      })) || []
    
    console.log("🚚 Calculando envío:", {
      destinationCity,
      orderAmount,
      cartItemsCount: cartItems.length,
      backendUrl,
    })
    
    try {
      const response = await fetch(`${backendUrl}/store/dropi/quote-shipping`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": publishableKey,
        },
        body: JSON.stringify({
          destinationCity: destinationCity,
          orderAmount: orderAmount,
          isCashOnDelivery: selectedPaymentMethod === "cash_on_delivery",
          cartItems: cartItems.length > 0 ? cartItems : undefined, // Enviar solo si hay items
        }),
      })
      
      const data = await response.json()
      
      console.log("📦 [FRONTEND] Respuesta completa del backend:", data)
      
      if (!response.ok) {
        throw new Error(data.error || "Error al calcular envío")
      }
      
      if (data.success && data.shippingCost !== undefined) {
        const cost = typeof data.shippingCost === 'number' ? data.shippingCost : parseFloat(data.shippingCost) || 0
        console.log("📦 [FRONTEND] Costo de envío parseado:", cost, "Tipo:", typeof cost)
        console.log("📦 [FRONTEND] Desglose por bodega:", data.shippingQuotes)
        setShippingCost(cost)
        setShippingError(null)
        
        // ✅ Guardar la ciudad calculada para evitar recalcular la misma
        lastCalculatedCityRef.current = destinationCity
        
        // Notificar al componente padre sobre el costo de envío calculado
        if (typeof window !== 'undefined') {
          console.log(`📡 [CALCULATE-SHIPPING] Disparando evento shippingCostCalculated:`, {
            cost,
            quotes: data.shippingQuotes?.length || 0,
            timestamp: new Date().toISOString()
          })
          
          // Disparar evento personalizado para notificar el cambio de envío
          window.dispatchEvent(new CustomEvent('shippingCostCalculated', {
            detail: { cost, quotes: data.shippingQuotes }
          }))
        }
      } else {
        console.error("📦 [FRONTEND] Respuesta inválida:", data)
        throw new Error("No se pudo obtener el costo de envío")
      }
    } catch (error: any) {
      console.error("Error calculando envío:", error)
      
      let errorMessage = "Error al calcular el costo de envío"
      
      if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        errorMessage = "Timeout: El cálculo de envío tardó demasiado. Intenta nuevamente."
      } else if (error.message?.includes('fetch failed') || error.message?.includes('conexión')) {
        errorMessage = "Error de conexión: Verifica tu conexión a internet."
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setShippingError(errorMessage)
      setShippingCost(null)
      // ✅ No actualizar lastCalculatedCityRef en caso de error (para permitir reintento)
    } finally {
      // ✅ Limpiar ref y state
      isCalculatingRef.current = false
      setIsCalculatingShipping(false)
    }
  }, [formData, cart, selectedPaymentMethod]) // ✅ Removido isCalculatingShipping de dependencias para evitar bucles
  
  // Verificar disponibilidad de contra entrega cuando cambia el carrito
  useEffect(() => {
    checkCashOnDeliveryAvailability()
  }, [checkCashOnDeliveryAvailability])
  
  // Calcular envío automáticamente cuando cambia la ciudad destino
  // ✅ Solo calcula cuando la ciudad CAMBIA (no recalcula si es la misma)
  useEffect(() => {
    const city = formData["shipping_address.city"]
    const hasValidData = city && cart?.subtotal && cart.subtotal > 0
    
    // ✅ Solo calcular si:
    // 1. Hay datos válidos
    // 2. El ref es null (primera vez o después de limpiar en handleAddressSelect)
    // 3. O la ciudad es diferente a la última calculada
    const shouldCalculate = hasValidData && (
      lastCalculatedCityRef.current === null || 
      lastCalculatedCityRef.current !== city
    )
    
    if (shouldCalculate) {
      console.log(`🔄 [SHIPPING-TRIGGER] Ciudad detectada: ${city}, última calculada: ${lastCalculatedCityRef.current}, debe calcular: true`)
      
      // ✅ Reducir debounce si es selección manual (100ms) vs cambio manual en formulario (500ms)
      const debounceTime = isManualAddressSelectRef.current ? 100 : 500
      
      // Debounce: esperar después del último cambio antes de calcular
      const timeoutId = setTimeout(() => {
        // ✅ Verificar nuevamente que la ciudad siga siendo diferente (por si cambió durante el debounce)
        const currentCity = formData["shipping_address.city"]
        if (lastCalculatedCityRef.current === null || lastCalculatedCityRef.current !== currentCity) {
          console.log(`🔄 [SHIPPING-TRIGGER] Ejecutando cálculo de envío para ciudad: ${currentCity}`)
          isManualAddressSelectRef.current = false // Resetear flag después de calcular
          calculateShipping()
        } else {
          console.log(`⏭️ [SHIPPING-TRIGGER] Ciudad ya fue calculada durante debounce (${currentCity}), omitiendo...`)
          isManualAddressSelectRef.current = false // Resetear flag
        }
      }, debounceTime)
      
      return () => clearTimeout(timeoutId)
    } else if (!hasValidData) {
      // Si no hay datos válidos, limpiar
      setShippingCost(null)
      setShippingError(null)
      lastCalculatedCityRef.current = null
    } else {
      console.log(`⏭️ [SHIPPING-TRIGGER] Misma ciudad (${city}), no se recalculará`)
    }
  }, [formData["shipping_address.city"], cart?.subtotal, calculateShipping])

  return (
    <>
      <div className="w-full max-w-4xl mx-auto space-y-4">
        {/* Sección 1: Datos Personales */}
        <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-xl p-3 sm:p-4 shadow-xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 bg-[#66DEDB]/20 rounded-lg">
              <svg className="w-4 h-4 text-[#66DEDB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#66DEDB]">Datos Personales</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Input
            label="Nombre"
            name="shipping_address.first_name"
            autoComplete="given-name"
            value={formData["shipping_address.first_name"]}
            onChange={handleChange}
            required
            data-testid="shipping-first-name-input"
            className="bg-gray-700/50 border-gray-600 text-white focus:border-[#66DEDB] focus:ring-[#66DEDB]"
          />
          <Input
            label="Apellido"
            name="shipping_address.last_name"
            autoComplete="family-name"
            value={formData["shipping_address.last_name"]}
            onChange={handleChange}
            required
            data-testid="shipping-last-name-input"
            className="bg-gray-700/50 border-gray-600 text-white focus:border-[#66DEDB] focus:ring-[#66DEDB]"
          />
          <div className="flex gap-0 bg-gray-700/50 border border-gray-600 rounded-lg overflow-hidden focus-within:border-[#66DEDB] focus-within:ring-1 focus-within:ring-[#66DEDB]">
            <select
              name="phone_country_code"
              value={formData.phone_country_code || "+57"}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  phone_country_code: e.target.value,
                })
              }}
              className="px-2 py-2 bg-gray-700 border-0 border-r border-gray-600 text-white text-sm focus:outline-none focus:ring-0"
              style={{ backgroundColor: 'rgb(55 65 81)' }}
            >
              <option value="+57" style={{ backgroundColor: 'rgb(55 65 81)' }}>+57</option>
              <option value="+1" style={{ backgroundColor: 'rgb(55 65 81)' }}>+1</option>
              <option value="+52" style={{ backgroundColor: 'rgb(55 65 81)' }}>+52</option>
              <option value="+54" style={{ backgroundColor: 'rgb(55 65 81)' }}>+54</option>
              <option value="+55" style={{ backgroundColor: 'rgb(55 65 81)' }}>+55</option>
              <option value="+56" style={{ backgroundColor: 'rgb(55 65 81)' }}>+56</option>
              <option value="+51" style={{ backgroundColor: 'rgb(55 65 81)' }}>+51</option>
              <option value="+58" style={{ backgroundColor: 'rgb(55 65 81)' }}>+58</option>
              <option value="+593" style={{ backgroundColor: 'rgb(55 65 81)' }}>+593</option>
              <option value="+507" style={{ backgroundColor: 'rgb(55 65 81)' }}>+507</option>
              <option value="+34" style={{ backgroundColor: 'rgb(55 65 81)' }}>+34</option>
              <option value="+44" style={{ backgroundColor: 'rgb(55 65 81)' }}>+44</option>
              <option value="+33" style={{ backgroundColor: 'rgb(55 65 81)' }}>+33</option>
              <option value="+49" style={{ backgroundColor: 'rgb(55 65 81)' }}>+49</option>
              <option value="+39" style={{ backgroundColor: 'rgb(55 65 81)' }}>+39</option>
            </select>
            <input
              name="phone"
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  phone: e.target.value,
                })
              }}
              placeholder="Teléfono *"
              required
              className="flex-1 px-3 py-2 bg-transparent border-0 text-white placeholder-gray-400 focus:outline-none focus:ring-0 text-sm"
            />
          </div>
          <Input
            label="Email"
            name="email"
            type="email"
            title="Ingrese una dirección de correo electrónico válida."
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            required
            data-testid="shipping-email-input"
            className="bg-gray-700/50 border-gray-600 text-white focus:border-[#66DEDB] focus:ring-[#66DEDB]"
          />
        </div>
      </div>

        {/* Sección 2: Dirección de Envío */}
        <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-xl p-3 sm:p-4 shadow-xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 bg-[#73FFA2]/20 rounded-lg">
              <svg className="w-4 h-4 text-[#73FFA2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#73FFA2]">Dirección de Envío</h2>
          </div>

          {/* Selector de direcciones guardadas */}
          {customer && (addressesInRegion?.length || 0) > 0 && (
            <div className="mb-3 p-2.5 bg-gray-700/30 rounded-lg border border-gray-600/50 relative">
              <p className="text-xs text-gray-300 mb-2">
                {`Hola ${customer.first_name}, ¿deseas usar una de tus direcciones guardadas?`}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {addressesInRegion?.map((address) => {
                  const alias = (address.metadata?.alias as string) || "Sin alias"
                  return (
                    <div
                      key={address.id}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={() => handleAddressSelect(address.id)}
                        className={`px-3 py-1.5 rounded-lg border-2 transition-all text-sm flex items-center gap-2 ${
                          selectedAddressId === address.id
                            ? "border-[#73FFA2] bg-[#73FFA2]/10 text-[#73FFA2]"
                            : "border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500"
                        }`}
                      >
                        {selectedAddressId === address.id && (
                          <CheckCircleSolid className="w-4 h-4" />
                        )}
                        <span className="font-medium">{alias}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={handleNewAddress}
                className="absolute top-2 right-2 p-1.5 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-[#73FFA2] transition-all"
                title={!customer ? "Inicia sesión para agregar dirección" : "Agregar dirección"}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Botón para agregar dirección si no hay ninguna */}
          {(!customer || (addressesInRegion?.length || 0) === 0) && (
            <div className="mb-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/50 text-center">
              <p className="text-sm text-gray-300 mb-3">
                {!customer 
                  ? "Para una experiencia más rápida, inicia sesión y guarda tus direcciones"
                  : "No tienes direcciones guardadas"
                }
              </p>
              <button
                onClick={handleNewAddress}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#73FFA2] hover:bg-[#66e68f] text-black font-medium rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                {!customer ? "Inicia sesión para agregar dirección" : "Agregar primera dirección"}
              </button>
            </div>
          )}

          {/* Mostrar información de la dirección seleccionada */}
          {selectedAddressId && (() => {
            const selectedAddress = addressesInRegion?.find(a => a.id === selectedAddressId)
            if (!selectedAddress) return null
            
            const alias = (selectedAddress.metadata?.alias as string) || "Sin alias"
            return (
              <div className="mt-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#73FFA2]">{alias}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditAddress(selectedAddress)
                      }}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="Editar dirección"
                    >
                      <PencilSquare className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteAddress(selectedAddress.id)
                      }}
                      className="p-1 hover:bg-red-900/50 rounded transition-colors"
                      title="Eliminar dirección"
                    >
                      <Trash className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="space-y-0.5 text-sm text-gray-300">
                  <p>{selectedAddress.address_1}</p>
                  {selectedAddress.address_2 && <p className="text-gray-400">{selectedAddress.address_2}</p>}
                  <p>{selectedAddress.city}, {selectedAddress.province}</p>
                  <p>Código Postal: {selectedAddress.postal_code}</p>
                </div>
              </div>
            )
          })()}


        {/* Mostrar costo de envío calculado */}
        {formData["shipping_address.city"] && (
          <div className="mt-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
            {isCalculatingShipping ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#73FFA2]"></div>
                <span>Calculando costo de envío...</span>
              </div>
            ) : shippingError ? (
              <div className="text-sm text-red-400">
                <p className="font-medium">Error al calcular envío:</p>
                <p className="text-xs mt-1">{shippingError}</p>
              </div>
            ) : shippingCost !== null ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Costo de envío:</span>
                <span className="text-lg font-bold text-[#73FFA2]">
                  ${shippingCost.toLocaleString('es-CO')} COP
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* Checkbox para dirección de facturación */}
        <div className="mt-4 pt-4 border-t border-gray-700 h-[48px] flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="same_as_billing"
                name="same_as_billing"
                checked={checked}
                onChange={() => {
                  setChecked(!checked)
                  if (!checked) {
                    // Copy shipping address to billing address
                    const newFormData = { ...formData }
                    Object.keys(formData).forEach((key) => {
                      if (key.startsWith("shipping_address.")) {
                        const billingKey = key.replace(
                          "shipping_address.",
                          "billing_address."
                        )
                        newFormData[billingKey] = formData[key]
                      }
                    })
                    setFormData(newFormData)
                    setHasBillingData(true)
                  } else {
                    setHasBillingData(false)
                  }
                }}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700/50 text-[#73FFA2] focus:ring-2 focus:ring-[#73FFA2] focus:ring-offset-0 focus:ring-offset-gray-800 cursor-pointer accent-[#73FFA2]"
                data-testid="billing-address-checkbox"
              />
              <label
                htmlFor="same_as_billing"
                className="text-gray-300 cursor-pointer"
              >
                La dirección de facturación es la misma que la de envío
              </label>
            </div>
            {!checked && (
              <div className="flex items-center gap-2">
                {hasBillingData ? (
                  <span className="text-xs text-[#66DEDB]">✓ Datos de facturación establecidos</span>
                ) : (
                  <span className="text-xs text-yellow-400">⚠ Datos de facturación requeridos</span>
                )}
                <button
                  onClick={() => setShowBillingModal(true)}
                  className={`px-3 py-1.5 text-xs border rounded-lg transition-all ${
                    hasBillingData 
                      ? "bg-gray-700/50 hover:bg-gray-700 border-gray-600 text-[#66DEDB]"
                      : "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500 text-yellow-400"
                  }`}
                >
                  {hasBillingData ? "Editar" : "Agregar"}
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Modales */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          selectedPaymentMethod={selectedPaymentMethod}
          onPaymentMethodSelect={handlePaymentMethodSelect}
          onPayment={handlePayment}
          paymentEpayco={paymentEpayco}
          canUseCashOnDelivery={canUseCashOnDelivery}
        />

      <AddressModal
        isOpen={showAddressModal}
        onClose={() => {
          setShowAddressModal(false)
          setEditingAddress(null)
        }}
        onSave={handleAddressSaved}
        customer={customer}
        editingAddress={editingAddress}
        selectedAddressId={selectedAddressId}
        onSelectAsDefault={(addressId) => {
          setSelectedAddressId(addressId)
          setDefaultAddressId(addressId)
          const address = addressesInRegion?.find(a => a.id === addressId)
          if (address) {
            setFormAddress(address as HttpTypes.StoreCartAddress, customer?.email)
          }
        }}
      />

      <BillingModal
        isOpen={showBillingModal}
        onClose={() => setShowBillingModal(false)}
        onSave={(billingData) => {
          setFormData((prev) => ({ ...prev, ...billingData }))
          setHasBillingData(true)
        }}
        initialData={formData}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  )
}

export default FormTanku
