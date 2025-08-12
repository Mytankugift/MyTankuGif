"use client"

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { XMark, Plus } from "@medusajs/icons"
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
        <div className="p-6 min-h-full flex justify-center">
          <div className="w-full max-w-2xl space-y-6">
            

            {/* Campos del formulario */}
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Escribe el título de tu post..."
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-[#66DEDB] transition-colors"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Cuéntanos más sobre tu post..."
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 h-32 resize-none focus:outline-none focus:border-[#66DEDB] transition-colors"
                  maxLength={500}
                />
              </div>
            </div>

            {/* Botón unificado para agregar archivos */}
            <div className="flex justify-center relative">
              <button
                onClick={() => setShowMediaMenu(!showMediaMenu)}
                className="bg-[#66DEDB] text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-[#73FFA2] transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {imageFile || videoFile ? 'Seleccionar otro archivo' : 'Agregar archivo'}
              </button>
              
              {/* Menú desplegable */}
              {showMediaMenu && (
                <div className="absolute bottom-full mb-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                  <button
                    onClick={() => {
                      imageInputRef.current?.click()
                      setShowMediaMenu(false)
                    }}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 rounded-t-lg flex items-center gap-2"
                  >
                    <span className="text-blue-400">📷</span>
                    Seleccionar imagen
                  </button>
                  <button
                    onClick={() => {
                      videoInputRef.current?.click()
                      setShowMediaMenu(false)
                    }}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 rounded-b-lg flex items-center gap-2"
                  >
                    <span className="text-purple-400">🎥</span>
                    Seleccionar video
                  </button>
                </div>
              )}

            </div>
            <div className="flex justify-center gap-2">
            {/* Preview de imagen */}
            {imagePreviewUrl && (
              <div className="space-y-4">
                <h3 className="text-white font-medium">Imagen seleccionada:</h3>
                <div className="relative inline-block">
                  <Image
                    src={imagePreviewUrl}
                    alt="Preview imagen"
                    width={200}
                    height={200}
                    className="w-full max-w-sm h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors text-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Preview de video */}
            {videoPreviewUrl && (
              <div className="space-y-4">
                <h3 className="text-white font-medium">Video seleccionado:</h3>
                <div className="relative inline-block">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full max-w-sm h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={handleRemoveVideo}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors text-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
             </div>
          

            {/* Botones de acción */}
            <div className="flex gap-4">
              <button
                onClick={handleClosePanel}
                className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitPost}
                disabled={isSubmitting || (!title.trim() && !description.trim())}
                className="flex-1 bg-[#66DEDB] text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-[#73FFA2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Publicando...' : 'Publicar Post'}
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
