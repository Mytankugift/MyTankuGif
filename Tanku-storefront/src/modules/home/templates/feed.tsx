"use client"

import React, { useState, useEffect } from "react"
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
  BuildingStorefront,
} from "@medusajs/icons"
import PreviewProductsTanku from "../components/preview-products-tanku.ts"
import BlackFridayAd from "../components/black-friday-ad"
import { fetchListStoreProduct } from "@modules/home/components/actions/get-list-store-products"
import StoryUpload, { Story } from "@modules/home/components/story-upload"
import StoryViewer from "@modules/home/components/story-viewer"
import FeedPosters from "@modules/home/components/feed-posters"
import { retrieveCustomer } from "@lib/data/customer"
import { getStories } from "@modules/home/components/actions/get-stories"
import { usePersonalInfo } from "@lib/context"
import Link from "next/link.js"
import UnifiedFeed from "@modules/home/components/unified-feed"
import TabNavigationNew from "@modules/home/components/tabs/TabNavigationNew"

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

// Categories moved to Give-Commerce page

function HomeContent() {
  // Context for personal info
  const {
    personalInfo,
    isLoading,
    getUser,
    refreshPersonalInfo,
    clearPersonalInfo,
  } = usePersonalInfo()

  const [userStories, setUserStories] = useState<Story[]>([])
  const [friendsStories, setFriendsStories] = useState<Story[]>([])
  const [allStories, setAllStories] = useState<Story[]>([])
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [products, setProducts] = useState<any[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)

  // Load products on component mount
  useEffect(() => {
    clearPersonalInfo()
    refreshPersonalInfo()
    fetchListStoreProduct().then(setProducts)
  }, [])

  // Load stories when user is available
  useEffect(() => {
    if (personalInfo?.id) {
      setStoriesLoading(true)
      getStories(personalInfo.id)
        .then((response) => {
          if (response.success) {
            // Convertir las historias de la base de datos al formato esperado por el frontend
            const convertedUserStories = response.userStories.map(
              (story: any) => ({
                id: story.id,
                customer_id: story.customer_id,
                name: story.customer_name || "Tú", // Nombre real del usuario
                avatar: "/feed/avatar.png", // Avatar por defecto
                timestamp: new Date(story.created_at),
                media:
                  story.files?.map((file: any) => ({
                    id: file.id,
                    type: file.file_type,
                    url: file.file_url,
                  })) || [],
              })
            )

            const convertedFriendsStories = response.friendsStories.map(
              (story: any) => ({
                id: story.id,
                customer_id: story.customer_id,
                name: story.customer_name || "Amigo", // Nombre real del amigo
                avatar: "/feed/avatar.png", // Avatar por defecto
                timestamp: new Date(story.created_at),
                media:
                  story.files?.map((file: any) => ({
                    id: file.id,
                    type: file.file_type,
                    url: file.file_url,
                  })) || [],
              })
            )

            setUserStories(convertedUserStories)
            setFriendsStories(convertedFriendsStories)
          }
        })
        .catch((error) => {
          console.error("Error loading stories:", error)
        })
        .finally(() => {
          setStoriesLoading(false)
        })
    }
  }, [personalInfo?.id])

  // Group stories by user and update all stories when user or friends stories change
  useEffect(() => {
    const allStoriesArray = [...userStories, ...friendsStories]

    console.log("=== AGRUPAMIENTO DE HISTORIAS ===")
    console.log("Total historias antes de agrupar:", allStoriesArray.length)
    console.log(
      "Historias individuales:",
      allStoriesArray.map((s) => ({
        id: s.id,
        customer_id: s.customer_id,
        name: s.name,
      }))
    )

    // Group stories by customer_id to show only one bubble per user
    const groupedStories = allStoriesArray.reduce((acc: any, story: any) => {
      const customerId = story.customer_id

      console.log(
        `Procesando historia: ${story.id}, customer_id: ${customerId}, nombre: ${story.name}`
      )

      if (!customerId) {
        console.warn("Historia sin customer_id:", story)
        return acc
      }

      if (!acc[customerId]) {
        // First story for this user - create the group
        console.log(`Creando nuevo grupo para customer_id: ${customerId}`)
        acc[customerId] = {
          id: story.id,
          customer_id: customerId,
          name: story.name,
          avatar: story.avatar,
          timestamp: story.timestamp,
          media: [...story.media],
          stories: [story],
        }
      } else {
        // Additional story for existing user - merge media and update timestamp if newer
        console.log(
          `Agregando historia al grupo existente para customer_id: ${customerId}`
        )
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
    const groupedStoriesArray = Object.values(groupedStories).sort(
      (a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime()
    ) as Story[]

    console.log("Total grupos después de agrupar:", groupedStoriesArray.length)
    console.log(
      "Grupos finales:",
      groupedStoriesArray.map((s) => ({
        customer_id: s.customer_id,
        name: s.name,
        totalMedia: s.media?.length,
        totalStories: s.stories?.length,
      }))
    )

    setAllStories(groupedStoriesArray)
  }, [userStories, friendsStories])

  const handleStoryCreate = (newStory: Story) => {
    // Agregar la historia temporalmente al estado local para feedback inmediato
    setUserStories((prev) => [newStory, ...prev])

    // Recargar todas las historias desde la base de datos para obtener la información completa
    if (personalInfo?.id) {
      getStories(personalInfo.id)
        .then((response) => {
          if (response.success) {
            // Convertir las historias de la base de datos al formato esperado por el frontend
            const convertedUserStories = response.userStories.map(
              (story: any) => ({
                id: story.id,
                customer_id: story.customer_id,
                name: story.customer_name || "Tú",
                avatar: "/feed/avatar.png",
                timestamp: new Date(story.created_at),
                media:
                  story.files?.map((file: any) => ({
                    id: file.id,
                    type: file.file_type,
                    url: file.file_url,
                  })) || [],
              })
            )

            const convertedFriendsStories = response.friendsStories.map(
              (story: any) => ({
                id: story.id,
                customer_id: story.customer_id,
                name: story.customer_name || "Amigo",
                avatar: "/feed/avatar.png",
                timestamp: new Date(story.created_at),
                media:
                  story.files?.map((file: any) => ({
                    id: file.id,
                    type: file.file_type,
                    url: file.file_url,
                  })) || [],
              })
            )

            setUserStories(convertedUserStories)
            setFriendsStories(convertedFriendsStories)
          }
        })
        .catch((error) => {
          console.error("Error reloading stories after creation:", error)
        })
    }
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


  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: "#1E1E1E" }}
    >
      {/* Stories Section - Sticky mejorado */}
      <div className="sticky top-0 z-30 bg-[#1E1E1E] border-b border-gray-800 p-2 sm:p-3 md:p-4 flex flex-col md:flex-row justify-between items-start w-full gap-2 sm:gap-3 md:gap-4 shadow-lg">
        {/* Stories Container */}
        <div className="flex-1 min-w-0 md:mr-2 lg:mr-4">
          <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto pb-2 sm:pb-3 md:pb-4 snap-x snap-mandatory">
            {/* Story Upload Component */}
            <StoryUpload
              onStoryCreate={handleStoryCreate}
              userAvatar={personalInfo?.avatar_url || "/feed/avatar.png"}
              userName="Tu Historia"
              customer_id={personalInfo?.id}
            />

            {/* Grouped Stories (User + Friends) */}
            {allStories.map((story, index) => (
              <div
                key={`${story.customer_id}-${story.id}`}
                className="flex flex-col items-center min-w-[60px] sm:min-w-[70px] md:min-w-[80px] flex-shrink-0 cursor-pointer"
                onClick={() => handleStoryClick(index)}
              >
                <div className="relative">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full p-0.5 mb-1 sm:mb-1.5 md:mb-2"
                    style={{
                      background: "linear-gradient(45deg, #1A485C, #73FFA2)",
                    }}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-transparent">
                      {story.media && story.media.length > 0 ? (
                        story.media[0].type === "image" ? (
                          <Image
                            src={story.media[0].url}
                            alt={story.name}
                            width={60}
                            height={60}
                            className="w-full h-full object-cover"
                          />
                        ) : story.media[0].type === "video" ? (
                          <div className="relative w-full h-full">
                            <video
                              src={story.media[0].url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-4 h-4 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
                                <div className="w-0 h-0 border-l-[6px] border-l-gray-800 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent ml-0.5"></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Image
                            src={story.avatar}
                            alt={story.name}
                            width={60}
                            height={60}
                            className="w-full h-full object-cover"
                          />
                        )
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
                    {Array.from({
                      length: Math.min(story.stories.length, 5),
                    }).map((_, dotIndex) => (
                      <div
                        key={dotIndex}
                        className="w-1.5 h-1.5 rounded-full bg-[#66DEDB]"
                      />
                    ))}
                    {story.stories.length > 5 && (
                      <span className="text-[#66DEDB] text-xs ml-1">
                        +{story.stories.length - 5}
                      </span>
                    )}
                  </div>
                )}

                <span className="text-xs sm:text-xs md:text-xs text-white text-center max-w-[60px] sm:max-w-[70px] md:max-w-[80px] truncate">
                  {story.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Icons */}
        <div className="hidden md:flex gap-2 lg:gap-3 flex-shrink-0">
          {/* Search Icon */}
          <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer group">
            <Image
              src="/feed/Icons/Search_Green.png"
              alt="Buscar"
              width={24}
              height={24}
              className="object-contain group-hover:hidden w-5 h-5 md:w-6 md:h-6"
            />
            <Image
              src="/feed/Icons/Search_Blue.png"
              alt="Buscar"
              width={24}
              height={24}
              className="object-contain hidden group-hover:block w-5 h-5 md:w-6 md:h-6"
            />
          </div>

          {/* Messages Icon */}
          <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer group">
            <Image
              src="/feed/Icons/Chat_Green.png"
              alt="Mensajes"
              width={24}
              height={24}
              className="object-contain group-hover:hidden w-5 h-5 md:w-6 md:h-6"
            />
            <Image
              src="/feed/Icons/Chat_Blue.png"
              alt="Mensajes"
              width={24}
              height={24}
              className="object-contain hidden group-hover:block w-5 h-5 md:w-6 md:h-6"
            />
          </div>

          {/* Notifications Icon */}
          <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer group">
            <Image
              src="/feed/Icons/Notification_Green.png"
              alt="Notificaciones"
              width={24}
              height={24}
              className="object-contain group-hover:hidden w-5 h-5 md:w-6 md:h-6"
            />
            <Image
              src="/feed/Icons/Notification_Blue.png"
              alt="Notificaciones"
              width={24}
              height={24}
              className="object-contain hidden group-hover:block w-5 h-5 md:w-6 md:h-6"
            />
          </div>

          {/* Cart Icon */}
          <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer group">
            {/* <Image
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
            /> */}
          </div>
        </div>
      </div>

      {/* Animated Marquee Message */}
      <div className="px-2 sm:px-3 md:px-4 mb-4 sm:mb-5 md:mb-6">
        <div className="rounded-lg p-2 sm:p-3 md:p-4 overflow-hidden w-full">
          <div className="animate-marquee whitespace-nowrap">
            <span className="text-[#66DEDB] text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl">
              Bienvenido a TANKU el primer GivE-Commerce del mundo: donde la
              gratitud y admiración transforman la forma de comprar. Descubre el
              verdadero significado del agradecimiento y conecta con lo y los
              que realmente amas.
            </span>
          </div>
        </div>
      </div>

      {/* Categories Slider - Movido a Give-Commerce */}
      
      {/* Tab Navigation Section */}
      <div className="px-2 sm:px-3 md:px-4 py-4 sm:py-5 md:py-6">
        <TabNavigationNew
          products={products}
          customerId={personalInfo?.id || ""}
        />
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
