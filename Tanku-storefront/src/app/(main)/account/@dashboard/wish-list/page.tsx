"use client"

import { useEffect, useState } from "react"
import { Text, Heading, Button } from "@medusajs/ui"
import { retrieveCustomer } from "@lib/data/customer"
import { getListWishList } from "@modules/home/components/actions/get-list-wish-list"
import { deleteProductToWishList } from "@modules/home/components/actions/delete-product-to-wish_list"
import Image from "next/image"
import Link from "next/link"

type WishList = {
  id: string
  title: string
  state_id: string
  state?: {
    id: string
  }
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  products?: Product[]
}

type Product = {
  id: string
  title: string
  thumbnail?: string
  handle: string
  subtitle: string | null
  description: string
  is_giftcard: boolean
  status: string
  discountable: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Añadimos campos opcionales para manejar posibles propiedades adicionales
  [key: string]: any
}

export default function WishListPage() {
  const [wishLists, setWishLists] = useState<WishList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({})

  // Función para obtener las listas de deseos y sus productos
  const fetchWishLists = async () => {
    setLoading(true)
    try {
      const customer = await retrieveCustomer().catch(() => null)
      if (!customer) {
        setError("Debes iniciar sesión para ver tus listas de deseos")
        setLoading(false)
        return
      }

      // Obtener las listas de deseos con sus productos
      const lists = await getListWishList(customer.id)
      console.log("Listas de deseos obtenidas:", lists)
      
      // La API ya devuelve las listas con sus productos, no necesitamos hacer mapeo adicional
      setWishLists(lists)
      
      // Inicializar el estado de expansión para cada lista
      const initialExpansionState: Record<string, boolean> = {}
      lists.forEach((list: WishList) => {
        initialExpansionState[list.id] = false
      })
      setExpandedLists(initialExpansionState)
    } catch (err) {
      console.error("Error al obtener las listas de deseos:", err)
      setError("Ocurrió un error al cargar tus listas de deseos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWishLists()
  }, [])

  // Function to toggle a wish list expansion
  const toggleListExpansion = (listId: string) => {
    setExpandedLists(prev => ({
      ...prev,
      [listId]: !prev[listId]
    }))
  }

  // Función para eliminar un producto de una lista de deseos
  const removeProductFromList = async (wishListId: string, productId: string) => {
    try {
      // Llamar a la API para eliminar el producto de la lista de deseos
      await handlerRemoveProductFromWishList(productId, wishListId)
      
      // Actualizar el estado local
      setWishLists(prevLists => 
        prevLists.map(list => {
          if (list.id === wishListId) {
            return {
              ...list,
              products: list.products?.filter(p => p.id !== productId) || []
            }
          }
          return list
        })
      )
    } catch (err) {
      console.error("Error al eliminar producto de la lista de deseos:", err)
    }
  }
  
  // Función para manejar la eliminación de productos de listas de deseos
  const handlerRemoveProductFromWishList = async (productId: string, wishListId: string) => {
    try {
      await deleteProductToWishList({ productId, wishListId })
      console.log(`Producto ${productId} eliminado de la lista ${wishListId}`)
      return true
    } catch (error) {
      console.error("Error al eliminar producto de la lista de deseos:", error)
      throw error
    }
  }

  // Function to delete a wish list
  const deleteWishList = async (wishListId: string) => {
    try {
      // API call to delete wish list would go here
      console.log(`Deleting wish list ${wishListId}`)
      
      // Update local state
      setWishLists(prevLists => prevLists.filter(list => list.id !== wishListId))
    } catch (err) {
      console.error("Error deleting wish list:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin border-t-blueTanku"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Text className="text-red-500 mb-4">{error}</Text>
        <Button onClick={() => fetchWishLists()}>Reintentar</Button>
      </div>
    )
  }

  if (wishLists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Heading className="mb-4">No tienes listas de deseos</Heading>
        <Text className="text-gray-500 mb-6">Crea una lista de deseos para guardar productos que te gusten</Text>
        <Link href="/">
          <Button>Explorar productos</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full">
      <div className="mb-8">
        <Heading className="mb-4">Mis Listas de Deseos</Heading>
        <Text className="text-gray-500">Administra tus listas de deseos y los productos guardados</Text>
      </div>

      <div className="w-full space-y-4">
        {wishLists.map((list) => (
          <div key={list.id} className="border rounded-lg overflow-hidden">
            {/* List Header */}
            <div 
              className="px-4 py-3 bg-gray-50 flex items-center justify-between cursor-pointer"
              onClick={() => toggleListExpansion(list.id)}
            >
              <div className="flex items-center gap-2">
                <Text className="font-medium">{list.title}</Text>
                {list.state_id === "PRIVATE_ID" && (
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                    Privada
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Text className="text-sm text-gray-500">
                  {list.products?.length || 0} productos
                </Text>
                <span className="text-lg">
                  {expandedLists[list.id] ? '▼' : '▶'}
                </span>
              </div>
            </div>
            
            {/* List Content */}
            {expandedLists[list.id] && (
              <div className="px-4 py-3">
                <div className="flex justify-between items-center mb-4">
                  <Text className="text-sm text-gray-500">
                    Creada el {new Date(list.created_at || "").toLocaleDateString()}
                  </Text>
                  <Button 
                    variant="secondary" 
                    onClick={() => deleteWishList(list.id)}
                    className="text-red-500 hover:bg-red-50"
                  >
                    Eliminar lista
                  </Button>
                </div>

                {list.products && list.products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {list.products.map((product) => (
                      <div key={product.id} className="border rounded-lg overflow-hidden flex">
                        <div className="w-24 h-24 relative">
                          <Image 
                            src={product.thumbnail || "/placeholder.png"}
                            alt={product.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 p-3 flex flex-col justify-between">
                          <div>
                            <Link href={`/products/tanku/${product.handle}`} className="hover:underline">
                              <Text className="font-medium">{product.title}</Text>
                            </Link>
                            <Text className="text-sm text-gray-600 line-clamp-2">
                              {product.subtitle || product.description?.substring(0, 100)}
                            </Text>
                          </div>
                          <Button 
                            variant="secondary" 
                            onClick={() => removeProductFromList(list.id, product.id)}
                            className="self-end"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Text className="text-gray-500">No hay productos en esta lista</Text>
                    <Link href="/">
                      <Button variant="secondary" className="mt-4">
                        Explorar productos
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}