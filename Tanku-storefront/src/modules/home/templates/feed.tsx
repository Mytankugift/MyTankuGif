"use client"

import React, { useState, useEffect } from 'react'
import Image from "next/image"
import { 
  House, 
  ShoppingBag, 
  Heart, 
  Star, 
  Gift, 
  Phone, 
  Camera,
  Book,
  BuildingStorefront
} from "@medusajs/icons"
import PreviewProductsTanku from "../components/preview-products-tanku.ts"
import BlackFridayAd from '../components/black-friday-ad'
import { fetchListStoreProduct } from "@modules/home/components/actions/get-list-store-products"
import StoryUpload, { Story } from "@modules/home/components/story-upload"
import StoryViewer from "@modules/home/components/story-viewer"
import { retrieveCustomer } from "@lib/data/customer"
import { getStories } from "@modules/home/components/actions/get-stories"

// Generate mock data for friends' stories (without user's own story)
// COMENTADO: Ahora se obtienen las historias desde la base de datos
/*
const mockFriendsStories: Story[] = [
  { 
    id: "friend-2", 
    name: "Ana García", 
    avatar: "/feed/avatar.png",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  },
  { 
    id: "friend-3", 
    name: "Carlos López", 
    avatar: "/feed/avatar.png",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
  },
  { 
    id: "friend-4", 
    name: "María Silva", 
    avatar: "/feed/avatar.png",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
  },
  { 
    id: "friend-5", 
    name: "Juan Pérez", 
    avatar: "/feed/avatar.png",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
  },
  { 
    id: "friend-6", 
    name: "Sofia Ruiz", 
    avatar: "/feed/avatar.png",
    timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000) // 10 hours ago
  },
  { 
    id: "friend-7", 
    name: "Diego Torres", 
    avatar: "/feed/avatar.png",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
  },
]
*/

// Generate categories with images from /public/categories
const mockCategories = [
  { id: 1, name: "CELEBRACIONES", image: "/categories/Celebraciones2.png", color: "border-yellow-400" },
  { id: 2, name: "DEPORTES Y HOBBIES", image: "/categories/Deportes_y_Hobbies.png", color: "border-blue-400" },
  { id: 3, name: "JUGUETERÍA", image: "/categories/Jugueteria2.png", color: "border-red-400" },
  { id: 4, name: "LIBROS Y MÚSICA", image: "/categories/Libros_y_Musica.png", color: "border-green-400" },
  { id: 5, name: "MASCOTAS", image: "/categories/Mascotas2.png", color: "border-purple-400" },
  { id: 6, name: "MODA HOMBRES", image: "/categories/Moda_Hombres.png", color: "border-pink-400" },
  { id: 7, name: "MODA MUJER", image: "/categories/Moda_Mujer.png", color: "border-indigo-400" },
  { id: 8, name: "MODA NIÑOS", image: "/categories/Moda_Niños.png", color: "border-teal-400" },
  { id: 9, name: "SALUD Y BELLEZA", image: "/categories/Salud_y_Belleza.png", color: "border-orange-400" },
  { id: 10, name: "TECNOLOGÍA", image: "/categories/Tecnologia.png", color: "border-cyan-400" },
]

function HomeContent() {
  const [userStories, setUserStories] = useState<Story[]>([])
  const [friendsStories, setFriendsStories] = useState<Story[]>([])
  const [allStories, setAllStories] = useState<Story[]>([])
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [products, setProducts] = useState<any[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [categorySliderIndex, setCategorySliderIndex] = useState(0)

  // Load customer data
  useEffect(() => {
    retrieveCustomer()
      .then(setCustomer)
      .catch(() => setCustomer(null))
  }, [])
  
  // Load products on component mount
  useEffect(() => {
    fetchListStoreProduct().then(setProducts)
  }, [])

  // Load stories when customer is available
  useEffect(() => {
    if (customer?.id) {
      setStoriesLoading(true)
      getStories(customer.id)
        .then((response) => {
          if (response.success) {
            // Convertir las historias de la base de datos al formato esperado por el frontend
            const convertedUserStories = response.userStories.map((story: any) => ({
              id: story.id,
              customer_id: story.customer_id,
              name: story.customer_name || "Tú", // Nombre real del usuario
              avatar: "/feed/avatar.png", // Avatar por defecto
              timestamp: new Date(story.created_at),
              media: story.files?.map((file: any) => ({
                id: file.id,
                type: file.file_type,
                url: file.file_url
              })) || []
            }))
            
            const convertedFriendsStories = response.friendsStories.map((story: any) => ({
              id: story.id,
              customer_id: story.customer_id,
              name: story.customer_name || "Amigo", // Nombre real del amigo
              avatar: "/feed/avatar.png", // Avatar por defecto
              timestamp: new Date(story.created_at),
              media: story.files?.map((file: any) => ({
                id: file.id,
                type: file.file_type,
                url: file.file_url
              })) || []
            }))
            
            setUserStories(convertedUserStories)
            setFriendsStories(convertedFriendsStories)
          }
        })
        .catch((error) => {
          console.error('Error loading stories:', error)
        })
        .finally(() => {
          setStoriesLoading(false)
        })
    }
  }, [customer])

  // Group stories by user and update all stories when user or friends stories change
  useEffect(() => {
    const allStoriesArray = [...userStories, ...friendsStories]
    
    console.log('=== AGRUPAMIENTO DE HISTORIAS ===');
    console.log('Total historias antes de agrupar:', allStoriesArray.length);
    console.log('Historias individuales:', allStoriesArray.map(s => ({ id: s.id, customer_id: s.customer_id, name: s.name })));
    
    // Group stories by customer_id to show only one bubble per user
    const groupedStories = allStoriesArray.reduce((acc: any, story: any) => {
      const customerId = story.customer_id;
      
      console.log(`Procesando historia: ${story.id}, customer_id: ${customerId}, nombre: ${story.name}`);
      
      if (!customerId) {
        console.warn('Historia sin customer_id:', story);
        return acc;
      }
      
      if (!acc[customerId]) {
        // First story for this user - create the group
        console.log(`Creando nuevo grupo para customer_id: ${customerId}`);
        acc[customerId] = {
          id: story.id,
          customer_id: customerId,
          name: story.name,
          avatar: story.avatar,
          timestamp: story.timestamp,
          media: [...story.media],
          stories: [story]
        }
      } else {
        // Additional story for existing user - merge media and update timestamp if newer
        console.log(`Agregando historia al grupo existente para customer_id: ${customerId}`);
        acc[customerId].media.push(...story.media)
        acc[customerId].stories.push(story)
        
        // Keep the most recent timestamp
        if (story.timestamp > acc[customerId].timestamp) {
          acc[customerId].timestamp = story.timestamp
        }
      }
      
      return acc
    }, {})
    
    // Convert back to array and sort by most recent timestamp
    const groupedStoriesArray = Object.values(groupedStories).sort((a: any, b: any) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    ) as Story[]
    
    console.log('Total grupos después de agrupar:', groupedStoriesArray.length);
    console.log('Grupos finales:', groupedStoriesArray.map(s => ({ 
      customer_id: s.customer_id, 
      name: s.name, 
      totalMedia: s.media?.length,
      totalStories: s.stories?.length 
    })));
    
    setAllStories(groupedStoriesArray)
  }, [userStories, friendsStories])

  const handleStoryCreate = (newStory: Story) => {
    setUserStories(prev => [newStory, ...prev])
  }

  const handleStoryClick = (storyIndex: number) => {
    setCurrentStoryIndex(storyIndex)
    setIsViewerOpen(true)
  }

  const handleViewerClose = () => {
    setIsViewerOpen(false)
  }

  const handleStoryChange = (index: number) => {
    setCurrentStoryIndex(index)
  }

  // Category slider functions
  const categoriesPerView = 10 // Show 9 categories at a time (5 + 4)
  const maxSliderIndex = Math.max(0, mockCategories.length - categoriesPerView)

  const handleCategoryNext = () => {
    setCategorySliderIndex(prev => Math.min(prev + 1, maxSliderIndex))
  }

  const handleCategoryPrev = () => {
    setCategorySliderIndex(prev => Math.max(prev - 1, 0))
  }

  const getVisibleCategories = () => {
    return mockCategories.slice(categorySliderIndex, categorySliderIndex + categoriesPerView)
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: '#1E1E1E' }}>
      {/* Stories Section */}
      <div className="p-4 flex justify-between items-start w-full">
        {/* Stories Container */}
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {/* Story Upload Component */}
            <StoryUpload 
              onStoryCreate={handleStoryCreate}
              userAvatar="/feed/avatar.png"
              userName="Tu Historia"
              customer_id={customer?.id}
            />
            
            {/* Grouped Stories (User + Friends) */}
            {allStories.map((story, index) => (
              <div 
                key={`${story.customer_id}-${story.id}`} 
                className="flex flex-col items-center min-w-[80px] flex-shrink-0 cursor-pointer"
                onClick={() => handleStoryClick(index)}
              >
                <div className="relative">
                  <div 
                    className="w-16 h-16 rounded-full p-0.5 mb-2"
                    style={{
                      background: 'linear-gradient(45deg, #1A485C, #73FFA2)'
                    }}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                      {story.media && story.media.length > 0 && story.media[0].type === 'image' ? (
                        <Image
                          src={story.media[0].url}
                          alt={story.name}
                          width={60}
                          height={60}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={story.avatar}
                          alt={story.name}
                          width={60}
                          height={60}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Story dots indicator */}
                {story.stories && story.stories.length > 1 && (
                  <div className="flex justify-center gap-1 mb-1">
                    {Array.from({ length: Math.min(story.stories.length, 5) }).map((_, dotIndex) => (
                      <div 
                        key={dotIndex}
                        className="w-1.5 h-1.5 rounded-full bg-[#66DEDB]"
                      />
                    ))}
                    {story.stories.length > 5 && (
                      <span className="text-[#66DEDB] text-xs ml-1">+{story.stories.length - 5}</span>
                    )}
                  </div>
                )}
                
                <span className="text-xs text-white text-center max-w-[80px] truncate">
                  {story.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Icons */}
        <div className="flex gap-3 flex-shrink-0">
          {/* Search Icon */}
          <div className="flex items-center justify-center w-10 h-10 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors cursor-pointer group">
            <Image
              src="/feed/Icons/Search_Green.png"
              alt="Buscar"
              width={24}
              height={24}
              className="object-contain group-hover:hidden"
            />
            <Image
              src="/feed/Icons/Search_Blue.png"
              alt="Buscar"
              width={24}
              height={24}
              className="object-contain hidden group-hover:block"
            />
          </div>

          {/* Messages Icon */}
          <div className="flex items-center justify-center w-10 h-10 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors cursor-pointer group">
            <Image
              src="/feed/Icons/Chat_Green.png"
              alt="Mensajes"
              width={24}
              height={24}
              className="object-contain group-hover:hidden"
            />
            <Image
              src="/feed/Icons/Chat_Blue.png"
              alt="Mensajes"
              width={24}
              height={24}
              className="object-contain hidden group-hover:block"
            />
          </div>

          {/* Notifications Icon */}
          <div className="flex items-center justify-center w-10 h-10 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors cursor-pointer group">
            <Image
              src="/feed/Icons/Notification_Green.png"
              alt="Notificaciones"
              width={24}
              height={24}
              className="object-contain group-hover:hidden"
            />
            <Image
              src="/feed/Icons/Notification_Blue.png"
              alt="Notificaciones"
              width={24}
              height={24}
              className="object-contain hidden group-hover:block"
            />
          </div>

          {/* Cart Icon */}
          <div className="flex items-center justify-center w-10 h-10 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors cursor-pointer group">
            <Image
              src="/feed/Icons/Shopping_Cart_Green.png"
              alt="Carrito"
              width={24}
              height={24}
              className="object-contain group-hover:hidden"
            />
            <Image
              src="/feed/Icons/Shopping_Cart_Blue.png"
              alt="Carrito"
              width={24}
              height={24}
              className="object-contain hidden group-hover:block"
            />
          </div>
        </div>
      </div>

      {/* Animated Marquee Message */}
      <div className="px-4 mb-6">
        <div className="rounded-lg p-4 overflow-hidden w-full">
          <div className="animate-marquee whitespace-nowrap">
            <span className="text-white text-base">
              Bienvenido a TANKU el primer Give-commerce donde puedes encontrar productos únicos y especiales para ti y tus seres queridos ✨ 
              ¡Descubre las mejores ofertas y sorpresas que tenemos para ti! 🎁 
              Únete a nuestra comunidad y comparte tus experiencias con otros usuarios 🌟
            </span>
          </div>
        </div>
      </div>

      {/* Categories Slider */}
      <div className="px-4 mb-8">
        
        {/* Categories Container with Navigation Arrows */}
        <div className="relative flex items-center">
          {/* Left Arrow - Vertically Centered */}
          <button 
            onClick={handleCategoryPrev}
            disabled={categorySliderIndex === 0}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-lg"
          >
            <Image
              src="/feed/Flecha.svg"
              alt="Previous"
              width={20}
              height={20}
              className="w-5 h-5"
            />
          </button>

          {/* Right Arrow - Vertically Centered */}
          <button 
            onClick={handleCategoryNext}
            disabled={categorySliderIndex >= maxSliderIndex}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-lg"
          >
            <Image
              src="/feed/Flecha.svg"
              alt="Next"
              width={20}
              height={20}
              className="w-5 h-5 transform rotate-180"
            />
          </button>

          {/* Categories Grid with Full Width */}
          <div className="w-full px-8">
            {/* First Row - 5 categories */}
            <div className="flex justify-between mb-6">
              {getVisibleCategories().slice(0, 5).map((category, index) => (
                <div key={category.id} className="flex flex-col items-center flex-1 max-w-[280px]">
                  <div className={`w-52 h-32 rounded-2xl border-2 ${category.color}  hover:scale-105 transition-transform cursor-pointer overflow-hidden relative group`}>
                    <Image
                      src={category.image}
                      alt={category.name}
                      width={208}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay with title */}
                    <div className="absolute inset-0  bg-opacity-40 flex items-end p-3">
                      <span className="text-white text-base font-bold text-center w-full leading-tight">
                        {category.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Second Row - 4 categories, offset to the right by half card width */}
            <div className="flex justify-between" style={{ marginLeft: '104px', marginRight: '104px' }}>
              {getVisibleCategories().slice(5, 9).map((category, index) => (
                <div key={category.id} className="flex flex-col items-center flex-1 max-w-[280px]">
                  <div className={`w-52 h-32 rounded-2xl border-2 ${category.color} hover:scale-105 transition-transform cursor-pointer overflow-hidden relative group`}>
                    <Image
                      src={category.image}
                      alt={category.name}
                      width={208}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay with title */}
                    <div className="absolute inset-0 flex items-end p-3">
                      <span className="text-white text-base font-bold text-center w-full leading-tight">
                        {category.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Large Icons Section */}
      <div className="px-4 py-6">
        <div className="flex justify-center items-center">
          <div className="grid grid-cols-4 gap-8 max-w-2xl w-full">
            {/* MyTanku */}
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-20 h-20 flex flex-col items-center justify-center mb-3 hover:scale-105 transition-transform relative">
                <Image
                  src="/feed/Icons/MyTANKU_Green.png"
                  alt="MyTanku"
                  width={50}
                  height={50}
                  className="object-contain group-hover:hidden"
                />
                <Image
                  src="/feed/Icons/MyTANKU_Blue.png"
                  alt="MyTanku"
                  width={50}
                  height={50}
                  className="object-contain hidden group-hover:block absolute top-0"
                />
              </div>
              <span className="text-[#73FFA2] text-sm font-medium group-hover:text-[#66DEDB] transition-colors">
                #MyTANKU
              </span>
            </div>

            {/* StalkerGift */}
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-20 h-20 flex flex-col items-center justify-center mb-3 hover:scale-105 transition-transform relative">
                <Image
                  src="/feed/Icons/StalkerGift_Green.png"
                  alt="StalkerGift"
                  width={50}
                  height={50}
                  className="object-contain group-hover:hidden"
                />
                <Image
                  src="/feed/Icons/StalkerGift_Blue.png"
                  alt="StalkerGift"
                  width={50}
                  height={50}
                  className="object-contain hidden group-hover:block absolute top-0"
                />
              </div>
              <span className="text-[#73FFA2] text-sm font-medium group-hover:text-[#66DEDB] transition-colors">
                #StalkerGift
              </span>
            </div>

            {/* MultiPay */}
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-20 h-20 flex flex-col items-center justify-center mb-3 hover:scale-105 transition-transform relative">
                <Image
                  src="/feed/Icons/MultiPay_Green.png"
                  alt="MultiPay"
                  width={50}
                  height={50}
                  className="object-contain group-hover:hidden"
                />
                <Image
                  src="/feed/Icons/MultiPay_Blue.png"
                  alt="MultiPay"
                  width={50}
                  height={50}
                  className="object-contain hidden group-hover:block absolute top-0"
                />
              </div>
              <span className="text-[#73FFA2] text-sm font-medium group-hover:text-[#66DEDB] transition-colors">
                #MultiPay
              </span>
            </div>

            {/* Explore */}
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-20 h-20 flex flex-col items-center justify-center mb-3 hover:scale-105 transition-transform relative">
                <Image
                  src="/feed/Icons/Explore_Green.png"
                  alt="Explore"
                  width={50}
                  height={50}
                  className="object-contain group-hover:hidden"
                />
                <Image
                  src="/feed/Icons/Explore_Blue.png"
                  alt="Explore"
                  width={50}
                  height={50}
                  className="object-contain hidden group-hover:block absolute top-0"
                />
              </div>
              <span className="text-[#73FFA2] text-sm font-medium group-hover:text-[#66DEDB] transition-colors">
                #Explore
              </span>
            </div>
          </div>
        </div>

                <PreviewProductsTanku products={products} />

        <BlackFridayAd products={products} />

        
      </div>

      {/* Story Viewer Modal */}
      {isViewerOpen && allStories.length > 0 && (
        <StoryViewer
          stories={allStories}
          currentStoryIndex={currentStoryIndex}
          onClose={handleViewerClose}
          onStoryChange={handleStoryChange}
        />
      )}

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default HomeContent
