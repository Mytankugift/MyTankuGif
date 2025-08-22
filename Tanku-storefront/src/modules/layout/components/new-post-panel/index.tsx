"use client"

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { XMark, Plus as PlusIcon } from "@medusajs/icons"
import { createPoster } from '../actions/create-poster'
import { retrieveCustomer } from "@lib/data/customer"

interface NewPostPanelProps {
  onClose: () => void
  onPostCreated?: () => void
}

const NewPostPanel: React.FC<NewPostPanelProps> = ({ onClose, onPostCreated }) => {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('')
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customer, setCustomer] = useState<any>(null)
  const [showMediaMenu, setShowMediaMenu] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Cargar datos del customer al montar el componente
  React.useEffect(() => {
    retrieveCustomer()
      .then(setCustomer)
      .catch(() => setCustomer(null))
  }, [])

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif']
      
      if (!validTypes.includes(file.type)) {
        alert('Solo se permiten imágenes (JPG, PNG, GIF)')
        return
      }

      // Limpiar URL anterior
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }

      setImageFile(file)
      setImagePreviewUrl(URL.createObjectURL(file))
    }
    
    if (event.target) {
      event.target.value = ''
    }
  }

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const validTypes = ['video/mp4', 'video/webm', 'video/mov']
      
      if (!validTypes.includes(file.type)) {
        alert('Solo se permiten videos (MP4, WebM, MOV)')
        return
      }

      // Limpiar URL anterior
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }

      setVideoFile(file)
      setVideoPreviewUrl(URL.createObjectURL(file))
    }
    
    if (event.target) {
      event.target.value = ''
    }
  }

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    setImageFile(null)
    setImagePreviewUrl('')
  }

  const handleRemoveVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }
    setVideoFile(null)
    setVideoPreviewUrl('')
  }

  const handleSubmitPost = async () => {
    // Verificar que al menos haya título o descripción
    if (!title.trim() && !description.trim()) {
      alert('Se requiere al menos un título o descripción')
      return
    }

    if (!customer?.id) {
      alert('No se ha encontrado un usuario registrado. Por favor, inicia sesión.')
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await createPoster({
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        imageFile: imageFile || undefined,
        videoFile: videoFile || undefined,
        customer_id: customer.id
      })

      if (result.success) {
        alert('¡Post creado exitosamente!')
        onPostCreated?.()
        handleClosePanel()
      } else {
        alert(`Error al crear el post: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Error al crear el post. Por favor, inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClosePanel = () => {
    // Limpiar URLs de preview
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }
    
    // Limpiar formulario
    setTitle('')
    setDescription('')
    setImageFile(null)
    setVideoFile(null)
    setImagePreviewUrl('')
    setVideoPreviewUrl('')
    setShowMediaMenu(false)
    onClose()
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Fixed Close Arrow Button */}
      <button
        onClick={handleClosePanel}
        className="fixed right-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center transition-colors shadow-lg"
      >
        <Image
          src="/Flecha.png"
          alt="Cerrar"
          width={24}
          height={24}
          className="object-contain"
        />
      </button>

      {/* Contenido del formulario con scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 md:p-6 min-h-full flex justify-center">
          <div className="w-full max-w-2xl space-y-4 sm:space-y-5 md:space-y-6">
            

            {/* Campos del formulario */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Escribe el título de tu post..."
                  className="w-full bg-gray-800 text-white text-sm sm:text-base border border-gray-600 rounded-md sm:rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#66DEDB] transition-colors"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Cuéntanos más sobre tu post..."
                  className="w-full bg-gray-800 text-white text-sm sm:text-base border border-gray-600 rounded-md sm:rounded-lg px-3 sm:px-4 py-2 sm:py-3 h-24 sm:h-32 resize-none focus:outline-none focus:border-[#66DEDB] transition-colors"
                  maxLength={500}
                />
              </div>
            </div>

            {/* Botón unificado para agregar archivos */}
            <div className="flex justify-center relative">
              <button
                onClick={() => setShowMediaMenu(!showMediaMenu)}
                className="bg-[#66DEDB] text-gray-900 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base rounded-md sm:rounded-lg font-medium hover:bg-[#73FFA2] transition-colors flex items-center gap-1.5 sm:gap-2"
              >
                <PlusIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5" />
                {imageFile || videoFile ? 'Seleccionar otro archivo' : 'Agregar archivo'}
              </button>
              
              {/* Menú desplegable */}
              {showMediaMenu && (
                <div className="absolute bottom-full mb-2 bg-gray-800 rounded-md sm:rounded-lg shadow-lg border border-gray-700 z-10 w-full max-w-[200px] sm:max-w-none">
                  <button
                    onClick={() => {
                      imageInputRef.current?.click()
                      setShowMediaMenu(false)
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left text-white text-sm sm:text-base hover:bg-gray-700 rounded-t-md sm:rounded-t-lg flex items-center gap-1.5 sm:gap-2"
                  >
                    <span className="text-blue-400">📷</span>
                    Seleccionar imagen
                  </button>
                  <button
                    onClick={() => {
                      videoInputRef.current?.click()
                      setShowMediaMenu(false)
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left text-white text-sm sm:text-base hover:bg-gray-700 rounded-b-md sm:rounded-b-lg flex items-center gap-1.5 sm:gap-2"
                  >
                    <span className="text-purple-400">🎥</span>
                    Seleccionar video
                  </button>
                </div>
              )}

            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
            {/* Preview de imagen */}
            {imagePreviewUrl && (
              <div className="relative w-full sm:w-1/2 aspect-video bg-gray-900 rounded-md sm:rounded-lg overflow-hidden">
                <Image
                  src={imagePreviewUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-red-500 text-white rounded-full p-0.5 sm:p-1 hover:bg-red-600 transition-colors"
                >
                  <XMark className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}

            {/* Preview de video */}
            {videoPreviewUrl && (
              <div className="relative w-full sm:w-1/2 aspect-video bg-gray-900 rounded-md sm:rounded-lg overflow-hidden mt-2 sm:mt-0">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full h-full"
                />
                <button
                  onClick={handleRemoveVideo}
                  className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-red-500 text-white rounded-full p-0.5 sm:p-1 hover:bg-red-600 transition-colors"
                >
                  <XMark className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>
          

            {/* Botones de acción */}
            <div className="flex gap-2 sm:gap-3 md:gap-4">
              <button
                onClick={handleClosePanel}
                className="flex-1 bg-gray-700 text-white px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base rounded-md sm:rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitPost}
                disabled={isSubmitting || (!title.trim() && !description.trim())}
                className={`flex-1 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base rounded-md sm:rounded-lg font-medium transition-colors flex justify-center items-center gap-1.5 sm:gap-2 ${isSubmitting || (!title.trim() && !description.trim()) ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-[#73FFA2] text-gray-900 hover:bg-[#66DEDB]'}`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                    <span className="whitespace-nowrap">Publicando...</span>
                  </>
                ) : (
                  'Publicar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input files ocultos */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoSelect}
        className="hidden"
      />
    </div>
  )
}

export default NewPostPanel
