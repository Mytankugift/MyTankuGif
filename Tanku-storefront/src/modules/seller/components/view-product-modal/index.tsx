"use client"
import { Drawer, Heading, Text, Table } from "@medusajs/ui"
import { Product } from "../table-products"
import Image from "next/image"

interface ViewProductModalProps {
  product: Product | null
  open: boolean
  setOpen: (open: boolean) => void
}

const ViewProductModal = ({ product, open, setOpen }: ViewProductModalProps) => {
  if (!product) return null

  return (
    <Drawer open={open} onOpenChange={setOpen} >
      <Drawer.Content className="py-20 z-50">
        <Drawer.Header>
          <div className="flex gap-4 items-start mb-4">
            <div className="w-24 h-24 relative">
              <Image
                src={product.thumbnail || "/placeholder.png"}
                alt={product.title}
                fill
                className="object-cover rounded"
              />
            </div>
            <div>
              <Drawer.Title>
                <Heading level="h1">{product.title}</Heading>
              </Drawer.Title>
              {product.description && (
                <Text className="text-ui-fg-subtle mt-2">{product.description}</Text>
              )}
            </div>
          </div>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4">
          <div>
            <Heading level="h2" className="mb-4">Variantes e Inventario</Heading>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Variante</Table.HeaderCell>
                  <Table.HeaderCell>SKU</Table.HeaderCell>
                  <Table.HeaderCell>Stock</Table.HeaderCell>
                  <Table.HeaderCell>Precio</Table.HeaderCell>
                  <Table.HeaderCell>Moneda</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {product.variants.map((variant) => (
                  <Table.Row key={variant.id}>
                    <Table.Cell>
                      <Text>{variant.title}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text>{variant.sku}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text>{variant.inventory.quantity_stock}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text>{variant.inventory.price.toLocaleString()}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text>{variant.inventory.currency_code}</Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
          <div>
            <Heading level="h2" className="mb-2">Información Adicional</Heading>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text className="text-ui-fg-subtle">Estado</Text>
                <Text>{product.status}</Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle">Fecha de Creación</Text>
                <Text>{new Date(product.created_at).toLocaleDateString()}</Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle">Última Actualización</Text>
                <Text>{new Date(product.updated_at).toLocaleDateString()}</Text>
              </div>
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}

export default ViewProductModal
