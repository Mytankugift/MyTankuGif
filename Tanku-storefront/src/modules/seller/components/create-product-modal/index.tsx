import Trash from "@modules/common/icons/trash"
import React, { useEffect, useState } from "react"
import { Button, FocusModal, Heading, Input, Label, Text, Container, Select } from "@medusajs/ui"
import { postAddProduct } from "@modules/seller/actions/post-add-product"
import { useStoreTanku } from "@lib/context/store-context"
import { sdk } from "@lib/config"
import loading from "app/(main)/account/loading"
import { StoreProductCategory } from "@medusajs/types"

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
  fetchProducts: () => Promise<void>
}

export function CreateProductModal({ open, setOpen, fetchProducts }: CreateProductModalProps) {
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
      fetchProducts()
      setOpen(false)
    })
  }
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<StoreProductCategory[]>([])
  const [selectedCategories, setSelectedCategories] = useState<StoreProductCategory[]>([])

  useEffect(() => {
    if (!loading) return
    sdk.store.category.list()
      .then(({ product_categories }) => {
        setCategories(product_categories)
        setLoading(false)
      })
  }, [loading])

  return (
    <FocusModal open={open} onOpenChange={setOpen}>
      <FocusModal.Content className="z-50 bg-gray-800 border-2 border-[#3B9BC3]">
        <FocusModal.Header className="bg-gray-700 border-b border-gray-600">
          <FocusModal.Title className="text-white text-xl font-semibold">
            Crear Producto
          </FocusModal.Title>
          <button 
            onClick={saveProduct}
            className="px-6 py-2 bg-[#73FFA2] text-gray-900 rounded-lg font-medium hover:bg-[#66e891] transition-colors"
          >
            Guardar
          </button>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center py-6 overflow-y-auto bg-gray-800">
          <div className="max-w-lg w-full px-6">
            <div className="flex flex-col gap-y-8">
              <div className="flex flex-col gap-y-4">
                <h2 className="text-2xl font-bold text-white mb-4">Información del Producto</h2>
                <div className="flex flex-col gap-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Título</label>
                    <input
                      type="text"
                      name="title"
                      value={productData.title}
                      onChange={handleInputChange}
                      placeholder="Título del producto"
                      disabled={productData.images.length > 4}
                      className="w-full px-3 py-2 bg-gray-700 border border-[#3B9BC3] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#66DEDB] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Imágenes</label>
                    <input
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
                      className="w-full px-3 py-2 bg-gray-700 border border-[#3B9BC3] rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#73FFA2] file:text-gray-900 hover:file:bg-[#66e891]"
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
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full transition-colors"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Descripción</label>
                    <input
                      type="text"
                      name="description"
                      value={productData.description}
                      onChange={handleInputChange}
                      placeholder="Descripción del producto"
                      className="w-full px-3 py-2 bg-gray-700 border border-[#3B9BC3] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#66DEDB] transition-colors"
                    />
                  </div>
                  <button 
                    onClick={addOption} 
                    className="w-full px-4 py-2 bg-[#66DEDB] text-gray-900 rounded-lg font-medium hover:bg-[#5bc5c1] transition-colors"
                  >
                    Agregar Opción
                  </button>
                  {productData.options.map((option, index) => (
                    <div key={index} className="border border-gray-600 bg-gray-700 rounded-lg p-4 flex flex-col gap-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-300 mb-2">Título de la Opción</label>
                          <input
                            type="text"
                            value={option.title}
                            onChange={(e) => {
                              const newOptions = [...productData.options]
                              newOptions[index].title = e.target.value
                              setProductData({ ...productData, options: newOptions })
                            }}
                            placeholder="Talla, Color, etc."
                            className="w-full px-3 py-2 bg-gray-600 border border-[#3B9BC3] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#66DEDB] transition-colors"
                          />
                        </div>
                        <button
                          onClick={() => removeOption(index)}
                          className="ml-3 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Valores (separados por coma)</label>
                        <input
                          type="text"
                          value={option.values.join(", ")}
                          onChange={(e) => addValuesToOption(index, e.target.value)}
                          placeholder="Pequeño, Mediano, Grande"
                          className="w-full px-3 py-2 bg-gray-600 border border-[#3B9BC3] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#66DEDB] transition-colors"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value, valueIndex) => (
                          <div
                            key={valueIndex}
                            className="inline-flex items-center gap-x-1 bg-[#73FFA2] text-gray-900 px-3 py-1 rounded-full"
                          >
                            <span className="text-sm font-medium">{value}</span>
                            <button
                              onClick={() => removeValueFromOption(index, valueIndex)}
                              className="p-0 hover:bg-gray-800 hover:text-white rounded-full transition-colors"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={addVariant} 
                    className="w-full px-4 py-2 bg-[#3B9BC3] text-white rounded-lg font-medium hover:bg-[#2a7a9e] transition-colors"
                  >
                    Agregar Variante
                  </button>
                  
                  {productData.variants.map((variant, index) => (
                    <div key={index} className="border border-gray-600 bg-gray-700 rounded-lg p-4 flex flex-col gap-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-white">Variante {index + 1}</h3>
                        <button
                          onClick={() => removeVariant(index)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                      {productData.options.map((option) => (
                        <div key={option.title} className="mt-2">
                          <label className="block text-sm font-medium text-gray-300 mb-2">{option.title}</label>
                          <select
                            onChange={(e) => {
                              const newVariants = [...productData.variants]
                              newVariants[index].options[option.title] = e.target.value
                              newVariants[index].sku = generateSKU(productData.title, newVariants[index].options)
                              setProductData({ ...productData, variants: newVariants })
                            }}
                            value={variant.options[option.title] || ''}
                            className="w-full px-3 py-2 bg-gray-600 border border-[#3B9BC3] rounded-lg text-white focus:outline-none focus:border-[#66DEDB] transition-colors"
                          >
                            <option value="">Seleccione un valor</option>
                            {option.values
                              .filter(value => value.trim() !== '')
                              .map((value, idx) => (
                                <option key={idx} value={value}>
                                  {value}
                                </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Precio (COP)</label>
                        <input
                          type="number"
                          value={variant.prices[0].amount}
                          onChange={(e) => {
                            const newVariants = [...productData.variants]
                            newVariants[index].prices[0].amount = parseFloat(e.target.value ?? 1)
                            setProductData({ ...productData, variants: newVariants })
                          }}
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-gray-600 border border-[#3B9BC3] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#66DEDB] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Cantidad</label>
                        <input
                          type="number"
                          value={variant.quantity}
                          onChange={(e) => {
                            const newVariants = [...productData.variants]
                            newVariants[index].quantity = parseInt(e.target.value ?? 0)
                            setProductData({ ...productData, variants: newVariants })
                          }}
                          placeholder="0"
                          min={0}
                          className="w-full px-3 py-2 bg-gray-600 border border-[#3B9BC3] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#66DEDB] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">SKU</label>
                        <input
                          value={variant.sku}
                          onChange={(e) => {
                            const newVariants = [...productData.variants]
                            newVariants[index].sku = e.target.value
                            setProductData({ ...productData, variants: newVariants })
                          }}
                          placeholder="SKU del producto"
                          className="w-full px-3 py-2 bg-gray-600 border border-[#3B9BC3] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#66DEDB] transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-medium text-white mb-4">Categorías</h3>
                {loading && <span className="block mt-2 text-gray-400">Cargando categorías...</span>}
                {!loading && categories.length === 0 && (
                  <span className="block mt-2 text-gray-400">No se encontraron categorías.</span>
                )}
                {!loading && categories.length > 0 && (
                  <div className="mt-2">
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {categories.map((category) => {
                        const isSelected = selectedCategories.some(c => c.id === category.id);
                        return (
                          <div 
                            key={category.id} 
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCategories(selectedCategories.filter(c => c.id !== category.id));
                              } else {
                                setSelectedCategories([...selectedCategories, category]);
                              }
                            }}
                            className={`py-2 px-3 text-sm border rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-[#73FFA2] text-gray-900 border-[#73FFA2]' 
                                : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:border-[#66DEDB]'
                            }`}
                          >
                            {category.name}
                          </div>
                        );
                      })}
                    </div>
                    
                    {selectedCategories.length > 0 && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Categorías seleccionadas</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedCategories.map((category) => (
                            <div 
                              key={category.id} 
                              className="flex items-center bg-[#66DEDB] text-gray-900 px-3 py-1 rounded-full text-sm font-medium"
                            >
                              <span>{category.name}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCategories(selectedCategories.filter(c => c.id !== category.id));
                                }}
                                className="ml-2 text-gray-900 hover:text-gray-700 font-bold"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
