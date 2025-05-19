"use client"
import { useState, useEffect } from "react"
import {
  FocusModal,
  Button,
  Input,
  Label,
  Heading,
  Container,
  Text,
  Select,
} from "@medusajs/ui"
import { Trash } from "@medusajs/icons"
import { useStoreTanku } from "@lib/context/store-context"
import { Product } from "../table-products"

interface EditProductModalProps {
  product: Product | null
  open: boolean
  setOpen: (open: boolean) => void
  fetchProducts: () => Promise<void>
}

interface ProductOption {
  title: string
  values: string[]
}

interface ProductVariantEdit {
  id?: string
  options: Record<string, string>
  prices: { amount: number; currency_code: string }[]
  quantity: number
  sku: string
  mla_id?: string
}

interface ProductEdit {
  id?: string
  title: string
  description: string
  options: ProductOption[]
  variants: ProductVariantEdit[]
  images: { file: File; index: number }[]
  status?: string
  handle?: string
  thumbnail?: string | null
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

// Función simulada para actualizar el producto
const postUpdateProduct = async (productData: ProductEdit, storeId: string) => {
  // Aquí iría la lógica real para actualizar el producto en el backend
  console.log("Actualizando producto:", productData, "para la tienda:", storeId);
  
  // Simulamos una espera de 1 segundo para simular una petición al servidor
  return new Promise(resolve => setTimeout(resolve, 1000));
}

export default function EditProductModal({ product, open, setOpen, fetchProducts }: EditProductModalProps) {
  console.log("product",product)
  const { storeId } = useStoreTanku()
  const [productData, setProductData] = useState<ProductEdit>({
    title: "",
    description: "",
    options: [],
    variants: [],
    images: [],
  })

  // Cargar los datos del producto cuando cambia el producto seleccionado
  useEffect(() => {
    if (product) {
      // Convertir el producto al formato necesario para la edición
      setProductData({
        id: product.id,
        title: product.title || "",
        description: product.description || "",
        status: product.status,
        handle: product.handle,
        thumbnail: product.thumbnail,
        options: [], // Aquí se cargarían las opciones si estuvieran disponibles en el producto
        variants: product.variants.map(variant => ({
          id: variant.id,
          options: {}, // Aquí se cargarían las opciones si estuvieran disponibles en la variante
          prices: [{ 
            amount: variant.inventory.price, 
            currency_code: variant.inventory.currency_code 
          }],
          quantity: variant.inventory.quantity_stock,
          sku: variant.sku,
          mla_id: variant.mla_id || ""
        })),
        images: [] // Las imágenes no se pueden cargar directamente porque son archivos
      })
    }
  }, [product])

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
          mla_id: ""
        },
      ],
    })
  }

  const removeVariant = (index: number) => {
    if (!productData.variants[index].id) return;
    deleteVariant(productData.variants[index].id).then(()=>{
      setProductData({
        ...productData,
        variants: productData.variants.filter((_, i) => i !== index),
      })
    })
    
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
    
    postUpdateProduct(productData, storeId).then(() => {
      fetchProducts()
      setOpen(false)
    })
  }

  return (
    <FocusModal open={open} onOpenChange={setOpen}>
      <FocusModal.Content className="z-50 ">
        <FocusModal.Header>
          <FocusModal.Title>
            Editar Producto
          </FocusModal.Title>
          <Button variant="secondary" onClick={saveProduct}>
            Guardar Cambios
          </Button>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center py-16 overflow-y-auto">
          <Container className="max-w-lg">
            <div className="flex flex-col gap-y-8">
              <div className="flex flex-col gap-y-4">
                <Heading level="h1">Editar Producto</Heading>
                <div className="flex flex-col gap-y-4">
                  <div>
                    <Label>Título</Label>
                    <Input
                      type="text"
                      name="title"
                      value={productData.title}
                      onChange={handleInputChange}
                      placeholder="Título del producto"
                    />
                  </div>
                  <div>
                    <Label>Imágenes</Label>
                    <div className="mb-4">
                      {productData.thumbnail && (
                        <div className="relative w-32 h-32 mb-2">
                          <img 
                            src={productData.thumbnail} 
                            alt="Imagen actual" 
                            className="w-full h-full object-cover rounded"
                          />
                          <div className="mt-1 text-sm text-gray-500">Imagen actual</div>
                        </div>
                      )}
                    </div>
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
                            // Al cargar nuevas imágenes, eliminamos la referencia a la imagen anterior
                            thumbnail: null
                          }: {
                            ...productData,
                            images: Array.from(files).map((file, index) => ({
                              file,
                              index,
                            })),
                            // Al cargar nuevas imágenes, eliminamos la referencia a la imagen anterior
                            thumbnail: null
                          }
                            return info})
                        }
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {productData.images.map(({ file, index }) => (
                      <div key={index} className="relative">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover rounded" />
                        <button
                          onClick={() => {
                            setProductData({
                              ...productData,
                              images: productData.images.filter((i) => i.index !== index),
                            })
                          }}
                          className="absolute top-0 right-0 bg-black text-white px-2 py-1 rounded-full"
                        >
                          <Trash />
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
                      <div>
                        <Label>ID de Mercado Libre (MLA)</Label>
                        <Input
                          value={variant.mla_id || ""}
                          onChange={(e) => {
                            const newVariants = [...productData.variants]
                            newVariants[index].mla_id = e.target.value
                            setProductData({ ...productData, variants: newVariants })
                          }}
                          placeholder="MLA-123456789"
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
