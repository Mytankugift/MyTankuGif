"use client"

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Heart, PencilSquare, Trash, XMark, Plus, EllipsisHorizontal, Camera, Check, MediaPlay, Pencil, Spinner, ArrowRightOnRectangle } from "@medusajs/icons"
import { Tooltip, TooltipProvider } from "@medusajs/ui"
import { getPosters, PosterData } from '../actions/get-posters'
import { retrieveCustomer, signout } from "@lib/data/customer"
import { togglePosterLike, getPosterReactions } from "@modules/home/components/actions/poster-reactions"
import { getPosterComments, addPosterComment, editPosterComment, deletePosterComment, PosterComment } from "@modules/home/components/actions/poster-comments"
import { listRegions } from "@lib/data/regions"
import { getListWishList } from "@modules/home/components/actions/get-list-wish-list"
import { deleteProductToWishList } from "@modules/home/components/actions/delete-product-to-wish_list"
import { deleteWishList } from "@modules/account/actionts/delete-wish-list"
import { updateBanner } from "@modules/personal-info/actions/update-banner"
import { updateAvatar } from "@modules/personal-info/actions/update-avatar"
import { updateSocialNetworks } from "../actions/update-social-networks"
import { usePersonalInfo } from "@lib/context/personal-info-context"
import Link from "next/link"
import FriendGroupsTab from "./FriendGroupsTab"
import EventsCalendarTab from "./EventsCalendarTab"
import OrderCustomerTab from "./OrderCustomerTab"

// Profile editing components
import ProfileName from "@modules/account/components/profile-name"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfilePhone from "@modules/account/components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"

// ... rest of the code ...

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
  const { personalInfo, updateLocalPersonalInfo, refreshPersonalInfo, clearPersonalInfo } = usePersonalInfo()
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
  
  // Public alias editing states
  const [editingAlias, setEditingAlias] = useState(false)
  const [aliasValue, setAliasValue] = useState('')
  const [aliasSaving, setAliasSaving] = useState(false)
  const [aliasError, setAliasError] = useState('')

  // Avatar editing states
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados para el modal
  const [selectedPoster, setSelectedPoster] = useState<PosterData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Estados para comentarios
  const [comments, setComments] = useState<PosterComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isCommentLoading, setIsCommentLoading] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({})

  // Estados para likes
  const [likesCount, setLikesCount] = useState(0)
  const [commentsCount, setCommentsCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isLikeLoading, setIsLikeLoading] = useState(false)

  // Funciones del modal
  const openModal = (poster: PosterData) => {
    setSelectedPoster(poster)
    setIsModalOpen(true)
    setLikesCount(poster.likes_count || 0)
    setCommentsCount(poster.comments_count || 0)
    loadComments(poster.id)
    loadReactions(poster.id)
  }

  const closeModal = () => {
    setSelectedPoster(null)
    setIsModalOpen(false)
    setComments([])
    setNewComment('')
    setEditingCommentId(null)
    setEditingCommentContent('')
    setReplyingToId(null)
    setReplyContent('')
    setShowReplies({})
  }

  // Funciones para comentarios
  const loadComments = async (posterId: string) => {
    try {
      const commentsData = await getPosterComments(posterId)
      setComments(commentsData.comments)
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const loadReactions = async (posterId: string) => {
    try {
      const reactions = await getPosterReactions(posterId, customer?.id || '')
      setIsLiked(!!reactions.user_reaction)
      setLikesCount(reactions.total_count)
    } catch (error) {
      console.error('Error loading reactions:', error)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPoster || !customer?.id) return

    setIsCommentLoading(true)
    try {
      const result = await addPosterComment(selectedPoster.id, customer.id, newComment.trim())
      
      setComments(prev => [...prev, result.comment])
      setCommentsCount(result.comments_count)
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setIsCommentLoading(false)
    }
  }

  const handleStartEdit = (comment: PosterComment) => {
    setEditingCommentId(comment.id)
    setEditingCommentContent(comment.content)
  }

  const handleSaveEdit = async () => {
    if (!editingCommentContent.trim() || !editingCommentId || !selectedPoster) return

    setIsCommentLoading(true)
    try {
      await editPosterComment(editingCommentId, editingCommentContent.trim())
      
      setEditingCommentId(null)
      setEditingCommentContent('')
      await loadComments(selectedPoster.id)
    } catch (error) {
      console.error('Error editing comment:', error)
    } finally {
      setIsCommentLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditingCommentContent('')
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPoster || !window.confirm('¿Estás seguro de que quieres eliminar este comentario?')) return

    try {
      await deletePosterComment(commentId)
      setCommentsCount(prev => Math.max(0, prev - 1))
      await loadComments(selectedPoster.id)
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleStartReply = (commentId: string) => {
    setReplyingToId(commentId)
    setReplyContent('')
  }

  const handleAddReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !selectedPoster || !customer?.id) return

    setIsCommentLoading(true)
    try {
      const result = await addPosterComment(selectedPoster.id, customer.id, replyContent.trim(), parentCommentId)
      
      const updatedComments = await getPosterComments(selectedPoster.id)
      setComments(updatedComments.comments)
      setCommentsCount(updatedComments.total_count)
      
      setReplyingToId(null)
      setReplyContent('')
      setShowReplies(prev => ({ ...prev, [parentCommentId]: true }))
    } catch (error) {
      console.error('Error adding reply:', error)
    } finally {
      setIsCommentLoading(false)
    }
  }

  const handleCancelReply = () => {
    setReplyingToId(null)
    setReplyContent('')
  }

  const toggleReplies = (commentId: string) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
  }

  const handleLikeToggle = async () => {
    if (!selectedPoster || !customer?.id || isLikeLoading) return

    setIsLikeLoading(true)
    try {
      await togglePosterLike(selectedPoster.id, customer.id)
      
      setIsLiked(prev => !prev)
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1)
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setIsLikeLoading(false)
    }
  }

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
      // Initialize alias value
      setAliasValue(personalInfo.social_url.public_alias || '')
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

      // Call the backend API to save the changes
      const result = await updateSocialNetworks({
        customer_id: customer.id,
        social_networks: {
          facebook: platform === 'facebook' ? socialMediaValues.facebook : personalInfo?.social_url?.facebook || '',
          instagram: platform === 'instagram' ? socialMediaValues.instagram : personalInfo?.social_url?.instagram || '',
          youtube: platform === 'youtube' ? socialMediaValues.youtube : personalInfo?.social_url?.youtube || '',
          tiktok: platform === 'tiktok' ? socialMediaValues.tiktok : personalInfo?.social_url?.tiktok || ''
        }
      })

      if (result.success) {
        // Update local context only if backend save was successful
        updateLocalPersonalInfo({ social_url: updatedSocialUrl })
       
      } else {
        throw new Error(result.error || 'Error al guardar en el servidor')
      }
      
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

  // Handle alias editing
  const handleAliasEdit = () => {
    setEditingAlias(true)
    setAliasError('')
  }

  // Handle alias value change
  const handleAliasChange = (value: string) => {
    // Remove @ symbol and spaces, convert to lowercase
    const cleanValue = value.replace(/[@\s]/g, '').toLowerCase()
    setAliasValue(cleanValue)
    setAliasError('')
  }

  // Save alias changes
  const handleAliasSave = async () => {
    if (!customer?.id) return

    if (!aliasValue.trim()) {
      setAliasError('El alias no puede estar vacío')
      return
    }

    if (aliasValue.length < 3) {
      setAliasError('El alias debe tener al menos 3 caracteres')
      return
    }

    if (!/^[a-z0-9_]+$/.test(aliasValue)) {
      setAliasError('El alias solo puede contener letras, números y guiones bajos')
      return
    }

    setAliasSaving(true)
    try {
      // Call the backend API to save the alias
      const result = await updateSocialNetworks({
        customer_id: customer.id,
        social_networks: {
          facebook: personalInfo?.social_url?.facebook || '',
          instagram: personalInfo?.social_url?.instagram || '',
          youtube: personalInfo?.social_url?.youtube || '',
          tiktok: personalInfo?.social_url?.tiktok || '',
          public_alias: aliasValue
        }
      })

      if (result.success) {
        // Update local context
        const updatedSocialUrl = {
          ...personalInfo?.social_url,
          public_alias: aliasValue
        }
        updateLocalPersonalInfo({ social_url: updatedSocialUrl })
     
        setEditingAlias(false)
      } else {
        if (result.error?.includes('alias ya existe') || result.error?.includes('already exists')) {
          setAliasError('Este alias ya está en uso por otro usuario')
        } else {
          setAliasError(result.error || 'Error al guardar el alias')
        }
      }
    } catch (error) {
      console.error('Error saving alias:', error)
      setAliasError('Error al guardar el alias')
    } finally {
      setAliasSaving(false)
    }
  }

  // Cancel alias editing
  const handleAliasCancel = () => {
    setAliasValue(personalInfo?.social_url?.public_alias || '')
    setEditingAlias(false)
    setAliasError('')
  }

  // Get current alias display value
  const getCurrentAlias = () => {
    return personalInfo?.social_url?.public_alias || customer?.email?.split('@')[0] || 'usuario'
  }

  // Get social media display value
  const getSocialMediaValue = (platform: string) => {
    const value = socialMediaValues[platform as keyof typeof socialMediaValues]
    return value || '@usuario'
  }

  // Avatar editing functions
  const handleEditAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB')
      return
    }

    setIsUpdatingAvatar(true)

    try {
      // Verificar que tenemos un customer_id
      if (!customer?.id) {
        alert('Error: No se pudo identificar al usuario')
        return
      }
      
      const result = await updateAvatar({
        customer_id: customer.id,
        avatar: file
      })

      if (result.success && result.data?.avatar_url) {
        // Refresh context to get updated avatar
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
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  // Handle banner click to trigger file input
  const handleBannerClick = () => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.onchange = (e) => {
      // Create a synthetic event from the native event
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const syntheticEvent = {
          target: { files: files }
        } as unknown as React.ChangeEvent<HTMLInputElement>
        handleBannerUpdate(syntheticEvent)
      }
    }
    fileInput.click()
  }
  return (
    <div className="h-full flex flex-col relative">
      {/* Logout Button */}
      <div className="absolute top-2 right-5 z-10">
        <TooltipProvider >
          <Tooltip content="Cerrar sesión" className="z-90">
            <button 
              onClick={async () => {
                await signout("co").then(() => {
                  clearPersonalInfo()
                })
                
              }} 
              className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <ArrowRightOnRectangle className="w-5 h-5 text-[#73FFA2]" />
            </button>
          </Tooltip>
        </TooltipProvider>
      </div>
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
      <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto flex justify-center">
        <div className="w-full max-w-6xl space-y-4 sm:space-y-5 md:space-y-6">
          {/* Sección principal - Dos columnas */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Columna principal - 75% */}
            <div className="flex-1 w-full md:w-3/4">
              {/* Banner */}
              <div className="w-full h-24 sm:h-28 md:h-48 bg-gradient-to-r from-[#1A485C] to-[#73FFA2] rounded-lg mb-3 sm:mb-4 overflow-hidden relative group">
                {bannerUrl ? (
                  <Image
                    src={bannerUrl}
                    alt="Banner de perfil"
                    layout="fill"
                    objectFit="cover"
                  />
                ) : null}

                {/* Botón para cambiar el banner */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <label className="cursor-pointer">
                    <div className="bg-white/80 hover:bg-white text-black text-sm sm:text-base font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-full transition-colors flex items-center gap-2">
                      {bannerUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin"></div>
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
                    </div>
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
              
              {/* Información del usuario */}
              {!isEditingProfile ? (
                <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                  {customerLoading ? (
                    // Skeleton para información del usuario
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-7 sm:h-8 md:h-9 bg-gray-700 rounded-lg animate-pulse w-full md:w-[280px]"></div>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-gray-700 rounded-full animate-pulse"></div>
                      </div>
                      <div className="h-5 sm:h-6 bg-gray-700 rounded-lg animate-pulse" style={{width: '150px'}}></div>
                      <div className="h-3 sm:h-4 bg-gray-700 rounded-lg animate-pulse" style={{width: '220px'}}></div>
                      <div className="h-3 sm:h-4 bg-gray-700 rounded-lg animate-pulse" style={{width: '180px'}}></div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Avatar edit button - only visible on mobile */}
                        <div className="relative group flex-shrink-0 sm:hidden">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center ${
                    isUpdatingAvatar ? "opacity-50" : ""
                  }`}>
                    <Image
                      src={personalInfo?.avatar_url || "/default-avatar.png"}
                      alt="Avatar del usuario"
                      width={96}
                      height={96}
                      className="object-cover rounded-full w-full h-full"
                    />
                  </div>
                  {/* Avatar edit button - visible on hover for desktop, always visible on mobile */}
                  <button
                    onClick={handleEditAvatarClick}
                    className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-[#73FFA2] rounded-full flex items-center justify-center shadow-lg hover:bg-[#66e891] transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100"
                    disabled={isUpdatingAvatar}
                    title="Cambiar avatar"
                  >
                    <PencilSquare className="w-3 h-3 sm:w-4 sm:h-4 text-gray-800" />
                  </button>
                </div>
                        
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#73FFA2] break-words">
                          {customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email : 'Usuario'}
                        </h1>
                      </div>
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="p-1.5 sm:p-2 rounded-full hover:bg-gray-700 transition-colors"
                        title="Editar perfil"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#73FFA2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {!customerLoading && (
                    <>
                      {editingAlias ? (
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className="text-white text-base sm:text-lg">@</span>
                          <input
                            type="text"
                            value={aliasValue}
                            onChange={(e) => handleAliasChange(e.target.value)}
                            className="bg-gray-800 text-white text-sm sm:text-base md:text-lg px-1.5 sm:px-2 py-1 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB] min-w-0 flex-1"
                            placeholder="tu_alias"
                            autoFocus
                            disabled={aliasSaving}
                          />
                          <button
                            onClick={handleAliasSave}
                            disabled={aliasSaving || !aliasValue.trim()}
                            className="text-[#73FFA2] hover:text-[#66DEDB] text-xs sm:text-sm px-1 disabled:opacity-50"
                          >
                            {aliasSaving ? '...' : '✓'}
                          </button>
                          <button
                            onClick={handleAliasCancel}
                            disabled={aliasSaving}
                            className="text-red-400 hover:text-red-300 text-xs sm:text-sm px-1 disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 sm:gap-2 group">
                          <p className="text-white text-sm sm:text-base md:text-lg break-all">@{getCurrentAlias()}</p>
                          <button
                            onClick={handleAliasEdit}
                            className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 text-gray-400 hover:text-[#73FFA2] transition-all p-0.5 sm:p-1"
                            title="Editar alias"
                          >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      )}
                      {aliasError && (
                        <p className="text-red-400 text-sm mt-1">{aliasError}</p>
                      )}
                      <p className="text-gray-300 text-xs sm:text-sm">
                        {customer?.first_name ? 'Miembro de la comunidad TANKU' : 'Colombiano, bloguero, fotógrafo.'}
                      </p>
                      <p className="text-gray-400 text-xs sm:text-sm flex items-center gap-1">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Bogotá, Colombia
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
                    <div>
                      <h2 className="text-xl sm:text-xl md:text-2xl font-bold text-[#73FFA2] mb-0.5 sm:mb-1">Editar Perfil</h2>
                      <p className="text-white text-xs sm:text-sm">
                        Actualiza tu información personal
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="p-1.5 sm:p-2 rounded-full hover:bg-gray-700 transition-colors"
                      title="Cerrar edición"
                    >
                      <XMark className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    </button>
                  </div>
                  
                  {customer && (
                    <div className="space-y-3 sm:space-y-4">
                      {/* Profile Name */}
                      <div className="bg-transparent rounded-lg p-3 sm:p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors">
                        <ProfileName customer={customer} />
                      </div>
                      
                      {/* Profile Email */}
                      <div className="bg-transparent rounded-lg p-3 sm:p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors">
                        <ProfileEmail customer={customer} />
                      </div>
                      
                      {/* Profile Phone */}
                      <div className="bg-transparent rounded-lg p-3 sm:p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors">
                        <ProfilePhone customer={customer} />
                      </div>
                      
                      {/* Profile Billing Address */}
                      {regions.length > 0 && (
                        <div className="bg-transparent rounded-lg p-3 sm:p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors">
                          <ProfileBillingAddress customer={customer} regions={regions} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Columna lateral - 25% */}
            <div className="w-full md:w-1/4 mt-3 sm:mt-4 md:mt-0">
          
             

              {/* Estadísticas */}
              {customerLoading ? (
                <div className="text-center space-y-1 sm:space-y-2">
                  <div className="flex justify-center space-x-4 sm:space-x-6">
                    <div className="space-y-1">
                      <div className="h-6 sm:h-8 w-12 sm:w-16 bg-gray-700 rounded-lg animate-pulse mx-auto"></div>
                      <div className="h-3 sm:h-4 w-10 sm:w-12 bg-gray-700 rounded-lg animate-pulse mx-auto"></div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-6 sm:h-8 w-12 sm:w-16 bg-gray-700 rounded-lg animate-pulse mx-auto"></div>
                      <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-700 rounded-lg animate-pulse mx-auto"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-1 sm:space-y-2">
                  <div className="flex justify-center space-x-4 sm:space-x-6">
                    <div>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#73FFA2]">{personalInfo?.friends_count ?? 0}</p>
                      <p className="text-gray-400 text-xs sm:text-sm">Amigos</p>
                    </div>
                    <div>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#73FFA2]">{posters.length ?? 0}</p>
                      <p className="text-gray-400 text-xs sm:text-sm">Publicaciones</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Redes sociales */}
              <div className="space-y-1.5 sm:space-y-2">
                {/* Facebook */}
                <div className="flex items-center gap-1.5 sm:gap-2 group">
                  <Image
                    src="/icon_social/Facebook_Green.png"
                    alt="Facebook"
                    width={15}
                    height={10}
                    className="object-contain sm:w-6 sm:h-6 mr-[6px]"
                  />
                  {editingSocialMedia === 'facebook' ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={socialMediaValues.facebook}
                        onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                        className="bg-gray-800 text-white text-xs sm:text-sm px-1.5 sm:px-2 py-1 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB] flex-1"
                        placeholder="URL de Facebook"
                        autoFocus
                        disabled={socialMediaSaving}
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
                      <span className="text-gray-300 text-xs sm:text-sm break-all">
                        {getSocialMediaValue('facebook')}
                      </span>
                      <button
                        onClick={() => handleSocialMediaEdit('facebook')}
                        className="text-gray-400 hover:text-[#73FFA2] transition-colors p-0.5 sm:p-1"
                        title="Editar Facebook"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Instagram */}
                <div className="flex items-center gap-1.5 sm:gap-2 group">
                  <Image
                    src="/icon_social/Instagram_Green.png"
                    alt="Instagram"
                    width={20}
                    height={20}
                    className="object-contain sm:w-6 sm:h-6"
                  />
                  {editingSocialMedia === 'instagram' ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={socialMediaValues.instagram}
                        onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                        className="bg-gray-800 text-white text-xs sm:text-sm px-1.5 sm:px-2 py-1 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB] flex-1"
                        placeholder="@usuario"
                        autoFocus
                        disabled={socialMediaSaving}
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
                      <span className="text-gray-300 text-xs sm:text-sm break-all">
                        {getSocialMediaValue('instagram')}
                      </span>
                      <button
                        onClick={() => handleSocialMediaEdit('instagram')}
                        className="text-gray-400 hover:text-[#73FFA2] transition-colors p-0.5 sm:p-1"
                        title="Editar Instagram"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* YouTube */}
                <div className="flex items-center gap-1.5 sm:gap-2 group">
                  <Image
                    src="/icon_social/Youtube_Green.png"
                    alt="Youtube"
                    width={20}
                    height={20}
                    className="object-contain sm:w-6 sm:h-6"
                  />
                  {editingSocialMedia === 'youtube' ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={socialMediaValues.youtube}
                        onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                        className="bg-gray-800 text-white text-xs sm:text-sm px-1.5 sm:px-2 py-1 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB] flex-1"
                        placeholder="@usuario"
                        autoFocus
                        disabled={socialMediaSaving}
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
                      <span className="text-gray-300 text-xs sm:text-sm break-all">
                        {getSocialMediaValue('youtube')}
                      </span>
                      <button
                        onClick={() => handleSocialMediaEdit('youtube')}
                        className="text-gray-400 hover:text-[#73FFA2] transition-colors p-0.5 sm:p-1"
                        title="Editar YouTube"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* TikTok */}
                <div className="flex items-center gap-1.5 sm:gap-2 group">
                  <Image
                    src="/icon_social/Tiktok_Green.png"
                    alt="Tiktok"
                    width={20}
                    height={20}
                    className="object-contain sm:w-6 sm:h-6"
                  />
                  {editingSocialMedia === 'tiktok' ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={socialMediaValues.tiktok}
                        onChange={(e) => handleSocialMediaChange('tiktok', e.target.value)}
                        className="bg-gray-800 text-white text-xs sm:text-sm px-1.5 sm:px-2 py-1 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB] flex-1"
                        placeholder="@usuario"
                        autoFocus
                        disabled={socialMediaSaving}
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
                      <span className="text-gray-300 text-xs sm:text-sm break-all">
                        {getSocialMediaValue('tiktok')}
                      </span>
                      <button
                        onClick={() => handleSocialMediaEdit('tiktok')}
                        className="text-gray-400 hover:text-[#73FFA2] transition-colors p-0.5 sm:p-1"
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
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <h3 className="text-white text-sm sm:text-base md:text-lg font-medium">Wishlist Stories</h3>
            {wishListsLoading || customerLoading ? (
              <div className="flex space-x-1.5 sm:space-x-2 md:space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex-shrink-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-700 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex space-x-1.5 sm:space-x-2 md:space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                {wishLists.map((wishList, index) => (
                  <div key={wishList.id} className="flex-shrink-0">
                    <div 
                      className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-r from-[#1A485C] to-[#73FFA2] p-0.5 cursor-pointer hover:scale-105 transition-transform"
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
                    <p className="text-xs text-gray-400 text-center mt-1 truncate w-12 sm:w-14 md:w-16">{wishList.title}</p>
                  </div>
                ))}
                {wishLists.length === 0 && (
                  <div className="text-center py-3 sm:py-4 w-full">
                    <p className="text-gray-400 text-xs sm:text-sm">No tienes listas de deseos aún</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expanded Wishlist Content */}
          {selectedWishList && (
            <div className="space-y-2 sm:space-y-3 md:space-y-4 border-t border-gray-700 pt-2 sm:pt-3 md:pt-4">
              {wishLists.filter(list => list.id === selectedWishList).map(list => (
                <div key={list.id} className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-base sm:text-lg font-medium">{list.title}</h3>
                    <button
                      onClick={() => setSelectedWishList(null)}
                      className="p-0.5 sm:p-1 rounded-full hover:bg-gray-700 transition-colors"
                      title="Cerrar lista"
                    >
                      <XMark className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white text-base sm:text-lg font-medium">{list.title}</h4>
                      <p className="text-gray-400 text-xs sm:text-sm">
                        {list.products?.length || 0} productos • Creada el {new Date(list.created_at || "").toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDeleteWishList(list.id)}
                      className="text-red-400 hover:text-red-300 text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 border border-red-400 rounded-lg hover:bg-red-400/10 transition-colors"
                    >
                      Eliminar lista
                    </button>
                  </div>

                  {list.products && list.products.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5 sm:gap-2 md:gap-3 max-h-60 sm:max-h-72 md:max-h-96 overflow-y-auto scrollbar-hide">
                      {list.products.map((product) => (
                        <div key={product.id} className="border border-gray-700 rounded-md md:rounded-lg overflow-hidden flex bg-gray-800/50">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 relative flex-shrink-0">
                            <Image 
                              src={product.thumbnail || "/placeholder-image.png"}
                              alt={product.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 p-1.5 sm:p-2 md:p-3 flex flex-col justify-between">
                            <div>
                              <h5 className="text-white text-sm sm:text-base font-medium line-clamp-1">{product.title}</h5>
                              <p className="text-gray-400 text-xs sm:text-sm line-clamp-1">{product.subtitle || product.description.substring(0, 50)}</p>
                            </div>
                            <div className="flex justify-between items-center">
                              <Link
                                href={`/products/${product.handle}`}
                                className="text-[#73FFA2] text-xs sm:text-sm hover:underline"
                              >
                                Ver producto
                              </Link>
                              <button
                                onClick={() => handlerRemoveProductFromWishList(list.id, product.id)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Eliminar de la lista"
                              >
                                <XMark className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 sm:py-4 md:py-8 bg-gray-800/30 rounded-lg">
                      <p className="text-gray-400 text-xs sm:text-sm mb-2 sm:mb-3">No hay productos en esta lista</p>
                      <Link href="/">
                        <button className="text-[#73FFA2] hover:text-[#66DEDB] text-xs sm:text-sm px-2 sm:px-3 md:px-4 py-1 md:py-2 border border-[#73FFA2] rounded-lg hover:bg-[#73FFA2]/10 transition-colors">
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
            <div className="flex justify-start sm:justify-center space-x-2 sm:space-x-3 md:space-x-8 border-b border-gray-600 pb-1.5 sm:pb-2 mb-3 sm:mb-4 md:mb-6 overflow-x-auto scrollbar-hide px-1">
              {['PUBLICACIONES', 'MY TANKU', 'MIS COMPRAS'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-1.5 sm:px-2 md:px-4 py-0.5 sm:py-1 md:py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
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
                <div className="space-y-3 sm:space-y-4">
                  {postersLoading ? (
                    <div className="flex justify-center py-6 sm:py-8">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#73FFA2]"></div>
                    </div>
                  ) : posters.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                      {posters.map((poster) => (
                        <div 
                          key={poster.id} 
                          className="bg-transparent border-2 border-[#73FFA2] rounded-lg sm:rounded-2xl p-2 sm:p-3 md:p-4 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
                          onClick={() => openModal(poster)}
                        >
                          {/* Poster Header */}
                          <div className="flex items-center mb-2 sm:mb-3">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full overflow-hidden bg-gray-700">
                              <Image 
                                src={personalInfo?.avatar_url || '/feed/avatar.png'}
                                alt={customer?.first_name || 'Usuario'}
                                width={32}
                                height={32}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="ml-1.5 sm:ml-2">
                              <p className="text-white font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-full">
                                {customer?.first_name} {customer?.last_name}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {new Date(poster.created_at).toLocaleDateString('es-ES', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                          
                          {/* Poster Media */}
                          <div className="w-full h-32 sm:h-40 md:h-48 relative mb-2 sm:mb-3 md:mb-4 overflow-hidden rounded-lg">
                            {(poster.image_url || poster.video_url) && (
                              <>
                                {/* Caso 1: Tiene imagen */}
                                {poster.image_url && (
                                  <div className="relative w-full h-full">
                                    <Image
                                      src={poster.image_url}
                                      alt="Imagen de publicación"
                                      fill
                                      className="object-cover"
                                      unoptimized={poster.image_url.startsWith('blob:') || poster.image_url.startsWith('data:')}
                                    />
                                  </div>
                                )}
                                
                                {/* Caso 2: Tiene video (mostrar preview o placeholder) */}
                                {poster.video_url && !poster.image_url && (
                                  <div className="relative w-full h-full bg-gray-800 flex items-center justify-center">
                                    <div className="animate-pulse flex space-x-4">
                                      <div className="rounded-full bg-gray-700 h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"></div>
                                    </div>
                                    <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-black bg-opacity-60 rounded-full p-1 sm:p-2">
                                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Video indicator cuando hay imagen */}
                                {poster.video_url && poster.image_url && (
                                  <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-black bg-opacity-60 rounded-full p-1 sm:p-2">
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {/* Placeholder cuando no hay media */}
                            {!poster.image_url && !poster.video_url && (
                              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                                <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          {/* Poster Actions */}
                          <div className="flex justify-between items-center mt-1 sm:mt-2">
                            <button 
                              className="flex items-center text-gray-300 hover:text-[#73FFA2] transition-colors"
                            >
                              <Heart className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1 sm:mr-1.5 md:mr-2" />
                              <span className="text-xs sm:text-sm">{poster.likes_count}</span>
                            </button>
                            <div className="flex items-center text-gray-300">
                              <span className="mr-1 sm:mr-2 text-sm">💬</span>
                              <span className="text-xs sm:text-sm">{poster.comments_count}</span>
                            </div>
                            <button 
                              className="p-1 sm:p-1.5 md:p-2 hover:bg-gray-700 rounded-full transition-colors duration-200"
                            >
                              <img src="/feed/arrow-right 4.svg" alt="Share" width="16" height="16" className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 sm:py-6 md:py-12 text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-700 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-white text-base sm:text-lg font-medium mb-1 sm:mb-2">No hay publicaciones aún</h3>
                      <p className="text-gray-400 text-xs sm:text-sm">Cuando crees tu primera publicación, aparecerá aquí.</p>
                    </div>
                  )}
                </div>
              )}
          
              {activeTab === 'MY TANKU' && customer?.id && (
                <div className="space-y-8 py-4 sm:py-6 border-gray-700 pt-8">
                  <FriendGroupsTab customerId={customer.id} />
                  <div className="border-t border-gray-700 pt-8">
                    <EventsCalendarTab customerId={customer.id} />
                  </div>
                </div>
              )}
              
              {activeTab === 'MIS COMPRAS' && (
                <div className="flex flex-col items-center justify-center py-4 sm:py-6 md:py-12 text-center">
                  <OrderCustomerTab customerId={customer.id} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedPoster && customer && isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-4xl h-full max-h-[95vh] flex flex-col lg:flex-row overflow-hidden">
            {/* Botón de cerrar */}
            <button
              onClick={closeModal}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 p-1 sm:p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <XMark className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </button>

            {/* Área de media - Izquierda */}
            <div className="flex-1 lg:flex-shrink-0 lg:w-1/2 bg-black flex items-center justify-center relative h-64 lg:h-full">
              {selectedPoster.image_url && (
                <Image
                  src={selectedPoster.image_url}
                  alt="Imagen del poster"
                  fill
                  className="object-contain"
                  unoptimized={selectedPoster.image_url.startsWith('blob:') || selectedPoster.image_url.startsWith('data:')}
                />
              )}
              
              {selectedPoster.video_url && !selectedPoster.image_url && (
                <video
                  src={selectedPoster.video_url}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay={false}
                />
              )}

              {!selectedPoster.image_url && !selectedPoster.video_url && (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Panel de información - Derecha */}
            <div className="flex-1 lg:w-1/2 p-2 sm:p-4 flex flex-col min-h-0">
              {/* Header del poster */}
              <div className="flex items-center mb-2 sm:mb-3 md:mb-4 flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gray-700">
                  <Image 
                    src={customer.avatar_url || '/feed/avatar.png'}
                    alt={customer.first_name || 'Usuario'}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-white font-medium text-sm sm:text-base">
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    {new Date(selectedPoster.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {selectedPoster.title && (
                <h2 className="text-xl font-bold text-white mb-3">{selectedPoster.title}</h2>
              )}
              
              {selectedPoster.description && (
                <p className="text-gray-300 mb-4">{selectedPoster.description}</p>
              )}

              {/* Sección de comentarios */}
              <div className="flex-1 flex flex-col min-h-0 mb-3 sm:mb-4">
                {/* Lista de comentarios */}
                <div className="flex-1 overflow-y-auto mb-3 sm:mb-4 pr-1 sm:pr-2" style={{maxHeight: 'calc(100vh - 400px)'}}>
                  {comments.length > 0 ? (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="space-y-2">
                          {/* Comentario principal */}
                          <div className="bg-gray-800 rounded-lg p-2 sm:p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-2 flex-1">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                  <Image 
                                    src={'/feed/avatar.png'}
                                    alt={comment.customer_name}
                                    width={24}
                                    height={24}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <p className="text-white font-medium text-xs sm:text-sm">{comment.customer_name}</p>
                                    <p className="text-gray-400 text-xs">
                                      {new Date(comment.created_at).toLocaleDateString('es-ES', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                  {editingCommentId === comment.id ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={editingCommentContent}
                                        onChange={(e) => setEditingCommentContent(e.target.value)}
                                        className="w-full bg-gray-700 text-white text-sm rounded p-2 resize-none"
                                        rows={2}
                                        maxLength={1000}
                                      />
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={handleSaveEdit}
                                          className="px-3 py-1 bg-[#73FFA2] text-black text-xs rounded hover:bg-[#5ee085] transition-colors"
                                        >
                                          Guardar
                                        </button>
                                        <button
                                          onClick={handleCancelEdit}
                                          className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-500 transition-colors"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-gray-300 text-xs sm:text-sm break-words mb-1 sm:mb-2">{comment.content}</p>
                                      {/* Acciones del comentario */}
                                      <div className="flex items-center space-x-3">
                                        <button
                                          onClick={() => handleStartReply(comment.id)}
                                          className="text-xs text-gray-400 hover:text-[#73FFA2] transition-colors"
                                        >
                                          Responder
                                        </button>
                                        {comment.replies_count && comment.replies_count > 0 ? (
                                          <button
                                            onClick={() => toggleReplies(comment.id)}
                                            className="text-xs text-gray-400 hover:text-[#73FFA2] transition-colors"
                                          >
                                            {showReplies[comment.id] ? 'Ocultar' : 'Ver'} respuestas ({comment.replies_count})
                                          </button>
                                        ) : null}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              {comment.customer_id === customer.id && editingCommentId !== comment.id && (
                                <div className="flex space-x-1 ml-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleStartEdit(comment)}
                                    className="p-1 text-gray-400 hover:text-[#73FFA2] transition-colors"
                                    title="Editar comentario"
                                  >
                                    <PencilSquare className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                    title="Eliminar comentario"
                                  >
                                    <Trash className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Input para responder */}
                            {replyingToId === comment.id && (
                              <div className="mt-3 pl-8 border-l-2 border-gray-600">
                                <div className="flex space-x-2">
                                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                    <Image 
                                      src={'/feed/avatar.png'}
                                      alt="Tu avatar"
                                      width={24}
                                      height={24}
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <textarea
                                      value={replyContent}
                                      onChange={(e) => setReplyContent(e.target.value)}
                                      placeholder="Escribe una respuesta..."
                                      className="w-full bg-gray-700 text-white text-sm rounded p-2 resize-none border border-gray-600 focus:border-[#73FFA2] focus:outline-none"
                                      rows={2}
                                      maxLength={1000}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault()
                                          handleAddReply(comment.id)
                                        }
                                      }}
                                    />
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => handleAddReply(comment.id)}
                                        disabled={isCommentLoading || !replyContent.trim()}
                                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                          isCommentLoading || !replyContent.trim()
                                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                            : 'bg-[#73FFA2] text-black hover:bg-[#5ee085]'
                                        }`}
                                      >
                                        {isCommentLoading ? '...' : 'Responder'}
                                      </button>
                                      <button
                                        onClick={handleCancelReply}
                                        className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-500 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Respuestas anidadas */}
                          {comment.replies && comment.replies.length > 0 && showReplies[comment.id] && (
                            <div className="ml-8 space-y-2">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="bg-gray-750 rounded-lg p-3 border-l-2 border-[#73FFA2]">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-2 flex-1">
                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                        <Image 
                                          src={'/feed/avatar.png'}
                                          alt={reply.customer_name}
                                          width={20}
                                          height={20}
                                          className="object-cover w-full h-full"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <p className="text-white font-medium text-xs">{reply.customer_name}</p>
                                          <p className="text-gray-400 text-xs">
                                            {new Date(reply.created_at).toLocaleDateString('es-ES', {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>
                                        <p className="text-gray-300 text-xs break-words">{reply.content}</p>
                                      </div>
                                    </div>
                                    {reply.customer_id === customer.id && (
                                      <div className="flex space-x-1 ml-2 flex-shrink-0">
                                        <button
                                          onClick={() => handleStartEdit(reply)}
                                          className="p-1 text-gray-400 hover:text-[#73FFA2] transition-colors"
                                          title="Editar respuesta"
                                        >
                                          <PencilSquare className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteComment(reply.id)}
                                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                          title="Eliminar respuesta"
                                        >
                                          <Trash className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 text-sm py-8">
                      No hay comentarios aún. ¡Sé el primero en comentar!
                    </div>
                  )}
                </div>

                {/* Input para nuevo comentario */}
                <div className="border-t border-gray-700 pt-2 sm:pt-3 flex-shrink-0">
                  <div className="flex space-x-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                      <Image 
                        src={'/feed/avatar.png'}
                        alt="Tu avatar"
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="flex-1 flex space-x-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escribe un comentario..."
                        className="flex-1 bg-gray-800 text-white text-xs sm:text-sm rounded-lg p-2 resize-none border border-gray-600 focus:border-[#73FFA2] focus:outline-none"
                        rows={2}
                        maxLength={1000}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleAddComment()
                          }
                        }}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={isCommentLoading || !newComment.trim()}
                        className={`px-2 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                          isCommentLoading || !newComment.trim()
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-[#73FFA2] text-black hover:bg-[#5ee085]'
                        }`}
                      >
                        {isCommentLoading ? '...' : '→'}
                      </button>
                    </div>
                  </div>
                </div>
                
              </div>

              {/* Acciones */}
              <div className="flex items-center space-x-3 sm:space-x-6 border-t border-gray-700 pt-2 sm:pt-3 flex-shrink-0">
                <button 
                  onClick={handleLikeToggle}
                  disabled={isLikeLoading}
                  className={`flex items-center transition-colors ${
                    isLiked 
                      ? 'text-[#73FFA2] hover:text-[#5FD687]' 
                      : 'text-[#3B82F6] hover:text-[#2563EB]'
                  } ${isLikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Image 
                    src={isLiked ? '/feed/Icons/Like_Green.png' : '/feed/Icons/Like_Blue.png'}
                    alt="Like"
                    width={20}
                    height={20}
                    className="mr-1 sm:mr-2 w-4 h-4 sm:w-6 sm:h-6"
                  />
                  <span>{likesCount}</span>
                </button>
                <div className="flex items-center text-gray-300">
                  <span className="mr-1 sm:mr-2 text-sm sm:text-lg">💬</span>
                  <span className="text-sm sm:text-base">{commentsCount}</span>
                </div>
                <button className="p-1 sm:p-2 hover:bg-gray-700 rounded-full transition-colors duration-200">
                  <img src="/feed/arrow-right 4.svg" alt="Share" width="20" height="20" className="w-4 h-4 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}

export default ProfilePanel
