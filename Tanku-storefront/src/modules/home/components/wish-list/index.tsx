"use client"
import { useEffect, useState } from "react"
import {
  Button,
  Checkbox,
  Drawer,
  Input,
  Label,
  Switch,
  DropdownMenu,
  Text
} from "@medusajs/ui"
import { postAddWishList } from "../actions/post-add-wish-list"
import { retrieveCustomer } from "@lib/data/customer"
import { getListWishList } from "../actions/get-list-wish-list"
import { postAddProductToWishList } from "../actions/post-add-product-to-wishList"
import { deleteProductToWishList } from "../actions/delete-product-to-wish_list"

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
  selected?: boolean
  products?: Array<{
    id: string
    title: string
    handle: string
    subtitle: string | null
    description: string
    thumbnail: string
    status: string
    [key: string]: any
  }>
}

interface WishListDropdownProps {
  productId?: string
}

const WishListDropdown = ({ productId }: WishListDropdownProps) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showAddNewForm, setShowAddNewForm] = useState(false)
  const [newListTitle, setNewListTitle] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [productInLists, setProductInLists] = useState<Record<string, boolean>>({})
  
  // Example wish lists
  const [wishLists, setWishLists] = useState<WishList[]>([
    { id: "1", title: "Favoritos", selected: false, state_id: "PUBLIC_ID" },
    { id: "2", title: "Para comprar después", selected: false, state_id: "PRIVATE_ID" },
    { id: "3", title: "Regalos", selected: false, state_id: "PRIVATE_ID" },
  ])


  // Function to check if product is in each wish list
  const checkProductInWishLists = () => {
    if (!productId) return
    
    try {
      // Create a map to track which wishlists contain the current product
      const productLists: Record<string, boolean> = {}
      
      // Check each wishlist to see if it contains the current product
      wishLists.forEach((list: WishList) => {
        // Check if this list has products and if the current product is in the list
        const hasProduct = list.products?.some((product) => product.id === productId) || false
        productLists[list.id] = hasProduct
        
        // Also update the selected state in the wishlist object
        list.selected = hasProduct
      })
      
      // Update the productInLists state with the new mapping
      setProductInLists(productLists)
      
      // Update the wishLists state to reflect the selected status
      setWishLists(prevLists =>
        prevLists.map(list => ({
          ...list,
          selected: productLists[list.id] || false
        }))
      )
    } catch (error) {
      console.error("Error checking product in wish lists:", error)
    }
  }

  const handlerRemoveProductFromWishList = async (productId: string, wishListId: string) => {
    try {
      await deleteProductToWishList({ productId, wishListId })
    } catch (error) {
      console.error("Error removing product from wish list:", error)
    }
  }
  
  const handlerRetriverWishList = async () => {
    const customer = await retrieveCustomer().catch(() => null)
    if (!customer) return
    
    try {
      const wishListsData = await getListWishList(customer.id)
      console.log("wishLists", wishListsData)
      
      // Process the wishlist data to include the selected property
      const processedWishLists = wishListsData.map((list: WishList) => ({
        ...list,
        selected: false // Initialize all as unselected
      }))
      
      setWishLists(processedWishLists)
      
      // After retrieving wish lists, check which ones contain the current product
      // We need to do this in a callback to ensure we're using the latest wishLists state
      setTimeout(() => checkProductInWishLists(), 0)
    } catch (error) {
      console.error("Error retrieving wish lists:", error)
    }
  }

  useEffect(() => {
    handlerRetriverWishList()
  }, [])
  
  // When productId changes, check if it's in any wish lists
  useEffect(() => {
    if (productId && wishLists.length > 0) {
      // Reset all selections and check which lists contain this product
      checkProductInWishLists()
    }
  }, [productId, wishLists.length])

  const handleCheckboxChange = (id: string) => {
    // Find the list being changed
    const list = wishLists.find(list => list.id === id)
    const newSelectedState = list ? !list.selected : false
    
    // Log information about the selection change
    console.log(`Lista: ${list?.title} - ${newSelectedState ? 'seleccionada' : 'deseleccionada'}`)
    console.log(`ID del producto: ${productId || 'No disponible'}`)
    console.log(`ID de la lista: ${id}`)
    
    // Update the state
    setWishLists(prevLists =>
      prevLists.map(list =>
        list.id === id ? { ...list, selected: newSelectedState } : list
      )
    )
    
    // Update the productInLists state
    setProductInLists(prev => ({
      ...prev,
      [id]: newSelectedState
    }))
    
    // Call API to add or remove product from wish list based on the new state
    if (productId) {
      if (newSelectedState) {
        // Si se está seleccionando, añadir el producto a la lista de deseos
        postAddProductToWishList({productId: productId, wishListId: id})
        .then(() => {
          console.log(`Producto ${productId} añadido a la lista de deseos ${id}`)
        })
        .catch(error => {
          console.error(`Error al añadir producto a la lista de deseos:`, error)
          // Revertir el estado de la UI si la llamada a la API falla
          setProductInLists(prev => ({
            ...prev,
            [id]: false
          }))
          setWishLists(prevLists =>
            prevLists.map(list =>
              list.id === id ? { ...list, selected: false } : list
            )
          )
        })
      } else {
        // Si se está deseleccionando, eliminar el producto de la lista de deseos
        handlerRemoveProductFromWishList(productId, id)
        .then(() => {
          console.log(`Producto ${productId} eliminado de la lista de deseos ${id}`)
        })
        .catch(error => {
          console.error(`Error al eliminar producto de la lista de deseos:`, error)
          // Revertir el estado de la UI si la llamada a la API falla
          setProductInLists(prev => ({
            ...prev,
            [id]: true
          }))
          setWishLists(prevLists =>
            prevLists.map(list =>
              list.id === id ? { ...list, selected: true } : list
            )
          )
        })
      }
    }
  }

  const handleAddNewList = async () => {
    const customer = await retrieveCustomer().catch(() => null)
    if (newListTitle.trim()) {
      try {
        // Call the API to create the wish list
        await postAddWishList({
          title: newListTitle,
          isPublic: isPublic,
          customerId: customer?.id || ""
        })
        
        // Add to local state
        const newList: WishList = {
          id: "",
          title: newListTitle,
          selected: false,
          state_id: isPublic ? "PUBLIC_ID" : "PRIVATE_ID"
        }
        setWishLists(prev => [...prev, newList])
        
        // Reset form
        setNewListTitle("")
        setIsPublic(false)
        setShowAddNewForm(false)
      } catch (error) {
        console.error("Error creating wish list:", error)
      }
    }
  }

  const handleAddToList = (listId: string) => {
    console.log(`Adding product ${productId} to list ${listId}`)
    
  }

  const openDrawer = () => {
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setShowAddNewForm(false)
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Button 
            variant="secondary" 
            className="flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Lista de deseos
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Guardar
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9zm0 16a7 7 0 0 0 7-7 7 7 0 0 0-7-7 7 7 0 0 0-7 7 7 7 0 0 0 7 7zm0-1.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-3.5-3.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm7 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" fill="currentColor"/>
            </svg>
            SalkerGift
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} >
        
        <Drawer.Content className="z-50 h-[50%] m-auto">
          <Drawer.Header>
            <Drawer.Title>Listas de deseos</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-4">
            {!showAddNewForm ? (
              <>
                <div className="space-y-2 mb-4">
                  {wishLists.map((list,index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`list-${list.id}`} 
                        checked={productInLists[list.id] || false}
                        onCheckedChange={() => handleCheckboxChange(list.id)}
                      />
                      <Label htmlFor={`list-${list.id}`} className="flex items-center gap-1">
                        {list.title}
                        {list.state_id === "PRIVATE_ID" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zm-2-4V5a5 5 0 0 0-10 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="16" r="1" fill="currentColor"/>
                          </svg>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => setShowAddNewForm(true)}
                  className="w-full"
                >
                  Agregar nueva lista
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="list-title">Título de la lista</Label>
                  <Input 
                    id="list-title" 
                    value={newListTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewListTitle(e.target.value)}
                    placeholder="Mi nueva lista"
                    className="w-full mt-1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is-public">Lista pública</Label>
                  <Switch 
                    id="is-public" 
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>
                <div className="flex space-x-2 pt-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowAddNewForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddNewList}
                    className="flex-1"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            )}
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary">Cerrar</Button>
            </Drawer.Close>
            {!showAddNewForm && (
              <Button onClick={() => {
                const selectedLists = wishLists.filter(list => list.selected).map(list => list.id)
                if (selectedLists.length > 0 && productId) {
                  console.log(`Adding product ${productId} to lists:`, selectedLists)
                  // Here you would implement the actual logic to add the product to the selected lists
                  setIsDrawerOpen(false)
                }
              }}>
                Guardar
              </Button>
            )}
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </div>
  )
}

export default WishListDropdown