"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { Heart } from "@medusajs/icons"
import  {fetchFeedPosts}  from "../actions/get-feed-post"

interface FeedPostersProps {
  customerId: string
}

interface Poster {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  title: string
  description: string
  image_url: string | null
  video_url: string | null
  likes_count: number
  comments_count: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export default function FeedPosters({ customerId }: FeedPostersProps) {
  const [posters, setPosters] = useState<Poster[]>([])
  const [loading, setLoading] = useState(true)
  const videoRefs = useRef<{[key: string]: HTMLVideoElement | null}>({})
  const [activeSlides, setActiveSlides] = useState<{[key: string]: 'image' | 'video'}>({})

  useEffect(() => {
    if (customerId) {
      setLoading(true)
      fetchFeedPosts(customerId)
        .then((data) => {
          setPosters(data)
        })
        .catch((error) => {
          console.error("Error fetching posters:", error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [customerId])

  // Inicializar activeSlides con 'image' para cada poster que tenga ambos (imagen y video)
  useEffect(() => {
    const initialActiveSlides: {[key: string]: 'image' | 'video'} = {}
    posters.forEach(poster => {
      if (poster.image_url && poster.video_url) {
        initialActiveSlides[poster.id] = 'image'
      }
    })
    setActiveSlides(initialActiveSlides)
  }, [posters])

  // Función para manejar la reproducción de videos cuando están en el viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const posterId = entry.target.getAttribute('data-poster-id')
          if (posterId && videoRefs.current[posterId]) {
            if (entry.isIntersecting) {
              videoRefs.current[posterId]?.play().catch(e => console.log("Error al reproducir video:", e))
            } else {
              videoRefs.current[posterId]?.pause()
            }
          }
        })
      },
      { threshold: 0.5 }
    )

    // Observar todos los videos
    Object.keys(videoRefs.current).forEach(posterId => {
      const video = videoRefs.current[posterId]
      if (video) {
        video.setAttribute('data-poster-id', posterId)
        observer.observe(video)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [posters])
  
  // Función para cambiar entre imagen y video en el slider
  const toggleMediaType = (posterId: string) => {
    setActiveSlides(prev => ({
      ...prev,
      [posterId]: prev[posterId] === 'image' ? 'video' : 'image'
    }))
  }

  // Función para obtener los posts del feed
 

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  if (posters.length === 0) {
    return (
      <div className="text-center p-8 text-white">
        <p>No hay publicaciones para mostrar.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 mb-8">
      <h2 className="text-xl font-bold text-[#73FFA2] px-4">Publicaciones</h2>
      
      {posters.map((poster) => (
        <div key={poster.id} className="bg-gray-800 rounded-lg overflow-hidden mb-6">
          {/* Cabecera del post */}
          <div className="flex items-center p-4">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700">
              <Image 
                src="/feed/avatar.png"
                alt={poster.customer_name}
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="ml-3">
              <p className="text-white font-medium">{poster.customer_name}</p>
              <p className="text-gray-400 text-xs">
                {new Date(poster.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
          
          {/* Contenido del post */}
          {poster.title && (
            <div className="px-4 pb-2">
              <h3 className="text-white font-medium">{poster.title}</h3>
            </div>
          )}
          
          {poster.description && (
            <div className="px-4 pb-4">
              <p className="text-gray-200">{poster.description}</p>
            </div>
          )}
          
          {/* Contenido multimedia */}
          {(poster.image_url || poster.video_url) && (
            <div className="w-full">
              {/* Caso 1: Tiene tanto imagen como video (mostrar slider) */}
              {poster.image_url && poster.video_url && (
                <div className="relative">
                  {/* Imagen */}
                  <div className={`transition-opacity duration-300 ${activeSlides[poster.id] === 'image' ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}>
                    <div className="relative w-full overflow-hidden">
                      <Image
                        src={poster.image_url}
                        alt={poster.title || "Imagen de publicación"}
                        width={800}
                        height={600}
                        className="w-full object-contain"
                        priority
                        unoptimized={poster.image_url.startsWith('blob:') || poster.image_url.startsWith('data:')}
                      />
                    </div>
                  </div>
                  
                  {/* Video */}
                  <div className={`transition-opacity duration-300 ${activeSlides[poster.id] === 'video' ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}>
                    <div className="relative pt-[56.25%] w-full overflow-hidden bg-black">
                      <video
                        ref={(el) => {
                          if (el) videoRefs.current[poster.id] = el;
                          return undefined;
                        }}
                        src={poster.video_url || undefined}
                        className="absolute top-0 left-0 w-full h-full object-contain"
                        controls
                        playsInline
                        loop
                      />
                    </div>
                  </div>
                  
                  {/* Controles del slider */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                    <button 
                      onClick={() => toggleMediaType(poster.id)}
                      className={`w-3 h-3 rounded-full ${activeSlides[poster.id] === 'image' ? 'bg-[#73FFA2]' : 'bg-gray-400'}`}
                      aria-label="Ver imagen"
                    />
                    <button 
                      onClick={() => toggleMediaType(poster.id)}
                      className={`w-3 h-3 rounded-full ${activeSlides[poster.id] === 'video' ? 'bg-[#73FFA2]' : 'bg-gray-400'}`}
                      aria-label="Ver video"
                    />
                  </div>
                </div>
              )}
              
              {/* Caso 2: Solo tiene imagen */}
              {poster.image_url && !poster.video_url && (
                <div className="relative w-full overflow-hidden">
                  <Image
                    src={poster.image_url}
                    alt={poster.title || "Imagen de publicación"}
                    width={800}
                    height={600}
                    className="w-full object-contain"
                    priority
                    unoptimized={poster.image_url.startsWith('blob:') || poster.image_url.startsWith('data:')}
                  />
                </div>
              )}
              
              {/* Caso 3: Solo tiene video */}
              {poster.video_url && !poster.image_url && (
                <div className="relative pt-[56.25%] w-full overflow-hidden bg-black">
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current[poster.id] = el;
                      return undefined;
                    }}
                    src={poster.video_url}
                    className="absolute top-0 left-0 w-full h-full object-contain"
                    controls
                    playsInline
                    loop
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Acciones del post */}
          <div className="flex justify-between items-center p-4 border-t border-gray-700">
            <div className="flex space-x-4">
              <button className="flex items-center text-gray-300 hover:text-[#73FFA2]">
                <Heart className="w-5 h-5 mr-1" />
                <span>Me gusta</span>
              </button>
              <button className="flex items-center text-gray-300 hover:text-[#73FFA2]">
                <span className="mr-1">💬</span>
                <span>Comentar</span>
              </button>
            </div>
            <button className="flex items-center text-gray-300 hover:text-[#73FFA2]">
              <span className="mr-1">↗️</span>
              <span>Compartir</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
