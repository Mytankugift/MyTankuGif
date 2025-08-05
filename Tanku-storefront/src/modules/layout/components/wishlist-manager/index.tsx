"use client"
import { useEffect, useState } from "react"
import { Button, Input, Label, Switch, Text } from "@medusajs/ui"
import { postAddWishList } from "@modules/home/components/actions/post-add-wish-list"
import { retrieveCustomer } from "@lib/data/customer"
import { getListWishList } from "@modules/home/components/actions/get-list-wish-list"
import { deleteWishList } from "../../../home/components/actions/delete-wish-list"

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
}

const WishlistManager = () => {
  const [wishlistImages, setWishlistImages] = useState<string[]>([])

  useEffect(() => {
    // Define image paths, assuming they are in /public/wishlist
    const images = [
      '/wishlist/wishlistImage1.png',
      '/wishlist/wishlistImage1.svg',
      '/wishlist/wishlistImage2.svg'
    ];
    setWishlistImages(images);
  }, []);

  const getRandomImage = () => {
    if (wishlistImages.length === 0) return '';
    const randomIndex = Math.floor(Math.random() * wishlistImages.length);
    return wishlistImages[randomIndex];
  };
  const [wishLists, setWishLists] = useState<WishList[]>([])
  const [showAddNewForm, setShowAddNewForm] = useState(false)
  const [newListTitle, setNewListTitle] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handlerRetrieveWishList = async () => {
    setLoading(true)
    try {
      const customer = await retrieveCustomer().catch(() => null)
      if (!customer) return
      
      const wishListsData = await getListWishList(customer.id)
      setWishLists(wishListsData || [])
    } catch (error) {
      console.error("Error retrieving wish lists:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNewList = async () => {
    if (!newListTitle.trim()) return

    setLoading(true)
    try {
      const customer = await retrieveCustomer().catch(() => null)
      if (!customer) return

      await postAddWishList({
        title: newListTitle,
        isPublic: isPublic,
        customerId: customer.id
      })

      // Refresh the list
      await handlerRetrieveWishList()
      
      // Reset form
      setNewListTitle("")
      setIsPublic(false)
      setShowAddNewForm(false)
    } catch (error) {
      console.error("Error creating new wishlist:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteList = async (listId: string) => {
    if (deleteConfirm !== listId) {
      setDeleteConfirm(listId)
      return
    }

    setLoading(true)
    try {
      await deleteWishList({ wishListId: listId })
      await handlerRetrieveWishList()
      setDeleteConfirm(null)
    } catch (error) {
      console.error("Error deleting wishlist:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  useEffect(() => {
    handlerRetrieveWishList()
  }, [])

  if (loading && wishLists.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Text className="text-gray-400">Cargando listas de deseos...</Text>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Text className="text-lg font-semibold text-white">Mis Listas de Deseos</Text>
          <Text className="text-sm text-gray-400">
            Gestiona tus listas de deseos personales
          </Text>
        </div>
        <Button 
          onClick={() => setShowAddNewForm(!showAddNewForm)}
          className="bg-[#73FFA2] text-black hover:bg-[#66DEDB] transition-colors"
          disabled={loading}
        >
          {showAddNewForm ? "Cancelar" : "Nueva Lista"}
        </Button>
      </div>

      {/* Add New List Form */}
      {showAddNewForm && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="space-y-4">
            <div>
              <Label htmlFor="list-title" className="text-white">Título de la lista</Label>
              <Input 
                id="list-title" 
                value={newListTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewListTitle(e.target.value)}
                placeholder="Mi nueva lista de deseos"
                className="w-full mt-1 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is-public" className="text-white">Visibilidad</Label>
                <Text className="text-xs text-gray-400">
                  {isPublic ? "Lista pública - visible para otros" : "Lista privada - solo para ti"}
                </Text>
              </div>
              <Switch 
                id="is-public" 
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
            <div className="flex space-x-2 pt-2">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowAddNewForm(false)
                  setNewListTitle("")
                  setIsPublic(false)
                }}
                className="flex-1 bg-gray-700 text-white hover:bg-gray-600"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleAddNewList}
                className="flex-1 bg-[#73FFA2] text-black hover:bg-[#66DEDB]"
                disabled={loading || !newListTitle.trim()}
              >
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Wishlist Bubbles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-items-center">
        {wishLists.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Text className="text-gray-400">No tienes listas de deseos aún</Text>
            <Text className="text-sm text-gray-500 mt-1">
              Crea tu primera lista para organizar tus productos favoritos
            </Text>
          </div>
        ) : (
          <>
            {wishLists.map((list) => {
              const bgImage = getRandomImage();
              return (
                <div key={list.id} className="relative flex flex-col items-center space-y-2 group">
                  <div 
                    className="relative w-32 h-32 rounded-full bg-cover bg-center border-4 border-gray-600 group-hover:border-[#73FFA2] transition-all duration-300 flex items-center justify-center"
                    style={{ backgroundImage: `url(${bgImage})` }}
                  >
                    {list.state_id === "PRIVATE_ID" && (
                      <div className="absolute bottom-0 right-0 bg-gray-800 rounded-full p-1">
                        <img src="/wishlist/padlock 1.svg" alt="Private" className="w-5 h-5" />
                      </div>
                    )}
                    {/* Share/Delete Icons on Hover */}
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button onClick={() => handleDeleteList(list.id)} className="text-white p-2 rounded-full hover:bg-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <button className="text-white p-2 rounded-full hover:bg-white/20">
                        <img src="/wishlist/more.png" alt="Share" className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  <Text className="font-medium text-white mt-2">{list.title}</Text>
                </div>
              )
            })}

            {/* Add New Wishlist Bubble */}
            <div className="relative flex flex-col items-center space-y-2 cursor-pointer" onClick={() => setShowAddNewForm(true)}>
              <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-600 hover:border-[#73FFA2] transition-all duration-300 flex items-center justify-center">
                <img src="/wishlist/more.png" alt="Add New" className="w-12 h-12 opacity-50" />
              </div>
              <Text className="font-medium text-white mt-2">Nueva Wishlist</Text>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default WishlistManager
