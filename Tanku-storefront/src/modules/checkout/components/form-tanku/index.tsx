"use client"

import { HttpTypes } from "@medusajs/types"
import { Container, Button } from "@medusajs/ui"
import Checkbox from "@modules/common/components/checkbox"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"
import {
  postCheckoutOrder,
  CheckoutPayload,
  AddressPayload,
} from "@modules/checkout/actions/post-checkout-order"
import { retrieveCustomer } from "@lib/data/customer"
import Script from "next/script"
import { captureUserBehavior } from "@lib/data/events_action_type"

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
  customer,
  cart,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
}) => {
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [paymentEpayco, setPaymentEpayco] = useState<PaymentEpayco | null>(null)
  const [ePaycoButtonLoaded, setEPaycoButtonLoaded] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.address_2": cart?.shipping_address?.address_2 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code":
      cart?.shipping_address?.country_code || "co",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    "billing_address.first_name": cart?.billing_address?.first_name || "",
    "billing_address.last_name": cart?.billing_address?.last_name || "",
    "billing_address.address_1": cart?.billing_address?.address_1 || "",
    "billing_address.address_2": cart?.billing_address?.address_2 || "",
    "billing_address.company": cart?.billing_address?.company || "",
    "billing_address.postal_code": cart?.billing_address?.postal_code || "",
    "billing_address.city": cart?.billing_address?.city || "",
    "billing_address.country_code": cart?.billing_address?.country_code || "co",
    "billing_address.province": cart?.billing_address?.province || "",
    "billing_address.phone": cart?.billing_address?.phone || "",
    email: cart?.email || "",
  })
  const [checked, setChecked] = useState(true)

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
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
        "shipping_address.phone": address?.phone || "",
      }))

    email &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        email: email,
      }))
  }

  useEffect(() => {
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address, cart?.email)
    }

    if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }
  }, [cart])

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

  const handleContinue = () => {
    if (isFormValid()) {
      setShowPaymentMethods(true)
    }
  }

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method)
  }
  
  const handlePayment = async () => {
    const userCustomer = await retrieveCustomer().catch(() => null)
    
    if(!userCustomer) {
      return alert("Debe iniciar sesión para realizar el pago")
    }
    if (selectedPaymentMethod === "epayco") {
      try {
        // Handle ePayco payment
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

       
        const producVariants = cart?.items
          ?.filter(item => item.variant_id !== undefined)
          .map((item) => ({
            title: item.title,
            variant_id: item.variant_id as string, 
            quantity: item.quantity,
            original_total: item.original_total || 0,
            unit_price: item.unit_price || 0,
          }))

        if (!producVariants?.length) {
          return
        }

        const response = await postCheckoutOrder(payload, {
          customer_id: userCustomer?.id || "",
          cart_id: cart?.id || "",
          producVariants: producVariants,
        }).then((response) => {
          producVariants.forEach((item) => {
            console.log("este es el ejecutable de captureUserBehavior", item.title)
            captureUserBehavior(item.title, "purchase")
          })
          console.log("response",response.order)
          setPaymentEpayco(response.order)
        })
      } catch (error) {
        console.error("Error al procesar el pedido:", error)
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-5 lg:p-6 bg-zinc-800 rounded-lg shadow-md text-white">
      <h2 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3 md:mb-4 text-[#3B9BC3]">Datos Personales</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
        <Input
          label="Nombre"
          name="shipping_address.first_name"
          autoComplete="given-name"
          value={formData["shipping_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-first-name-input"
        />
        <Input
          label="Apellido"
          name="shipping_address.last_name"
          autoComplete="family-name"
          value={formData["shipping_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-last-name-input"
        />
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
        />
        <Input
          label="Teléfono"
          name="shipping_address.phone"
          autoComplete="tel"
          value={formData["shipping_address.phone"]}
          onChange={handleChange}
          required
          data-testid="shipping-phone-input"
        />
        <Input
          label="Empresa (opcional)"
          name="shipping_address.company"
          value={formData["shipping_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="shipping-company-input"
        />
      </div>

      <h2 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3 md:mb-4 text-[#3B9BC3]">Dirección de Envío</h2>
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-3 sm:mb-4 md:mb-6 flex flex-col gap-y-2 sm:gap-y-3 md:gap-y-4 p-2 sm:p-3 md:p-5">
          <p className="text-sm sm:text-base">
            {`Hola ${customer.first_name}, ¿deseas usar una de tus direcciones guardadas?`}
          </p>
          <AddressSelect
            addresses={addressesInRegion || []}
            addressInput={cart?.shipping_address || null}
            onSelect={setFormAddress}
            data-testid="shipping-address-select"
          />
        </Container>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
        <div className="col-span-1 sm:col-span-2">
          <Input
            label="Dirección"
            name="shipping_address.address_1"
            autoComplete="address-line1"
            value={formData["shipping_address.address_1"]}
            onChange={handleChange}
            required
            data-testid="shipping-address-input"
          />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <Input
            label="Detalles de la dirección (opcional)"
            name="shipping_address.address_2"
            autoComplete="address-line2"
            value={formData["shipping_address.address_2"] || ""}
            onChange={handleChange}
            data-testid="shipping-address-2-input"
          />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <Input
            label="País"
            name="shipping_address.country_code"
            value="Colombia"
            disabled={true}
            onChange={() => {}}
            data-testid="shipping-country-input"
          />
          <input
            type="hidden"
            name="shipping_address.country_code"
            value="co"
          />
        </div>
        <Input
          label="Departamento"
          name="shipping_address.province"
          autoComplete="address-level1"
          value={formData["shipping_address.province"]}
          onChange={handleChange}
          required
          data-testid="shipping-province-input"
        />
        <Input
          label="Ciudad"
          name="shipping_address.city"
          autoComplete="address-level2"
          value={formData["shipping_address.city"]}
          onChange={handleChange}
          required
          data-testid="shipping-city-input"
        />
        <Input
          label="Código Postal"
          name="shipping_address.postal_code"
          autoComplete="postal-code"
          value={formData["shipping_address.postal_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-postal-code-input"
        />
      </div>
      <div className="my-5 sm:my-8">
        <Checkbox
          label="La dirección de facturación es la misma que la de envío"
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
            }
          }}
          data-testid="billing-address-checkbox"
        />
      </div>

      {!checked && (
        <div className="mt-4 sm:mt-6 md:mt-8">
          <h2 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3 md:mb-4 text-[#3B9BC3]">Dirección de Facturación</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            <Input
              label="Nombre"
              name="billing_address.first_name"
              autoComplete="given-name"
              value={formData["billing_address.first_name"]}
              onChange={handleChange}
              required
              data-testid="billing-first-name-input"
            />
            <Input
              label="Apellido"
              name="billing_address.last_name"
              autoComplete="family-name"
              value={formData["billing_address.last_name"]}
              onChange={handleChange}
              required
              data-testid="billing-last-name-input"
            />
            <div className="col-span-1 sm:col-span-2">
              <Input
                label="Dirección"
                name="billing_address.address_1"
                autoComplete="address-line1"
                value={formData["billing_address.address_1"]}
                onChange={handleChange}
                required
                data-testid="billing-address-input"
              />
            </div>
            <Input
              label="Empresa (opcional)"
              name="billing_address.company"
              value={formData["billing_address.company"]}
              onChange={handleChange}
              autoComplete="organization"
              data-testid="billing-company-input"
            />
            <Input
              label="Teléfono"
              name="billing_address.phone"
              autoComplete="tel"
              value={formData["billing_address.phone"]}
              onChange={handleChange}
              data-testid="billing-phone-input"
            />
            <Input
              label="Código Postal"
              name="billing_address.postal_code"
              autoComplete="postal-code"
              value={formData["billing_address.postal_code"]}
              onChange={handleChange}
              required
              data-testid="billing-postal-code-input"
            />
            <Input
              label="Ciudad"
              name="billing_address.city"
              autoComplete="address-level2"
              value={formData["billing_address.city"]}
              onChange={handleChange}
              required
              data-testid="billing-city-input"
            />
            <Input
              label="Departamento"
              name="billing_address.province"
              autoComplete="address-level1"
              value={formData["billing_address.province"]}
              onChange={handleChange}
              data-testid="billing-province-input"
            />
            <div className="col-span-1 sm:col-span-2">
              <Input
                label="País"
                name="billing_address.country_code"
                value="Colombia"
                disabled={true}
                onChange={() => {}}
                data-testid="billing-country-input"
              />
              <input
                type="hidden"
                name="billing_address.country_code"
                value="co"
              />
            </div>
          </div>
        </div>
      )}

      {!showPaymentMethods ? (
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            className="w-full sm:w-auto sm:min-w-[200px] bg-[#3B9BC3] hover:bg-[#66DEDB] hover:text-zinc-800 transition-colors"
            disabled={!isFormValid()}
          >
            Continuar al Pago
          </Button>
        </div>
      ) : (
        <div className="mt-6 sm:mt-7 md:mt-8 border-t pt-4 sm:pt-6 md:pt-8">
          <h2 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3 md:mb-4 text-[#3B9BC3]">Métodos de Pago</h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <input
                type="radio"
                id="epayco"
                name="payment-method"
                value="epayco"
                checked={selectedPaymentMethod === "epayco"}
                onChange={() => handlePaymentMethodSelect("epayco")}
                className="h-4 w-4"
              />
              <div className="text-sm sm:text-base">ePayco</div>
            </div>
            {selectedPaymentMethod && (
              <div className="flex justify-end mt-4 sm:mt-6">
                <Button onClick={handlePayment} className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px] py-2 sm:py-3 text-sm sm:text-base bg-[#3B9BC3] hover:bg-[#66DEDB] hover:text-zinc-800 transition-colors">
                  Seleccionar método de pago
                </Button>
              </div>
            )}
          </div>
          {paymentEpayco && (
            <>
              {/* Cargamos el script de ePayco oculto cuando el componente se monta */}
              <Script 
                id="epayco-script"
                src="https://checkout.epayco.co/checkout.js"
                strategy="afterInteractive"
              />
              
              <div className="mt-4 sm:mt-6">
                <form id="epayco-payment-form">
                  <div className="mb-3 sm:mb-4">
                    <label htmlFor="epayco-payment" className="block text-sm font-medium text-white mb-2">
                      Pago con ePayco
                    </label>
                    <p className="text-xs sm:text-sm text-gray-300 mb-3 sm:mb-4">Haga clic en el botón a continuación para proceder con el pago seguro a través de ePayco.</p>
                    
                    {/* Botón visible para el usuario */}
                    <div className="flex justify-center sm:justify-end">
                    <Button 
                        type="button"
                        id="epayco-custom-button"
                        className="w-full sm:w-auto bg-[#3B9BC3] hover:bg-[#66DEDB] hover:text-zinc-800 text-white p-2 sm:p-3 md:p-4 text-sm sm:text-base flex items-center justify-center gap-2 transition-colors"
                        onClick={() => {
                          // Verificar si ePayco está cargado
                          if (typeof window.ePayco === 'undefined') {
                            console.error('ePayco no está cargado correctamente');
                            alert('Error al cargar el sistema de pago. Por favor, intente nuevamente.');
                            return;
                          }
                          
                          try {
                            // Crear y configurar el botón de ePayco de forma oculta
                            const container = document.createElement('div');
                            container.style.display = 'none';
                            container.id = 'epayco-container';
                            document.body.appendChild(container);
                            
                            // Crear el botón de ePayco
                            const handler = window.ePayco?.checkout.configure({
                              key: 'a5bd3d6eaf8d072b2ad4265bd2dfaed9',
                              test: true
                            });
                            
                            if (!handler) {
                              throw new Error('No se pudo configurar el checkout de ePayco');
                            }
                            
                            // Abrir el checkout de ePayco
                            handler.open({
                              amount: paymentEpayco.total_amount,
                              name: 'Orden Tanku Test',
                              description: 'Pasarela de pago Tanku',
                              currency: 'cop',
                              country: 'co',
                              external: false,
                              response: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout?step=pagado`,
                              confirmation: `${process.env.NEXT_PUBLIC_MEDUSA_WEBHOOK_URL}/${paymentEpayco.id}`,
                              name_billing: paymentEpayco.first_name,
                              mobilephone_billing: paymentEpayco.phone
                            });
                          } catch (error) {
                            console.error('Error al iniciar el pago con ePayco:', error);
                            alert('Error al iniciar el pago. Por favor, intente nuevamente.');
                          }
                        }}
                      >
                        <span>Pagar con ePayco</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="14" x="2" y="5" rx="2" />
                          <line x1="2" x2="22" y1="10" y2="10" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default FormTanku
