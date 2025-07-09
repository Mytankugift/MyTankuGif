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
          console.log('Productos transformados:', products);
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
    <Container className="mb-0">
      <div className="flex justify-between items-center mb-6">
        <Heading level="h1">Products</Heading>
        <div className="flex gap-2">
          <Button variant="secondary">
            <ArrowDownTray className="mr-2" />
            Export
          </Button>
          <div>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <Button 
              variant="secondary" 
              onClick={() => fileInputRef.current?.click()}
            >
              <ArrowUpTray className="mr-2" />
              Import
            </Button>
          </div>
          <Button variant="secondary" onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2"  />
            Create
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <Button variant="transparent">Add Filter</Button>
        <div className="flex ">
          <Input type="search" placeholder="Search products..." />
          
        </div>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Imagen</Table.HeaderCell>
            <Table.HeaderCell>Producto</Table.HeaderCell>
            <Table.HeaderCell>Variantes</Table.HeaderCell>
            <Table.HeaderCell>Estado</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {products.length ? (
            products.map((product) => (
              <Table.Row key={product.id}>
                <Table.Cell>
                  <Image 
                    src={product.thumbnail || '/placeholder.png'} 
                    alt={product.title}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-cover rounded"
                  />
                </Table.Cell>
                <Table.Cell>
                  <div>
                    <Text className="font-medium">{product.title}</Text>
                    {product.description && (
                      <Text className="text-sm text-gray-500">{product.description}</Text>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Text>{product.variants?.length || 0} variantes</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={product.status === "published" ? "green" : "grey"}>
                    {product.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button 
                      variant="transparent" 
                      size="small"
                      onClick={() => {
                        setSelectedProduct(product)
                        setViewModalOpen(true)
                      }}
                    >
                      Ver
                    </Button>
                    <Button 
                      variant="transparent" 
                      size="small"
                      onClick={() => {
                        setSelectedProduct(product)
                        setEditModalOpen(true)
                      }}
                    >
                      <PencilSquare className="mr-1" />
                      Editar
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center py-8">
                <div className="flex justify-center">
                  <Spinner size="20" />
                </div>
              </td>
            </tr>
          )}
        </Table.Body>
      </Table>
      <CreateProductModal open={createModalOpen} setOpen={setCreateModalOpen} fetchProducts={fetchProducts} />
      <ViewProductModal product={selectedProduct} open={viewModalOpen} setOpen={setViewModalOpen} />
      <EditProductModal product={selectedProduct} open={editModalOpen} setOpen={setEditModalOpen} fetchProducts={fetchProducts} />
    </Container>
  )
}

export default TableProducts