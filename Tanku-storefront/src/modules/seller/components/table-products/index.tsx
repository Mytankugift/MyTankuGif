"use client"
import React from "react"
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
  Plus
} from "@medusajs/icons"
import { CreateProductModal } from "../create-product-modal"


const TableProducts = () => {
  const [open, setOpen] = React.useState(false)
  const mockData = [
    {
      id: "1",
      title: "Basic T-Shirt",
      variants: 3,
      status: "published",
    },
    {
      id: "2",
      title: "Denim Jeans",
      variants: 5,
      status: "draft",  
    },
  ]

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
          <Button variant="secondary" onClick={() => setOpen(true)}>
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
            <Table.HeaderCell>Product</Table.HeaderCell>
            <Table.HeaderCell>Variants</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {mockData.map((product) => (
            <Table.Row key={product.id}>
              <Table.Cell>
                <Text>{product.title}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text>{product.variants}</Text>
              </Table.Cell>
              <Table.Cell>
                <Badge color={product.status === "published" ? "green" : "grey"}>
                  {product.status}
                </Badge>
              </Table.Cell>
              <Table.Cell></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <CreateProductModal open={open} setOpen={setOpen} />
    </Container>
  )
}

export default TableProducts