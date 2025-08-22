"use client"
import { useEffect, useState } from "react"
import {
  Button,
  Drawer,
  Input,
  Label,
  Switch,
  Text,
} from "@medusajs/ui"
import Image from "next/image"
import { postAddWishList } from "../actions/post-add-wish-list"
import { retrieveCustomer } from "@lib/data/customer"
import { getListWishList } from "../actions/get-list-wish-list"
import { postAddProductToWishList } from "../actions/post-add-product-to-wishList"
import { deleteProductToWishList } from "../actions/delete-product-to-wish_list"
import { captureUserBehavior } from "@lib/data/events_action_type"

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
  productTitle?: string
}

const backgroundImages = [
  "/wishlist/wishlistImage1.png",
  "/wishlist/wishlistImage1.svg",
  "/wishlist/wishlistImage2.svg",
]

const WishListDropdown = ({ productId, productTitle }: WishListDropdownProps) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showAddNewForm, setShowAddNewForm] = useState(false)
  const [newListTitle, setNewListTitle] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [productInLists, setProductInLists] = useState<Record<string, boolean>>({})
  const [wishLists, setWishLists] = useState<WishList[]>([])

  const checkProductInWishLists = (currentWishLists: WishList[]) => {
    if (!productId) return
    try {
      const productLists: Record<string, boolean> = {}
      currentWishLists.forEach((list: WishList) => {
        const hasProduct =
          list.products?.some((product) => product.id === productId) || false
        productLists[list.id] = hasProduct
      })
      setProductInLists(productLists)
      setWishLists(
        currentWishLists.map((list) => ({
          ...list,
          selected: productLists[list.id] || false,
        }))
      )
      return productLists
    } catch (error) {
      console.error("Error checking product in wish lists:", error)
      return {}
    }
  }

  const handlerRetriverWishList = async () => {
    const customer = await retrieveCustomer().catch(() => null)
    if (!customer) return

    try {
      const wishListsData = await getListWishList(customer.id)
      const processedWishLists = wishListsData.map((list: WishList) => ({
        ...list,
        selected: false,
      }))
      checkProductInWishLists(processedWishLists)
    } catch (error) {
      console.error("Error retrieving wish lists:", error)
    }
  }

  // Solo cargar datos cuando el productId cambie Y el drawer esté abierto
  useEffect(() => {
    if (isDrawerOpen && wishLists.length > 0) {
      checkProductInWishLists(wishLists)
    }
  }, [productId, isDrawerOpen])

  const handleSelectionChange = async (id: string) => {
    const customer = await retrieveCustomer().catch(() => null)
    if (!customer || !productId) return

    const isSelected = productInLists[id]

    setProductInLists((prev) => ({ ...prev, [id]: !isSelected }))

    try {
      if (isSelected) {
        await deleteProductToWishList({ productId, wishListId: id })
        captureUserBehavior(productId, "wishlist")
      } else {
        await postAddProductToWishList({ productId, wishListId: id })
        captureUserBehavior(productId, "wishlist")
      }
      await handlerRetriverWishList()
    } catch (error) {
      console.error("Error updating wish list:", error)
      setProductInLists((prev) => ({ ...prev, [id]: isSelected }))
    }
  }

  const handleAddNewList = async () => {
    const customer = await retrieveCustomer().catch(() => null)
    if (!customer) {
      console.error("Customer not found")
      return
    }

    try {
      const newList = await postAddWishList({
        customerId: customer.id,
        title: newListTitle,
        isPublic: isPublic,
      })

      captureUserBehavior(newList.title, "wishlist")

      setShowAddNewForm(false)
      setNewListTitle("")
      setIsPublic(false)
      await handlerRetriverWishList()

      if (productId) {
        await handleSelectionChange(newList.id)
      }
    } catch (error) {
      console.error("Error al crear nueva lista:", error)
    }
  }

  const openDrawer = async () => {
    setIsDrawerOpen(true)
    // Cargar datos de wishlist solo cuando se abre el drawer
    await handlerRetriverWishList()
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setShowAddNewForm(false)
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button
        variant="secondary"
        className="flex items-center gap-1 sm:gap-2 bg-transparent border border-gray-700 rounded-full p-1 sm:p-1.5 md:p-2 hover:bg-gray-800 transition-colors"
        onClick={openDrawer}
      >
        <Image src="/feed/+.svg" alt="Add to wishlist" width={16} height={16} className="w-3 h-3 sm:w-4 sm:h-4 md:w-4 md:h-4" />
      </Button>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Content className="z-50 h-auto max-h-[95vh] sm:max-h-[90vh] w-[95%] sm:w-[90%] max-w-lg bg-gray-900 text-white border border-gray-700 rounded-t-lg sm:rounded-t-xl m-auto">
          <Drawer.Header className="border-b border-gray-700 p-3 sm:p-4">
            <Drawer.Title className="text-lg sm:text-xl font-bold text-white leading-tight">
              {showAddNewForm ? "Crear Nueva Lista" : `Agregar "${productTitle}" a...`}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-3 sm:p-4 md:p-6 overflow-y-auto">
            {!showAddNewForm ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 justify-items-center">
                {wishLists.map((list, index) => {
                  const isSelected = productInLists[list.id] || false
                  const bgImage = backgroundImages[index % backgroundImages.length]
                  return (
                    <div
                      key={list.id}
                      className="flex flex-col items-center gap-1 sm:gap-2 cursor-pointer group"
                      onClick={() => handleSelectionChange(list.id)}
                    >
                      <div
                        className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 transition-all duration-300 ${isSelected ? "border-green-400 scale-105" : "border-gray-600 group-hover:border-white"}`}>
                        <Image
                          src={bgImage}
                          layout="fill"
                          objectFit="cover"
                          className="rounded-full opacity-50 group-hover:opacity-75 transition-opacity"
                          alt={list.title}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-green-500 bg-opacity-50 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8"><path d="M20 6 9 17l-5-5"/></svg>
                          </div>
                        )}
                        {list.state_id === "PRIVATE_ID" && (
                          <div className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 bg-gray-800 rounded-full p-0.5 sm:p-1">
                            <Image src="/wishlist/padlock 1.svg" width={10} height={10} alt="Private" className="w-2 h-2 sm:w-3 sm:h-3" />
                          </div>
                        )}
                      </div>
                      <Text className="text-xs sm:text-sm text-center font-medium text-gray-300 group-hover:text-white transition-colors max-w-full truncate px-1">
                        {list.title}
                      </Text>
                    </div>
                  )
                })}
                <div
                  className="flex flex-col items-center gap-1 sm:gap-2 cursor-pointer group"
                  onClick={() => setShowAddNewForm(true)}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center transition-all group-hover:border-green-400 group-hover:bg-gray-800">
                    <Image
                      src="/wishlist/more.png"
                      width={32}
                      height={32}
                      alt="Add new list"
                      className="opacity-70 group-hover:opacity-100 transition-opacity w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10"
                    />
                  </div>
                  <Text className="text-xs sm:text-sm text-center font-medium text-gray-300 group-hover:text-white transition-colors max-w-full truncate px-1">
                    Crear lista
                  </Text>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6 max-w-md mx-auto">
                <div>
                  <Label htmlFor="list-title" className="text-gray-300 text-sm sm:text-base">Título de la lista</Label>
                  <Input
                    id="list-title"
                    value={newListTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewListTitle(e.target.value)
                    }
                    placeholder="Mi nueva lista de deseos"
                    className="w-full mt-1 sm:mt-2 bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:ring-green-400 focus:border-green-400 text-sm sm:text-base"
                  />
                </div>
                <div className="flex items-center justify-between bg-gray-800 p-2 sm:p-3 rounded-lg">
                  <Label htmlFor="is-public" className="text-gray-300 text-sm sm:text-base">Lista Privada</Label>
                  <Switch
                    id="is-public"
                    checked={!isPublic}
                    onCheckedChange={(checked) => setIsPublic(!checked)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 pt-2 sm:pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setShowAddNewForm(false)}
                    className="flex-1 bg-gray-700 text-white hover:bg-gray-600 text-sm sm:text-base py-2 sm:py-3"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddNewList}
                    className="flex-1 bg-green-600 text-white hover:bg-green-500 text-sm sm:text-base py-2 sm:py-3"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            )}
          </Drawer.Body>
          <Drawer.Footer className="border-t border-gray-700 p-3 sm:p-4">
            <Drawer.Close asChild>
              <Button variant="secondary" className="w-full bg-gray-700 text-white hover:bg-gray-600 text-sm sm:text-base py-2 sm:py-3">Cerrar</Button>
            </Drawer.Close>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </div>
  )
}

export default WishListDropdown