"use client"

import { HttpTypes } from "@medusajs/types"
import { Container, Button } from "@medusajs/ui"
import Checkbox from "@modules/common/components/checkbox"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"
import { postCheckoutOrder, CheckoutPayload, AddressPayload } from "@modules/checkout/actions/post-checkout-order"

type AddressField = 
  | 'first_name'
  | 'last_name'
  | 'address_1'
  | 'address_2'
  | 'company'
  | 'postal_code'
  | 'city'
  | 'country_code'
  | 'province'
  | 'phone'

const isAddressField = (field: string): field is AddressField => {
  return [
    'first_name',
    'last_name',
    'address_1',
    'address_2',
    'company',
    'postal_code',
    'city',
    'country_code',
    'province',
    'phone'
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.address_2": cart?.shipping_address?.address_2 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code": cart?.shipping_address?.country_code || "co",
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
      'shipping_address.first_name',
      'shipping_address.last_name',
      'shipping_address.address_1',
      'shipping_address.postal_code',
      'shipping_address.city',
      'shipping_address.country_code',
      'email'
    ]

    const billingFields = checked ? [] : [
      'billing_address.first_name',
      'billing_address.last_name',
      'billing_address.address_1',
      'billing_address.postal_code',
      'billing_address.city',
      'billing_address.country_code'
    ]

    return [...requiredFields, ...billingFields].every(field => formData[field] && formData[field].trim() !== '')
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
    if (selectedPaymentMethod === 'epayco') {
      try {
        // Handle ePayco payment
        const payload: CheckoutPayload = {
          shipping_address: {} as AddressPayload,
          billing_address: {} as AddressPayload,
          email: formData.email,
          payment_method: selectedPaymentMethod,
          cart_id: cart?.id
        }

        // Map shipping address fields
        Object.keys(formData).forEach(key => {
          if (key.startsWith('shipping_address.')) {
            const field = key.replace('shipping_address.', '')
            if (isAddressField(field)) {
              payload.shipping_address[field as keyof AddressPayload] = formData[key]
            }
          }
        })

        // Map billing address fields
        if (!checked) {
          Object.keys(formData).forEach(key => {
            if (key.startsWith('billing_address.')) {
              const field = key.replace('billing_address.', '')
              if (isAddressField(field)) {
                payload.billing_address[field as keyof AddressPayload] = formData[key]
              }
            }
          })
        } else {
          payload.billing_address = { ...payload.shipping_address }
        }

      
        const response = await postCheckoutOrder(payload)
       
        
       
      } catch (error) {
        console.error("Error al procesar el pedido:", error)
        
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Datos Personales</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
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

      <h2 className="text-xl font-bold mb-4">Dirección de Envío</h2>
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-6 flex flex-col gap-y-4 p-5">
          <p className="text-small-regular">
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
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
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
        <div className="col-span-2">
          <Input
            label="Detalles de la dirección (opcional)"
            name="shipping_address.address_2"
            autoComplete="address-line2"
            value={formData["shipping_address.address_2"] || ""}
            onChange={handleChange}
          
            data-testid="shipping-address-2-input"
          />
        </div>
        <div className="col-span-2">
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
      <div className="my-8">
        <Checkbox
          label="La dirección de facturación es la misma que la de envío"
          name="same_as_billing"
          checked={checked}
          onChange={() => {
            setChecked(!checked)
            if (!checked) {
              // Copy shipping address to billing address
              const newFormData = { ...formData }
              Object.keys(formData).forEach(key => {
                if (key.startsWith('shipping_address.')) {
                  const billingKey = key.replace('shipping_address.', 'billing_address.')
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
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Dirección de Facturación</h2>
          <div className="grid grid-cols-2 gap-4">
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
            <Input
              label="Dirección"
              name="billing_address.address_1"
              autoComplete="address-line1"
              value={formData["billing_address.address_1"]}
              onChange={handleChange}
              required
              data-testid="billing-address-input"
            />
            <Input
              label="Empresa"
              name="billing_address.company"
              value={formData["billing_address.company"]}
              onChange={handleChange}
              autoComplete="organization"
              data-testid="billing-company-input"
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
            <CountrySelect
              name="billing_address.country_code"
              autoComplete="country"
              region={cart?.region}
              value={formData["billing_address.country_code"]}
              onChange={handleChange}
              required
              data-testid="billing-country-select"
            />
            <Input
              label="Estado / Provincia"
              name="billing_address.province"
              autoComplete="address-level1"
              value={formData["billing_address.province"]}
              onChange={handleChange}
              data-testid="billing-province-input"
            />
            <Input
              label="Teléfono"
              name="billing_address.phone"
              autoComplete="tel"
              value={formData["billing_address.phone"]}
              onChange={handleChange}
              data-testid="billing-phone-input"
            />
          </div>
        </div>
      )}


      {!showPaymentMethods ? (
        <div className="flex justify-end">
          <Button 
            onClick={handleContinue}
            className="min-w-[200px]"
            disabled={!isFormValid()}
          >
            Continuar al Pago
          </Button>
        </div>
      ) : (
        <div className="mt-8 border-t pt-8">
          <h2 className="text-xl font-bold mb-4">Métodos de Pago</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="epayco"
                name="payment-method"
                value="epayco"
                checked={selectedPaymentMethod === 'epayco'}
                onChange={() => handlePaymentMethodSelect('epayco')}
                className="h-4 w-4"
              />
              <div  className="text-base">
                ePayco
              </div>
            </div>
            {selectedPaymentMethod && (
              <div className="flex justify-end mt-6">
                <Button 
                  onClick={handlePayment}
                  className="min-w-[200px]"
                >
                  Proceder al Pago
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FormTanku
