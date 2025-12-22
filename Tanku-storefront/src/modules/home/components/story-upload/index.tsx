"use client"

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { XMark, Plus } from "@medusajs/icons"
import { useStoryUpload } from "@lib/context/story-upload-context"
import { createStory } from '../actions/post-story'

export interface StoryMedia {
  id: string
  type: 'image' | 'video'
  url: string
  file: File
}

export interface Story {
  id: string
  customer_id?: string
  name: string
  avatar: string
  isOwn?: boolean
  media?: StoryMedia[]
  title?: string
  description?: string
  timestamp: Date
  stories?: Story[] // Para historias agrupadas
}

interface StoryUploadProps {
  onStoryCreate: (story: Story) => void
  userAvatar?: string
  userName?: string
  customer_id?: string
}

const StoryUpload: React.FC<StoryUploadProps> = ({ 
  onStoryCreate, 
  userAvatar = "/feed/avatar.png", 
  userName = "Tu Historia", 
  customer_id
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { isTriggered, resetTrigger } = useStoryUpload()
  
  // Efecto para abrir el modal cuando se activa desde fuera
  useEffect(() => {
    if (isTriggered) {
      console.log('StoryUpload: Trigger detectado, abriendo modal')
      setIsModalOpen(true)
      resetTrigger()
    }
  }, [isTriggered, resetTrigger])
  const [selectedFiles, setSelectedFiles] = useState<StoryMedia[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newMediaFiles: StoryMedia[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validar tipo de archivo
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm', 'video/mov']
        if (!validTypes.includes(file.type)) {
          alert(`Archivo ${file.name}: Por favor selecciona una imagen (JPG, PNG, GIF) o video (MP4, WebM, MOV)`)
          continue
        }

        // Sin límite de tamaño - removido por solicitud del usuario

        const url = URL.createObjectURL(file)
        const mediaItem: StoryMedia = {
          id: `media-${Date.now()}-${Math.random()}-${i}`, // Mejorar ID único
          type: file.type.startsWith('image/') ? 'image' : 'video',
          url,
          file
        }
        
        newMediaFiles.push(mediaItem)
      }
      
      if (newMediaFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...newMediaFiles])
        console.log('Archivos agregados:', newMediaFiles.length, 'Total:', selectedFiles.length + newMediaFiles.length)
      }
    }
    
    // Limpiar el input para permitir seleccionar los mismos archivos nuevamente si es necesario
    if (event.target) {
      event.target.value = ''
    }
  }

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    
    try {
      if (!customer_id) {
        alert('No se ha encontrado un usuario registrado. Por favor, inicia sesión.')
        return
      }
      // Llamada al backend para crear la historia
      const result = await createStory({
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        files: selectedFiles.map(media => media.file),
        customer_id: customer_id
      })

      if (result.success && result.story) {
        // Crear objeto Story con los datos del backend
        const newStory: Story = {
          id: result.story.id,
          name: userName,
          avatar: userAvatar,
          isOwn: true,
          media: result.story.media.map(mediaItem => ({
            id: mediaItem.id,
            type: mediaItem.type,
            url: mediaItem.url,
            file: selectedFiles.find(f => f.type.startsWith(mediaItem.type))?.file || selectedFiles[0].file
          })),
          title: result.story.title,
          description: result.story.description,
          timestamp: new Date(result.story.timestamp)
        }

        onStoryCreate(newStory)
        
        // Limpiar formulario
        handleCancel()
      } else {
        // Mostrar error
        console.error('Error al crear historia:', result.error)
        alert(`Error al crear la historia: ${result.error}`)
        setIsUploading(false)
      }
    } catch (error) {
      console.error('Error al enviar historia:', error)
      alert('Error al enviar la historia. Por favor, intenta de nuevo.')
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    // Limpiar URLs de objetos para evitar memory leaks
    selectedFiles.forEach(media => {
      URL.revokeObjectURL(media.url)
    })
    
    setSelectedFiles([])
    setTitle('')
    setDescription('')
    setCurrentMediaIndex(0)
    setIsUploading(false)
    setIsModalOpen(false)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveMedia = (mediaId: string) => {
    setSelectedFiles(prev => {
      const mediaToRemove = prev.find(m => m.id === mediaId)
      if (mediaToRemove) {
        URL.revokeObjectURL(mediaToRemove.url)
      }
      const newFiles = prev.filter(m => m.id !== mediaId)
      
      // Ajustar índice actual si es necesario
      if (currentMediaIndex >= newFiles.length && newFiles.length > 0) {
        setCurrentMediaIndex(newFiles.length - 1)
      } else if (newFiles.length === 0) {
        setCurrentMediaIndex(0)
      }
      
      return newFiles
    })
  }

  const handlePreviousMedia = () => {
    setCurrentMediaIndex(prev => prev > 0 ? prev - 1 : selectedFiles.length - 1)
  }

  const handleNextMedia = () => {
    setCurrentMediaIndex(prev => prev < selectedFiles.length - 1 ? prev + 1 : 0)
  }

  return (
    <>
      {/* Story Circle with Plus Icon */}
      <div 
        className="flex flex-col items-center min-w-[80px] flex-shrink-0 cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative">
          <div 
            className="w-16 h-16 rounded-full p-0.5 mb-2"
            style={{
              background: 'linear-gradient(45deg, #1A485C, #73FFA2)'
            }}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
              <Image
                src={userAvatar}
                alt={userName}
                width={60}
                height={60}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors">
            <Plus className="text-white w-3 h-3" />
          </div>
        </div>
        <span className="text-xs text-white text-center max-w-[80px] truncate">
          {userName}
        </span>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-white text-lg font-semibold">Crear Historia</h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMark className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {selectedFiles.length === 0 ? (
                /* File Upload Area */
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium mb-2">Sube tu historia</p>
                      <p className="text-gray-400 text-sm mb-4">
                        Selecciona múltiples fotos o videos para compartir
                      </p>
                      <div className="flex gap-2 justify-center mb-4">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          JPG, PNG, GIF
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          MP4, WebM, MOV
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-[#66DEDB] text-gray-900 px-6 py-2 rounded-lg font-medium hover:bg-[#73FFA2] transition-colors"
                    >
                      Seleccionar archivos
                    </button>
                  </div>
                </div>
              ) : (
                /* Preview and Form */
                <div className="space-y-4">
                  {/* Media Preview with Navigation */}
                  <div className="bg-gray-800 rounded-lg overflow-hidden relative">
                    {selectedFiles.length > 0 && (
                      <>
                        {/* Current Media Display */}
                        {selectedFiles[currentMediaIndex].type === 'image' ? (
                          <Image
                            src={selectedFiles[currentMediaIndex].url}
                            alt="Preview"
                            width={400}
                            height={300}
                            className="w-full h-64 object-cover"
                          />
                        ) : (
                          <video
                            src={selectedFiles[currentMediaIndex].url}
                            controls
                            className="w-full h-64 object-cover"
                          />
                        )}
                        
                        {/* Navigation Controls */}
                        {selectedFiles.length > 1 && (
                          <>
                            <button
                              onClick={handlePreviousMedia}
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70 transition-opacity"
                            >
                              ‹
                            </button>
                            <button
                              onClick={handleNextMedia}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70 transition-opacity"
                            >
                              ›
                            </button>
                            
                            {/* Media Counter */}
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                              {currentMediaIndex + 1} / {selectedFiles.length}
                            </div>
                          </>
                        )}
                        
                        {/* Remove Current Media Button */}
                        <button
                          onClick={() => handleRemoveMedia(selectedFiles[currentMediaIndex].id)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors text-sm"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Add More Files Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        console.log('Botón "Agregar más archivos" clickeado')
                        if (fileInputRef.current) {
                          fileInputRef.current.click()
                        } else {
                          console.error('fileInputRef.current es null')
                        }
                      }}
                      className="bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar más archivos ({selectedFiles.length} actual{selectedFiles.length !== 1 ? 'es' : ''})
                    </button>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Título (opcional)
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Agrega un título a tu historia..."
                        className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-[#66DEDB] transition-colors"
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Descripción (opcional)
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Cuéntanos sobre tu historia..."
                        className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:border-[#66DEDB] transition-colors"
                        maxLength={500}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleCancel}
                      className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isUploading}
                      className="flex-1 bg-[#66DEDB] text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-[#73FFA2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? 'Subiendo...' : 'Compartir Historia'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Input file siempre disponible - fuera de las condiciones */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}
    </>
  )
}

export default StoryUpload
