import Trash from "@modules/common/icons/trash"
import React, { useState } from "react"

interface ProductOption {
  title: string
  values: string[]
}

interface ProductVariant {
  title: string
  options: Record<string, string>
  prices: { amount: number; currency_code: string }[]
}

interface Product {
  title: string
  description: string
  options: ProductOption[]
  variants: ProductVariant[]
  images: { index: number; file: File }[]
}

const ProductForm: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
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
          title: "",
          options: {},
          prices: [{ amount: 0, currency_code: "USD" }],
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

  const saveProduct = () => {
    if (!productData.title || !productData.description) {
      alert("Por favor, completa el título y la descripción del producto.")
      return
    }
    setProducts([...products, productData])
    setProductData({
      title: "",
      description: "",
      options: [],
      variants: [],
      images: [],
    })
    alert("Producto guardado correctamente.")
  }

  return (
    <div className="w-full mx-auto bg-white p-6 rounded-lg shadow-md space-y-4">
      <h1 className="text-2xl font-bold text-center">Crear Producto</h1>
      <div>
        <label className="block font-semibold">Título:</label>
        <input
          type="text"
          name="title"
          value={productData.title}
          onChange={handleInputChange}
          className="w-full p-2 border rounded-md"
        />
      </div>
      <div>
        <label className="block font-semibold">Descripción:</label>
        <input
          type="text"
          name="description"
          value={productData.description}
          onChange={handleInputChange}
          className="w-full p-2 border rounded-md"
        />
      </div>
      <button
        onClick={addOption}
        className="w-full p-2 bg-blue-500 text-white rounded-md"
      >
        Agregar Opción
      </button>
      {productData.options.map((option, index) => (
        <div key={index} className="border p-3 rounded-md flex flex-col gap-2">
          <div>
            <div className="flex gap-2">
              <div>
                <label className="block font-semibold">
                  Título de la opción
                </label>
                <input
                  type="text"
                  placeholder="Color"
                  value={option.title}
                  onChange={(e) => {
                    const newOptions = [...productData.options]
                    newOptions[index].title = e.target.value
                    setProductData({ ...productData, options: newOptions })
                  }}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold">
                  Agregar valores separados por coma
                </label>
                <input
                  type="text"
                  placeholder="Blanco, Negro, Verde"
                  onBlur={(e) => addValuesToOption(index, e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
            <ul className="flex flex-wrap gap-2">
              {option.values.map((value, i) => (
                <li
                  key={i}
                  className="bg-gray-200 px-2 py-1 rounded-md flex items-center gap-1"
                >
                  {value}
                  <button
                    onClick={() => removeValueFromOption(index, i)}
                    className="text-red-500 font-bold ml-1"
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => removeOption(index)}
            className="p-2 bg-red-500 text-white rounded-md"
          >
            <Trash />
          </button>
        </div>
      ))}
      <button
        onClick={addVariant}
        className="w-full p-2 bg-green-500 text-white rounded-md"
      >
        Agregar Variante
      </button>
      {productData.variants.map((variant, index) => (
        <div key={index} className="border p-3 rounded-md relative">
          <button
            onClick={() => removeVariant(index)}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-md"
          >
            <Trash />
          </button>
          <label className="block font-semibold">Variante {index + 1}:</label>
          <input
            type="text"
            placeholder="Título de la variante"
            value={variant.title}
            onChange={(e) => {
              const newVariants = [...productData.variants]
              newVariants[index].title = e.target.value
              setProductData({ ...productData, variants: newVariants })
            }}
            className="w-full p-2 border rounded-md"
          />
          {productData.options.map((option) => (
            <div key={option.title} className="mt-2">
              <label className="block font-semibold">{option.title}</label>
              <select
                className="w-full p-2 border rounded-md"
                onChange={(e) => {
                  const newVariants = [...productData.variants]
                  newVariants[index].options[option.title] = e.target.value
                  setProductData({ ...productData, variants: newVariants })
                }}
              >
                <option value="">Seleccione un valor</option>
                {option.values.map((value, idx) => (
                  <option key={idx} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="mt-2">
            <label className="block font-semibold">Precio (USD)</label>
            <input
              type="number"
              min="0"
              className="w-full p-2 border rounded-md"
              value={variant.prices[0].amount}
              onChange={(e) => {
                const newVariants = [...productData.variants]
                newVariants[index].prices[0].amount = parseFloat(e.target.value)
                setProductData({ ...productData, variants: newVariants })
              }}
            />
          </div>
        </div>
      ))}
      <button
        onClick={saveProduct}
        className="w-full p-2 bg-indigo-600 text-white rounded-md"
      >
        Guardar Producto
      </button>
    </div>
  )
}

export default ProductForm
