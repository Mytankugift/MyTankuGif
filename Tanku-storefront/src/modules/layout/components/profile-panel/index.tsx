"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { XMark, Heart, Pencil } from "@medusajs/icons"
import { getPosters, PosterData } from '../actions/get-posters'
import { retrieveCustomer } from "@lib/data/customer"
import { listRegions } from "@lib/data/regions"
import { getListWishList } from "@modules/home/components/actions/get-list-wish-list"
import { deleteProductToWishList } from "@modules/home/components/actions/delete-product-to-wish_list"
import { deleteWishList } from "@modules/account/actionts/delete-wish-list"
import { updateBanner } from "@modules/personal-info/actions/update-banner"
import { usePersonalInfo } from "@lib/context/personal-info-context"
import Link from "next/link"

// Profile editing components
import ProfileName from "@modules/account/components/profile-name"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfilePhone from "@modules/account/components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"

interface ProfilePanelProps {
  onClose: () => void
  onPostersUpdate?: () => void
}

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
  [key: string]: any
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ onClose, onPostersUpdate }) => {
  const [posters, setPosters] = useState<PosterData[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [postersLoading, setPostersLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('PUBLICACIONES')
  const [regions, setRegions] = useState<any[]>([])
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [customerLoading, setCustomerLoading] = useState(true)
  const [wishLists, setWishLists] = useState<WishList[]>([])
  const [wishListsLoading, setWishListsLoading] = useState(false)
  const [expandedWishLists, setExpandedWishLists] = useState<Record<string, boolean>>({})
  const [selectedWishList, setSelectedWishList] = useState<string | null>(null)
  const [bannerUploading, setBannerUploading] = useState(false)
  
  // Use personal info context for banner URL
  const { personalInfo, updateLocalPersonalInfo, refreshPersonalInfo } = usePersonalInfo()
  const bannerUrl = personalInfo?.banner_profile_url || null
  
  // Social media editing states
  const [editingSocialMedia, setEditingSocialMedia] = useState<string | null>(null)
  const [socialMediaValues, setSocialMediaValues] = useState({
    facebook: '',
    instagram: '',
    youtube: '',
    tiktok: ''
  })
  const [socialMediaSaving, setSocialMediaSaving] = useState(false)

  // Cargar datos del customer y regiones al montar el componente
  useEffect(() => {
    const loadData = async () => {
      setCustomerLoading(true)
      try {
        const [customerData, regionsData] = await Promise.all([
          retrieveCustomer(),
          listRegions()
        ])
        setCustomer(customerData)
        setRegions(regionsData || [])
        
        // Banner URL is now handled by personal info context
      } catch (error) {
        console.error('Error loading data:', error)
        setCustomer(null)
        setRegions([])
      } finally {
        setCustomerLoading(false)
      }
    }
    loadData()
  }, [])

  // Cargar posters y wishlists cuando el customer esté disponible
  useEffect(() => {
    if (customer?.id) {
      loadPosters()
      fetchWishLists()
    }
  }, [customer])

  const loadPosters = async () => {
    if (!customer?.id) return
    
    setPostersLoading(true)
    try {
      const response = await getPosters(customer.id)
      if (response.success) {
        setPosters(response.posters)
        console.log('Posters loaded:', response.posters.length)
      } else {
        console.error('Error loading posters:', response.error)
      }
    } catch (error) {
      console.error('Error loading posters:', error)
    } finally {
      setPostersLoading(false)
    }
  }

  // Función para obtener las listas de deseos y sus productos
  const fetchWishLists = async () => {
    if (!customer?.id) return
    
    setWishListsLoading(true)
    try {
      const lists = await getListWishList(customer.id)
      console.log("Listas de deseos obtenidas:", lists)
      setWishLists(lists)
      
      // Inicializar el estado de expansión para cada lista
      const initialExpansionState: Record<string, boolean> = {}
      lists.forEach((list: WishList) => {
        initialExpansionState[list.id] = false
      })
      setExpandedWishLists(initialExpansionState)
    } catch (err) {
      console.error("Error al obtener las listas de deseos:", err)
    } finally {
      setWishListsLoading(false)
    }
  }

  // Función para alternar la expansión de una wishlist
  const toggleWishListExpansion = (listId: string) => {
    // Si se hace clic en la misma wishlist que ya está seleccionada, cerrar la vista
    if (selectedWishList === listId) {
      setSelectedWishList(null)
      setExpandedWishLists(prev => ({
        ...prev,
        [listId]: false
      }))
    } else {
      // Si se hace clic en una wishlist diferente, cambiar a esa wishlist
      setSelectedWishList(listId)
      setExpandedWishLists(prev => {
        // Cerrar todas las otras wishlists y abrir la seleccionada
        const newState: Record<string, boolean> = {}
        Object.keys(prev).forEach(key => {
          newState[key] = key === listId
        })
        return newState
      })
    }
  }

  // Función para eliminar un producto de una lista de deseos
  const removeProductFromList = async (wishListId: string, productId: string) => {
    try {
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

  // Función para eliminar una wishlist completa
  const handleDeleteWishList = async (wishListId: string) => {
    try {
      await deleteWishList({ wishListId })
      console.log(`Lista de deseos ${wishListId} eliminada`)
      
      // Actualizar el estado local
      setWishLists(prevLists => prevLists.filter(list => list.id !== wishListId))
      setExpandedWishLists(prev => {
        const newState = { ...prev }
        delete newState[wishListId]
        return newState
      })
      
      if (selectedWishList === wishListId) {
        setSelectedWishList(null)
      }
    } catch (error) {
      console.error("Error al eliminar la lista de deseos:", error)
    }
  }

  // Función para obtener la imagen de la wishlist basada en el índice
  const getWishListImage = (index: number) => {
    const images = [
      '/wishlist/wishlistImage1.png',
      '/wishlist/wishlistImage1.svg',
      '/wishlist/wishlistImage2.svg'
    ]
    return images[index % images.length]
  }

  // Función para manejar la actualización del banner
  const handleBannerUpdate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !customer?.id) return

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      alert('Por favor selecciona una imagen válida (JPG, PNG, GIF)')
      return
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB')
      return
    }

    setBannerUploading(true)
    try {
      const result = await updateBanner({
        customer_id: customer.id,
        banner: file
      })

      if (result.success && result.data?.banner_url) {
        // Update local context immediately for instant UI feedback
        updateLocalPersonalInfo({ banner_profile_url: result.data.banner_url })
        console.log('Banner actualizado exitosamente:', result.data.banner_url)
        
        // Refresh personal info from server to sync all data
        await refreshPersonalInfo()
        
        // Trigger any additional updates if needed
        if (onPostersUpdate) {
          onPostersUpdate()
        }
      } else {
        console.error('Error al actualizar banner:', result.error)
        alert(result.error || 'Error al actualizar el banner')
      }
    } catch (error) {
      console.error('Error updating banner:', error)
      alert('Error al actualizar el banner')
    } finally {
      setBannerUploading(false)
    }
  }

  // Get banner URL with fallback
  const getBannerUrl = () => {
    return bannerUrl || null
  }

  // Initialize social media values from personal info
  useEffect(() => {
    if (personalInfo?.social_url) {
      setSocialMediaValues({
        facebook: personalInfo.social_url.facebook || '',
        instagram: personalInfo.social_url.instagram || '',
        youtube: personalInfo.social_url.youtube || '',
        tiktok: personalInfo.social_url.tiktok || ''
      })
    }
  }, [personalInfo])

  // Handle social media field editing
  const handleSocialMediaEdit = (platform: string) => {
    setEditingSocialMedia(platform)
  }

  // Handle social media value change
  const handleSocialMediaChange = (platform: string, value: string) => {
    setSocialMediaValues(prev => ({
      ...prev,
      [platform]: value
    }))
  }

  // Save social media changes
  const handleSocialMediaSave = async (platform: string) => {
    if (!customer?.id) return

    setSocialMediaSaving(true)
    try {
      // Update the social_url object with new values
      const updatedSocialUrl = {
        ...personalInfo?.social_url,
        [platform]: socialMediaValues[platform as keyof typeof socialMediaValues]
      }

      // Update local context immediately
      updateLocalPersonalInfo({ social_url: updatedSocialUrl })
      
      // Here you would typically call an API to save to the backend
      // For now, we'll just update the local context
      console.log(`Saving ${platform}:`, socialMediaValues[platform as keyof typeof socialMediaValues])
      
      setEditingSocialMedia(null)
    } catch (error) {
      console.error('Error saving social media:', error)
      alert('Error al guardar la red social')
    } finally {
      setSocialMediaSaving(false)
    }
  }

  // Cancel social media editing
  const handleSocialMediaCancel = (platform: string) => {
    // Reset to original value
    if (personalInfo?.social_url) {
      setSocialMediaValues(prev => ({
        ...prev,
        [platform]: personalInfo.social_url[platform] || ''
      }))
    }
    setEditingSocialMedia(null)
  }

  // Get social media display value
  const getSocialMediaValue = (platform: string) => {
    const value = socialMediaValues[platform as keyof typeof socialMediaValues]
    return value || '@usuario'
  }
  return (
    <div className="h-full flex flex-col relative">
      {/* Fixed Close Arrow Button */}
      <button
        onClick={onClose}
        className="fixed right-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center "
      >
        <Image
          src="/Flecha.png"
          alt="Cerrar"
          width={24}
          height={24}
          className="object-contain"
        />
      </button>

      {/* Contenido del perfil */}
      <div className="flex-1 p-6 overflow-y-auto flex justify-center">
        <div className="w-full max-w-6xl space-y-6">
          {/* Sección principal - Dos columnas */}
          <div className="flex gap-6">
            {/* Columna principal - 75% */}
            <div className="flex-1 w-3/4">
              {/* Banner */}
              <div className="w-full h-48 bg-gradient-to-r from-[#1A485C] to-[#73FFA2] rounded-lg mb-4 overflow-hidden relative group">
                {bannerUrl ? (
                  <Image
                    src={bannerUrl}
                    alt="Banner de perfil"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white text-2xl font-bold opacity-50">Banner Profile</span>
                  </div>
                )}
                
                {/* Banner Upload Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <label className="cursor-pointer bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                      {bannerUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {bannerUrl ? 'Cambiar Banner' : 'Subir Banner'}
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpdate}
                        className="hidden"
                        disabled={bannerUploading}
                      />
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Información del usuario */}
              {!isEditingProfile ? (
                <div className="space-y-2">
                  {customerLoading ? (
                    // Skeleton para información del usuario
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-9 bg-gray-700 rounded-lg animate-pulse" style={{width: '280px'}}></div>
                        <div className="w-9 h-9 bg-gray-700 rounded-full animate-pulse"></div>
                      </div>
                      <div className="h-6 bg-gray-700 rounded-lg animate-pulse" style={{width: '150px'}}></div>
                      <div className="h-4 bg-gray-700 rounded-lg animate-pulse" style={{width: '220px'}}></div>
                      <div className="h-4 bg-gray-700 rounded-lg animate-pulse" style={{width: '180px'}}></div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <h1 className="text-3xl font-bold text-[#73FFA2]">
                        {customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email : 'Usuario'}
                      </h1>
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                        title="Editar perfil"
                      >
                        <svg className="w-5 h-5 text-[#73FFA2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {!customerLoading && (
                    <>
                      <p className="text-white text-lg">@{customer?.email?.split('@')[0] || 'usuario'}</p>
                      <p className="text-gray-300 text-sm">
                        {customer?.first_name ? 'Miembro de la comunidad TANKU' : 'Colombiano, bloguero, fotógrafo.'}
                      </p>
                      <p className="text-gray-400 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Bogotá, Colombia
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#73FFA2] mb-1">Editar Perfil</h2>
                      <p className="text-white text-sm">
                        Actualiza tu información personal
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                      title="Cerrar edición"
                    >
                      <XMark className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  
                  {customer && (
                    <div className="space-y-4">
                      {/* Profile Name */}
                      <div className="bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors">
                        <ProfileName customer={customer} />
                      </div>
                      
                      {/* Profile Email */}
                      <div className="bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors">
                        <ProfileEmail customer={customer} />
                      </div>
                      
                      {/* Profile Phone */}
                      <div className="bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors">
                        <ProfilePhone customer={customer} />
                      </div>
                      
                      {/* Profile Billing Address */}
                      {regions.length > 0 && (
                        <div className="bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors">
                          <ProfileBillingAddress customer={customer} regions={regions} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Columna lateral - 25% */}
            <div className="w-1/4">
              {/* Iconos de acción */}
              <div className="flex  gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors cursor-pointer">
                  <Link href="/friends">
                  <Image
                    src="/feed/Icons/Search_Green.png"
                    alt="Buscar"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                  </Link>
                </div>
              </div>

              {/* Estadísticas */}
              {customerLoading ? (
                <div className="text-center space-y-2">
                  <div className="flex justify-center space-x-6">
                    <div className="space-y-1">
                      <div className="h-8 w-16 bg-gray-700 rounded-lg animate-pulse mx-auto"></div>
                      <div className="h-4 w-12 bg-gray-700 rounded-lg animate-pulse mx-auto"></div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-8 w-16 bg-gray-700 rounded-lg animate-pulse mx-auto"></div>
                      <div className="h-4 w-20 bg-gray-700 rounded-lg animate-pulse mx-auto"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="flex justify-center space-x-6">
                    <div>
                      <p className="text-2xl font-bold text-[#73FFA2]">3</p>
                      <p className="text-gray-400 text-sm">Amigos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#73FFA2]">{posters.length ?? 0}</p>
                      <p className="text-gray-400 text-sm">Publicaciones</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Redes sociales */}
              <div className="space-y-2">
                {/* Facebook */}
                <div className="flex items-center gap-2 group">
                  <Image
                    src="/icon_social/Facebook_Green.png"
                    alt="Facebook"
                    width={14}
                    height={14}
                    className="ml-[9px] object-contain"
                  />
                  {editingSocialMedia === 'facebook' ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={socialMediaValues.facebook}
                        onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                        className="bg-gray-800 text-white text-sm px-2 py-1 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB] flex-1"
                        placeholder="@usuario"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSocialMediaSave('facebook')}
                        disabled={socialMediaSaving}
                        className="text-[#73FFA2] hover:text-[#66DEDB] text-xs px-1"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleSocialMediaCancel('facebook')}
                        className="text-red-400 hover:text-red-300 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-gray-300 text-sm">
                        {getSocialMediaValue('facebook')}
                      </span>
                      <button
                        onClick={() => handleSocialMediaEdit('facebook')}
                        className="text-gray-400 hover:text-[#73FFA2] transition-colors p-1"
                        title="Editar Facebook"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Instagram */}
                <div className="flex items-center gap-2 group">
                  <Image
                    src="/icon_social/Instagram_Green.png"
                    alt="Instagram"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                  {editingSocialMedia === 'instagram' ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={socialMediaValues.instagram}
                        onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                        className="bg-gray-800 text-white text-sm px-2 py-1 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB] flex-1"
                        placeholder="@usuario"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSocialMediaSave('instagram')}
                        disabled={socialMediaSaving}
                        className="text-[#73FFA2] hover:text-[#66DEDB] text-xs px-1"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleSocialMediaCancel('instagram')}
                        className="text-red-400 hover:text-red-300 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-gray-300 text-sm">
                        {getSocialMediaValue('instagram')}
                      </span>
                      <button
                        onClick={() => handleSocialMediaEdit('instagram')}
                        className="text-gray-400 hover:text-[#73FFA2] transition-colors p-1"
                        title="Editar Instagram"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* YouTube */}
                <div className="flex items-center gap-2 group">
                  <Image
                    src="/icon_social/Youtube_Green.png"
                    alt="Youtube"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                  {editingSocialMedia === 'youtube' ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={socialMediaValues.youtube}
                        onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                        className="bg-gray-800 text-white text-sm px-2 py-1 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB] flex-1"
                        placeholder="@usuario"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSocialMediaSave('youtube')}
                        disabled={socialMediaSaving}
                        className="text-[#73FFA2] hover:text-[#66DEDB] text-xs px-1"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleSocialMediaCancel('youtube')}
                        className="text-red-400 hover:text-red-300 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-gray-300 text-sm">
                        {getSocialMediaValue('youtube')}
                      </span>
                      <button
                        onClick={() => handleSocialMediaEdit('youtube')}
                        className="text-gray-400 hover:text-[#73FFA2] transition-colors p-1"
                        title="Editar YouTube"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* TikTok */}
                <div className="flex items-center gap-2 group">
                  <Image
                    src="/icon_social/Tiktok_Green.png"
                    alt="Tiktok"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                  {editingSocialMedia === 'tiktok' ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={socialMediaValues.tiktok}
                        onChange={(e) => handleSocialMediaChange('tiktok', e.target.value)}
                        className="bg-gray-800 text-white text-sm px-2 py-1 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB] flex-1"
                        placeholder="@usuario"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSocialMediaSave('tiktok')}
                        disabled={socialMediaSaving}
                        className="text-[#73FFA2] hover:text-[#66DEDB] text-xs px-1"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleSocialMediaCancel('tiktok')}
                        className="text-red-400 hover:text-red-300 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-gray-300 text-sm">
                        {getSocialMediaValue('tiktok')}
                      </span>
                      <button
                        onClick={() => handleSocialMediaEdit('tiktok')}
                        className="text-gray-400 hover:text-[#73FFA2] transition-colors p-1"
                        title="Editar TikTok"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Wishlist Stories */}
          <div className="space-y-4">
            <h3 className="text-white text-lg font-medium">Wishlist Stories</h3>
            {wishListsLoading || customerLoading ? (
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gray-700 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {wishLists.map((wishList, index) => (
                  <div key={wishList.id} className="flex-shrink-0">
                    <div 
                      className="w-16 h-16 rounded-full bg-gradient-to-r from-[#1A485C] to-[#73FFA2] p-0.5 cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => toggleWishListExpansion(wishList.id)}
                    >
                      <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden">
                        <Image
                          src={getWishListImage(index)}
                          alt={wishList.title}
                          width={60}
                          height={60}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-1 truncate w-16">{wishList.title}</p>
                  </div>
                ))}
                {wishLists.length === 0 && (
                  <div className="text-center py-4 w-full">
                    <p className="text-gray-400 text-sm">No tienes listas de deseos aún</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expanded Wishlist Content */}
          {selectedWishList && (
            <div className="space-y-4 border-t border-gray-700 pt-4">
              {wishLists.filter(list => list.id === selectedWishList).map(list => (
                <div key={list.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white text-lg font-medium">{list.title}</h4>
                      <p className="text-gray-400 text-sm">
                        {list.products?.length || 0} productos • Creada el {new Date(list.created_at || "").toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDeleteWishList(list.id)}
                      className="text-red-400 hover:text-red-300 text-sm px-3 py-1 border border-red-400 rounded-lg hover:bg-red-400/10 transition-colors"
                    >
                      Eliminar lista
                    </button>
                  </div>

                  {list.products && list.products.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                      {list.products.map((product) => (
                        <div key={product.id} className="border border-gray-700 rounded-lg overflow-hidden flex bg-gray-800/50">
                          <div className="w-20 h-20 relative flex-shrink-0">
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
                                <h5 className="text-white font-medium text-sm">{product.title}</h5>
                              </Link>
                              <p className="text-gray-400 text-xs line-clamp-2">
                                {product.subtitle || product.description?.substring(0, 80)}
                              </p>
                            </div>
                            <button 
                              onClick={() => removeProductFromList(list.id, product.id)}
                              className="self-end text-red-400 hover:text-red-300 text-xs px-2 py-1 border border-red-400 rounded hover:bg-red-400/10 transition-colors mt-2"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-800/30 rounded-lg">
                      <p className="text-gray-400 text-sm mb-3">No hay productos en esta lista</p>
                      <Link href="/">
                        <button className="text-[#73FFA2] hover:text-[#66DEDB] text-sm px-4 py-2 border border-[#73FFA2] rounded-lg hover:bg-[#73FFA2]/10 transition-colors">
                          Explorar productos
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Navegación de tabs - Solo mostrar si no está editando perfil */}
          {!isEditingProfile && (
            <div className="flex justify-center space-x-8 border-b border-gray-600 pb-2 mb-6">
              {['PUBLICACIONES', 'MY TANKU', 'MIS COMPRAS'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Contenido de los tabs - Solo mostrar si no está editando perfil */}
          {!isEditingProfile && (
            <>
              {activeTab === 'PUBLICACIONES' && (
                <div className="space-y-4">
                  {postersLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
                    </div>
                  ) : posters.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {posters.map((poster) => (
                        <div key={poster.id} className="space-y-2">
                          {/* Poster Image */}
                          <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden relative group cursor-pointer">
                            {poster.image_url ? (
                              <Image
                                src={poster.image_url}
                                alt={poster.title || 'Poster'}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            {/* Video indicator */}
                            {poster.video_url && (
                              <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-full p-1">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            {/* Overlay with title */}
                            {poster.title && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                                <p className="text-white text-sm font-medium truncate">{poster.title}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Poster Actions */}
                          <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                              <Heart className="w-5 h-5 text-gray-400 hover:text-red-500 cursor-pointer transition-colors" />
                              <span className="text-gray-400 text-sm">{poster.likes_count} likes</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">{poster.comments_count} comentarios</span>
                              <button className="text-gray-400 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-white text-lg font-medium mb-2">No hay publicaciones aún</h3>
                      <p className="text-gray-400 text-sm">Cuando crees tu primera publicación, aparecerá aquí.</p>
                    </div>
                  )}
                </div>
              )}
          
              {activeTab === 'MY TANKU' && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-medium mb-2">My TANKU</h3>
                  <p className="text-gray-400 text-sm">Próximamente disponible</p>
                </div>
              )}
              
              {activeTab === 'MIS COMPRAS' && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-medium mb-2">Mis Compras</h3>
                  <p className="text-gray-400 text-sm">Próximamente disponible</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePanel
