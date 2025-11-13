"use client"

import { Suspense, useState, useRef, useEffect } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { PencilSquare } from "@medusajs/icons"
import { Avatar } from "@medusajs/ui"
import ProfilePanel from "@modules/layout/components/profile-panel"
import SellerPanel from "@modules/layout/components/profile-panel/sellerPanle"
import NewPostPanel from "@modules/layout/components/new-post-panel"
import { updateAvatar } from "@modules/personal-info/actions/update-avatar"
import { usePersonalInfo } from "@lib/context/personal-info-context"
import Modal from "@modules/common/components/modal"
import { retrieveCart } from "@lib/data/cart"

function NavContentNew() {
  const [activeModal, setActiveModal] = useState<'none' | 'newPost' | 'messages'>('none')
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cart, setCart] = useState<any>(null)
  
  // Use personal info context
  const { getUser, refreshPersonalInfo, isLoading } = usePersonalInfo()
  const user = getUser()

  // Load cart
  useEffect(() => {
    const loadCart = async () => {
      try {
        const cartData = await retrieveCart().catch(() => null)
        setCart(cartData)
      } catch (error) {
        console.error('Error loading cart:', error)
        setCart(null)
      }
    }
    loadCart()
  }, [])

  // Fallback logic if user data is not available
  useEffect(() => {
    if (!user && !isLoading) {
      refreshPersonalInfo()
    }
  }, [user, isLoading, refreshPersonalInfo])

  const handleNewPostClick = () => {
    setActiveModal('newPost')
  }

  const handleMessagesClick = () => {
    setActiveModal('messages')
  }

  const handleCloseModal = () => {
    setActiveModal('none')
  }

  const handleEditAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB')
      return
    }

    setIsUpdatingAvatar(true)

    try {
      if (!user?.id) {
        alert('Error: No se pudo identificar al usuario')
        return
      }
      
      const result = await updateAvatar({
        customer_id: user.id,
        avatar: file
      })

      if (result.success && result.data?.avatar_url) {
        await refreshPersonalInfo()
      } else {
        console.error('Error al actualizar avatar:', result.error)
        alert('Error al actualizar el avatar: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating avatar:', error)
      alert('Error al actualizar el avatar')
    } finally {
      setIsUpdatingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const totalCartItems = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0

  return (
    <>
      {/* Nueva Navegación Lateral */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 z-50">
        <nav 
          className="h-full flex flex-col"
          style={{ backgroundColor: '#2D3A3A' }}
        >
          {/* Header con Logo y Avatar - Horizontal */}
          <div className="flex items-center justify-between py-4 px-4 border-b border-gray-700 gap-3">
            {/* Logo */}
            <div>
              <Image 
                src="/logoTanku.png" 
                alt="Logo" 
                width={50} 
                height={50} 
                className="object-contain"
              />
            </div>
            
            {/* Avatar pequeño */}
            <div className="relative group">
                <LocalizedClientLink
                  href="/profile"
                  className="relative hover:scale-105 transition-transform duration-200 block"
                >
                  <div className={`flex items-center justify-center relative ${
                    isUpdatingAvatar ? "opacity-50" : ""
                  }`}>
                  {isLoading ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 animate-pulse" />
                  ) : (
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center">
                      <Image
                        src={user?.avatarUrl || "/default-avatar.png"}
                        alt="User Avatar"
                        width={38}
                        height={38}
                        className="object-cover rounded-full w-full h-full"
                      />
                    </div>
                  )}
                </div>
              </LocalizedClientLink>
              <button
                onClick={handleEditAvatarClick}
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#73FFA2] rounded-full flex items-center justify-center shadow-lg hover:bg-[#66e891] transition-colors duration-200 opacity-0 group-hover:opacity-100"
                disabled={isUpdatingAvatar}
                title="Cambiar avatar"
              >
                <PencilSquare className="w-3 h-3 text-gray-800" />
              </button>
            </div>
          </div>

          {/* Navegación Principal - Scrollable */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            {/* Sección: SOCIAL */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                Social
              </h3>
              <div className="space-y-1">
                <LocalizedClientLink 
                  href="/" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
                >
                  <Image 
                    src="/feed/Icons/Home_Green.png" 
                    alt="MyTANKU" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="text-sm font-medium" style={{ color: '#73FFA2' }}>
                    MyTANKU
                  </span>
                </LocalizedClientLink>

                <button 
                  onClick={handleNewPostClick}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors w-full text-left group"
                >
                  <Image 
                    src="/feed/Icons/Add_Green.png" 
                    alt="Nuevo Post" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="text-sm font-medium" style={{ color: '#73FFA2' }}>
                    Nuevo Post
                  </span>
                </button>

                <button 
                  onClick={handleMessagesClick}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors w-full text-left group"
                >
                  <Image 
                    src="/feed/Icons/Profile_Green.png" 
                    alt="Mensajes" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="text-sm font-medium" style={{ color: '#73FFA2' }}>
                    Mensajes
                  </span>
                </button>
              </div>
            </div>

            {/* Sección: E-COMMERCE */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                GivE-commerce
              </h3>
              <div className="space-y-1">
                <LocalizedClientLink 
                  href="/store" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
                >
                  <Image 
                    src="/feed/Icons/Shopping_Cart_Green.png" 
                    alt="GivE-Commerce" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="text-sm font-medium" style={{ color: '#73FFA2' }}>
                    GivE-Commerce
                  </span>
                </LocalizedClientLink>

                <LocalizedClientLink 
                  href="/wishlist" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
                >
                  <Image 
                    src="/feed/Icons/Profile_Green.png" 
                    alt="Wishlist" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="text-sm font-medium" style={{ color: '#73FFA2' }}>
                    Wishlist
                  </span>
                </LocalizedClientLink>

                <LocalizedClientLink 
                  href="/cart" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group relative"
                >
                  <Image 
                    src="/feed/Icons/Shopping_Cart_Green.png" 
                    alt="Carrito" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="text-sm font-medium" style={{ color: '#73FFA2' }}>
                    Carrito
                  </span>
                  {totalCartItems > 0 && (
                    <span className="absolute right-3 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      {totalCartItems}
                    </span>
                  )}
                </LocalizedClientLink>
              </div>
            </div>

            {/* Sección: SERVICIOS */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                Servicios
              </h3>
              <div className="space-y-1">
                <LocalizedClientLink 
                  href="/stalkergift" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
                >
                  <Image 
                    src="/feed/Icons/StalkerGift_Green.png" 
                    alt="StalkerGift" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="text-sm font-medium" style={{ color: '#73FFA2' }}>
                    StalkerGift
                  </span>
                </LocalizedClientLink>

                <LocalizedClientLink 
                  href="/multipay" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
                >
                  <Image 
                    src="/feed/Icons/MultiPay_Green.png" 
                    alt="MultiPay" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="text-sm font-medium" style={{ color: '#73FFA2' }}>
                    MultiPay
                  </span>
                </LocalizedClientLink>

                <LocalizedClientLink 
                  href="/explore" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
                >
                  <Image 
                    src="/feed/Icons/Explore_Green.png" 
                    alt="Explore" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="text-sm font-medium" style={{ color: '#73FFA2' }}>
                    Explore
                  </span>
                </LocalizedClientLink>
              </div>
            </div>

            {/* Sección: PERFIL */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                Perfil
              </h3>
              <div className="space-y-1">
                <LocalizedClientLink 
                  href="/profile" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
                >
                  <Image 
                    src="/feed/Icons/Profile_Green.png" 
                    alt="Perfil" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="text-sm font-medium" style={{ color: '#73FFA2' }}>
                    Mi Perfil
                  </span>
                </LocalizedClientLink>

                <LocalizedClientLink 
                  href="/friends" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
                >
                  <Image 
                    src="/feed/Icons/Profile_Green.png" 
                    alt="Amigos" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                  />
                  <span className="text-sm font-medium" style={{ color: '#73FFA2' }}>
                    Amigos
                  </span>
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Modales */}
      {activeModal === 'newPost' && (
        <Modal isOpen={true} close={handleCloseModal} size="large" className="p-0">
          <Modal.Title className="bg-[#1e1e1e] text-white p-4 border-b border-[#73FFA2]">
            <h2 className="text-lg font-semibold text-[#66DEDB]">Nuevo Post</h2>
          </Modal.Title>
          <Modal.Body className="bg-[#1e1e1e] text-white p-0">
            <NewPostPanel onClose={handleCloseModal} />
          </Modal.Body>
        </Modal>
      )}


      {activeModal === 'messages' && (
        <Modal isOpen={true} close={handleCloseModal} size="large" className="p-0">
          <Modal.Title className="bg-[#1e1e1e] text-white p-4 border-b border-[#73FFA2]">
            <h2 className="text-lg font-semibold text-[#66DEDB]">Mensajes</h2>
          </Modal.Title>
          <Modal.Body className="bg-[#1e1e1e] text-white p-6">
            <div className="text-center py-8">
              <p className="text-gray-400">Funcionalidad de mensajes en desarrollo...</p>
            </div>
          </Modal.Body>
        </Modal>
      )}


      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  )
}

export default function NavNew() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NavContentNew />
    </Suspense>
  )
}

