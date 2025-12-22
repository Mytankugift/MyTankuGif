"use client"
import { useState, useEffect, useRef } from "react"
import Papa, { ParseResult } from 'papaparse'
import {
  Container,
  Heading,
  Table,
  Button,
  Input,
  Text,
  Badge,
} from "@medusajs/ui"
import { 
  ArrowDownTray, 
  ArrowUpTray,
  Plus,
  PencilSquare
} from "@medusajs/icons"
import { CreateProductModal } from "../create-product-modal"
import { fetchSellerProduct } from "../../actions/get-seller-products"
import { useStoreTanku } from "@lib/context/store-context"
import Spinner from "@modules/common/icons/spinner"
import Image from "next/image"
import ViewProductModal from "../view-product-modal"
import EditProductModal from "../edit-product-modal"
import { postAddProducts } from "@modules/seller/actions/post-add-products"

interface Inventory {
  id: string
  variant_id: string
  quantity_stock: number
  currency_code: string
  price: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// Interfaz para la variante que se usará en la importación
export interface ImportProductVariant {
  options: Record<string, string>
  prices: ProductVariantPrice[]
  quantity: number
  sku: string
  // Propiedades opcionales que podrían ser generadas por el servidor
  id?: string
  title?: string
  created_at?: string
  updated_at?: string
  inventory?: any
}

// Interfaz para la variante que viene de la API


export interface Product {
  id: string
  title: string
  description: string | null
  handle: string
  status: string
  thumbnail: string | null
  variants: ProductVariant[]
  created_at: string
  updated_at: string
}

interface CsvProductRow {
  title: string
  description: string
  thumbnail: string
  images: string
  status: string
  option1_title: string
  option1_values: string
  option2_title: string
  option2_values: string
  [key: `variant${number}_sku`]: string
  [key: `variant${number}_option1_value`]: string
  [key: `variant${number}_option2_value`]: string
  [key: `variant${number}_quantity`]: string
  [key: `variant${number}_price`]: string
  [key: `variant${number}_currency`]: string
}

interface ProductVariantPrice {
  amount: number
  currency_code: string
}

// Interfaz para la variante que se usará en la importación
export interface ProductVariant {
  options: Record<string, string>
  prices: ProductVariantPrice[]
  quantity: number
  sku: string
  // Nota: Estas propiedades son generadas por el servidor
  id?: string
  title?: string
  price?: number // Precio de la variante (ya viene en formato correcto, no centavos)
  suggestedPrice?: number | null // Precio sugerido de la variante (ya viene en formato correcto, no centavos)
  created_at?: string
  updated_at?: string
  inventory?: any // Podrías definir una interfaz más específica si es necesario
}

interface ProductOption {
  title: string
  values: string[]
}

export interface ImportProductData {
  title: string
  description: string
  options: ProductOption[]
  variants: ImportProductVariant[]
  images: string[]
}

// Función para transformar los datos del CSV al formato de productos
export function transformCsvToProducts(rows: CsvProductRow[]): ImportProductData[] {
  return rows.map(row => {
    // Extraer opciones del producto
    const options: ProductOption[] = [];
    
    if (row.option1_title && row.option1_values) {
      options.push({
        title: row.option1_title,
        values: Array.from(new Set(row.option1_values.split(',').map(v => v.trim())))
      });
    }
    
    if (row.option2_title && row.option2_values) {
      options.push({
        title: row.option2_title,
        values: Array.from(new Set(row.option2_values.split(',').map(v => v.trim())))
      });
    }

    // Extraer variantes
    const variants: ImportProductVariant[] = [];
    let variantIndex = 1;
    
    while (row[`variant${variantIndex}_sku`]) {
      const sku = row[`variant${variantIndex}_sku`];
      const quantity = parseInt(row[`variant${variantIndex}_quantity`] || '0', 10);
      const price = parseFloat(row[`variant${variantIndex}_price`] || '0');
      const currency = row[`variant${variantIndex}_currency`] || 'COP';
      
      const variant: ImportProductVariant = {
        options: {},
        prices: [{
          amount: Math.round(price * 100), // Convertir a centavos
          currency_code: currency
        }],
        quantity: quantity,
        sku: sku,
        title: `Variante ${variantIndex}`,
        id: `temp-${Date.now()}-${variantIndex}`
      };

      // Añadir opciones de la variante
      if (row.option1_title) {
        const optionValue = row[`variant${variantIndex}_option1_value`]?.trim();
        if (optionValue) {
          variant.options[row.option1_title] = optionValue;
        }
      }
      
      if (row.option2_title) {
        const optionValue = row[`variant${variantIndex}_option2_value`]?.trim();
        if (optionValue) {
          variant.options[row.option2_title] = optionValue;
        }
      }
      
      variants.push(variant);
      variantIndex++;
    }

    // Procesar imágenes
    const images = row.images 
      ? row.images.split(',').map(url => url.trim()).filter(Boolean)
      : [];

    return {
      title: row.title.trim(),
      description: (row.description || '').trim(),
      options,
      variants,
      images
    };
  });
}


const TableProducts = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { storeId } = useStoreTanku()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse<CsvProductRow>(file, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      complete: (results: ParseResult<CsvProductRow>) => {
        try {
          const products = transformCsvToProducts(results.data);
      
          postAddProducts(products, storeId).then(() => {
            fetchProducts()
          })
          
        } catch (error) {
          console.error('Error al transformar los datos:', error);
        }
      },
      error: (error: Error) => {
        console.error('Error al procesar el archivo CSV:', error)
      }
    })
  }



  const fetchProducts = async () => {
    const response = await fetchSellerProduct(storeId)
    setProducts(response)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return (
    <div className="p-6 bg-gray-800 min-h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Productos</h1>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-[#3B9BC3] text-white rounded-lg hover:bg-[#2a7a9e] transition-colors flex items-center gap-2">
            <ArrowDownTray />
            Exportar
          </button>
          <div>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <button 
              className="px-4 py-2 bg-[#66DEDB] text-gray-900 rounded-lg hover:bg-[#5bc5c1] transition-colors flex items-center gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <ArrowUpTray />
              Importar
            </button>
          </div>
          <button 
            className="px-4 py-2 bg-[#73FFA2] text-gray-900 rounded-lg hover:bg-[#66e891] transition-colors flex items-center gap-2"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus />
            Crear
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
          Agregar Filtro
        </button>
        <div className="flex">
          <input
            type="search"
            placeholder="Buscar productos..."
            className="px-4 py-2 bg-gray-700 border border-[#3B9BC3] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#66DEDB] transition-colors"
          />
        </div>
      </div>

      {/* Custom styled table with Tanku theme */}
      <div className="bg-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Imagen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Variantes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {products.length ? (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-600 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Image 
                        src={product.thumbnail || '/placeholder.png'} 
                        alt={product.title}
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{product.title}</div>
                        {product.description && (
                          <div className="text-sm text-gray-400 truncate max-w-xs">{product.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">{product.variants?.length || 0} variantes</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.status === "published" 
                          ? "bg-[#73FFA2] text-gray-900" 
                          : "bg-gray-500 text-white"
                      }`}>
                        {product.status === "published" ? "Publicado" : "Borrador"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button 
                          className="text-[#66DEDB] hover:text-[#5bc5c1] transition-colors"
                          onClick={() => {
                            setSelectedProduct(product)
                            setViewModalOpen(true)
                          }}
                        >
                          Ver
                        </button>
                        <button 
                          className="text-[#73FFA2] hover:text-[#66e891] transition-colors flex items-center gap-1"
                          onClick={() => {
                            setSelectedProduct(product)
                            setEditModalOpen(true)
                          }}
                        >
                          <PencilSquare />
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <Spinner size={20} />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateProductModal open={createModalOpen} setOpen={setCreateModalOpen} fetchProducts={fetchProducts} />
      <ViewProductModal product={selectedProduct} open={viewModalOpen} setOpen={setViewModalOpen} />
      <EditProductModal product={selectedProduct} open={editModalOpen} setOpen={setEditModalOpen} fetchProducts={fetchProducts} />
    </div>
  )
}

export default TableProducts