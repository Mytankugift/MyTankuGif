import Trash from "@modules/common/icons/trash"
import React, { useState } from "react"
import { Button, FocusModal, Heading, Input, Label, Text, Container, Select } from "@medusajs/ui"
import { postAddProduct } from "@modules/seller/actions/post-add-product"
import { useStoreTanku } from "@lib/context/store-context"

interface ProductOption {
  title: string
  values: string[]
}

interface ProductVariant {
  options: Record<string, string>
  prices: { amount: number; currency_code: string }[]
  quantity: number
  sku: string
}

export interface Product {
  title: string
  description: string
  options: ProductOption[]
  variants: ProductVariant[]
  images: { index: number; file: File }[]
}

interface CreateProductModalProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function CreateProductModal({ open, setOpen }: CreateProductModalProps) {
  const { storeId } = useStoreTanku()
  const [productData, setProductData] = useState<Product>({
    title: "",
    description: "",
    options: [],
    variants: [],
    images: [],
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProductData({
      ...productData,
      [name]: value,
    })
  }

  const addOption = () => {
    setProductData({
      ...productData,
      options: [...productData.options, { title: "", values: [] }],
    })
  }

  const removeOption = (index: number) => {
    setProductData({
      ...productData,
      options: productData.options.filter((_, i) => i !== index),
    })
  }

  const addValuesToOption = (index: number, values: string) => {
    const newOptions = [...productData.options]
    newOptions[index].values = values.split(",").map((v) => v.trim())
    setProductData({ ...productData, options: newOptions })
  }

  const removeValueFromOption = (optionIndex: number, valueIndex: number) => {
    const newOptions = [...productData.options]
    newOptions[optionIndex].values.splice(valueIndex, 1)
    setProductData({ ...productData, options: newOptions })
  }

  const addVariant = () => {
    setProductData({
      ...productData,
      variants: [
        ...productData.variants,
        {
          options: {},
          prices: [{ amount: 0, currency_code: "COP" }],
          quantity: 0,
          sku: generateSKU(productData.title, {}),
        },
      ],
    })
  }

  const removeVariant = (index: number) => {
    setProductData({
      ...productData,
      variants: productData.variants.filter((_, i) => i !== index),
    })
  }

  const generateSKU = (title: string, options: Record<string, string>) => {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 6)
    
    const optionSlug = Object.values(options)
      .map(value => value.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 3))
      .join('')
    
    return `${baseSlug}-${optionSlug}-${Date.now().toString().substring(9)}`
  }

  const saveProduct = () => {
    if (!productData.title || !productData.description) {
      alert("Por favor, completa el título y la descripción del producto.")
      return
    }
    if (productData.variants.some((variant) => variant.quantity < 0)) {
      alert("La cantidad de variantes no puede ser negativa.")
      return
    }
    if (productData.variants.some((variant) => !variant.sku)) {
      alert("Todas las variantes deben tener un SKU.")
      return
    }
    
    postAddProduct(productData, storeId).then(() => {
      setProductData({
        title: "",
        description: "",
        options: [],
        variants: [],
        images: [],
      })
      setOpen(false)
    })
  }

  return (
    <FocusModal open={open} onOpenChange={setOpen}>
      <FocusModal.Content className="z-50 ">
        <FocusModal.Header>
          <FocusModal.Title>
            Crear Producto
          </FocusModal.Title>
          <Button variant="secondary" onClick={saveProduct}>
            Guardar
          </Button>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center py-16 overflow-y-auto">
          <Container className="max-w-lg">
            <div className="flex flex-col gap-y-8">
              <div className="flex flex-col gap-y-4">
                <Heading level="h1">Crear Producto</Heading>
                <div className="flex flex-col gap-y-4">
                  <div>
                    <Label>Título</Label>
                    <Input
                      type="text"
                      name="title"
                      value={productData.title}
                      onChange={handleInputChange}
                      placeholder="Título del producto"
                      disabled={productData.images.length > 4}
                    />
                  </div>
                  <div>
                    <Label>Imágenes</Label>
                    <Input
                      type="file"
                      multiple
                      name="images"
                      onChange={(e) => {
                        const files = (e.target as HTMLInputElement).files
                        if (files) {
                          setProductData( (data)=>{ 

                           const info = productData.images.length? {
                            ...productData,
                            images:  [...productData.images, ...Array.from(files).map((file, index) => ({
                              file,
                              index: index + productData.images.length,
                            }))],
                          }: {
                            ...productData,
                            images: Array.from(files).map((file, index) => ({
                              file,
                              index,
                            })),
                          }
                            return info})
                        }
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {productData.images.map(({ file, index }) => (
                      <div key={index} className="relative">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                        <button
                          onClick={() => {
                            setProductData({
                              ...productData,
                              images: productData.images.filter((i) => i.index !== index),
                            })
                          }}
                          className="absolute top-0 right-0 bg-black text-white px-2 py-1 rounded-full"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label>Descripción</Label>
                    <Input
                      type="text"
                      name="description"
                      value={productData.description}
                      onChange={handleInputChange}
                      placeholder="Descripción del producto"
                    />
                  </div>
                  <Button variant="primary" onClick={addOption} className="w-full">
                    Agregar Opción
                  </Button>
                  {productData.options.map((option, index) => (
                    <div key={index} className="border rounded-lg p-4 flex flex-col gap-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <Label>Título de la Opción</Label>
                          <Input
                            type="text"
                            value={option.title}
                            onChange={(e) => {
                              const newOptions = [...productData.options]
                              newOptions[index].title = e.target.value
                              setProductData({ ...productData, options: newOptions })
                            }}
                            placeholder="Talla, Color, etc."
                          />
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => removeOption(index)}
                          className="ml-2"
                        >
                          <Trash />
                        </Button>
                      </div>
                      <div>
                        <Label>Valores (separados por coma)</Label>
                        <Input
                          type="text"
                          value={option.values.join(", ")}
                          onChange={(e) => addValuesToOption(index, e.target.value)}
                          placeholder="Pequeño, Mediano, Grande"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value, valueIndex) => (
                          <div
                            key={valueIndex}
                            className="inline-flex items-center gap-x-1 bg-gray-100 px-3 py-1 rounded-full"
                          >
                            <Text>{value}</Text>
                            <Button
                              variant="transparent"
                              onClick={() => removeValueFromOption(index, valueIndex)}
                              className="p-0"
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button variant="primary" onClick={addVariant} className="w-full">
                    Agregar Variante
                  </Button>
                  
                  {productData.variants.map((variant, index) => (
                    <div key={index} className="border rounded-lg p-4 flex flex-col gap-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Variante {index + 1}</Label>
                        <Button
                          variant="secondary"
                          onClick={() => removeVariant(index)}
                        >
                          <Trash />
                        </Button>
                      </div>
                      {productData.options.map((option) => (
            <div key={option.title} className="mt-2">
              <Label>{option.title}</Label>
              <Select
                onValueChange={(value) => {
                  const newVariants = [...productData.variants]
                  newVariants[index].options[option.title] = value
                  newVariants[index].sku = generateSKU(productData.title, newVariants[index].options)
                  setProductData({ ...productData, variants: newVariants })
                }}
                value={variant.options[option.title] || ''}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Seleccione un valor" />
                </Select.Trigger>
                <Select.Content className="z-[60]">
                {option.values
                  .filter(value => value.trim() !== '')
                  .map((value, idx) => (
                    <Select.Item key={idx} value={value}>
                      {value}
                    </Select.Item>
                ))}
                </Select.Content>
              </Select>
            </div>
          ))}
                      <div>
                        <Label>Precio (COP)</Label>
                        <Input
                          type="number"
                          value={variant.prices[0].amount}
                          onChange={(e) => {
                            const newVariants = [...productData.variants]
                            newVariants[index].prices[0].amount = parseFloat(e.target.value ?? 1)
                            setProductData({ ...productData, variants: newVariants })
                          }}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          value={variant.quantity}
                          onChange={(e) => {
                            const newVariants = [...productData.variants]
                            newVariants[index].quantity = parseInt(e.target.value ?? 0)
                            setProductData({ ...productData, variants: newVariants })
                          }}
                          placeholder="0"
                          min={0}
                        />
                      </div>
                      <div>
                        <Label>SKU</Label>
                        <Input
                          value={variant.sku}
                          onChange={(e) => {
                            const newVariants = [...productData.variants]
                            newVariants[index].sku = e.target.value
                            setProductData({ ...productData, variants: newVariants })
                          }}
                          placeholder="SKU del producto"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
