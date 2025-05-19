"use client"
import {useState, useEffect} from "react"
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

export interface Inventory {
  id: string
  variant_id: string
  quantity_stock: number
  currency_code: string
  price: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ProductVariant {
  id: string
  title: string
  sku: string
  created_at: string
  updated_at: string
  inventory: Inventory
  mla_id?: string
}

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

const TableProducts = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  const { storeId } = useStoreTanku()

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
          <Button variant="secondary">
            <ArrowUpTray className="mr-2" />
            Import
          </Button>
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