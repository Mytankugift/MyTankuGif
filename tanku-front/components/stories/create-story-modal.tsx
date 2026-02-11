'use client'

import React, { useState, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useStories } from '@/lib/hooks/use-stories'
import Image from 'next/image'
import { XMarkIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline'

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onStoryCreated?: () => void
}

export function CreateStoryModal({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) {
  const { token } = useAuthStore()
  const { refreshStories } = useStories()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Resetear formulario cuando se cierra
  React.useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setDescription('')
      setSelectedFiles([])
      setPreviews([])
      setError(null)
    }
  }, [isOpen])

  // Generar previews cuando se seleccionan archivos
  React.useEffect(() => {
    if (selectedFiles.length > 0) {
      const newPreviews: string[] = []
      let loadedCount = 0
      
      selectedFiles.forEach((file, index) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          newPreviews[index] = reader.result as string
          loadedCount++
          if (loadedCount === selectedFiles.length) {
            setPreviews(newPreviews)
          }
        }
        reader.readAsDataURL(file)
      })
    } else {
      setPreviews([])
    }
  }, [selectedFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validar tipos de archivo
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    )

    if (validFiles.length !== files.length) {
      setError('Por favor selecciona solo imágenes o videos válidos')
      return
    }

    // Validar tamaño (max 50MB por archivo)
    const oversizedFiles = validFiles.filter(file => file.size > 50 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      setError('Los archivos deben ser menores a 50MB')
      return
    }

    setSelectedFiles(prev => [...prev, ...validFiles])
    setError(null)
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (selectedFiles.length === 0) {
      setError('Se requiere al menos una imagen o video')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append('files', file)
      })
      if (title.trim()) formData.append('title', title.trim())
      if (description.trim()) formData.append('description', description.trim())

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
      const response = await fetch(`${API_URL}${API_ENDPOINTS.STORIES.CREATE}`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Éxito: cerrar modal y refrescar stories
        onClose()
        await refreshStories()
        if (onStoryCreated) {
          onStoryCreated()
        }
      } else {
        setError(data.error?.message || data.message || 'Error al crear la historia')
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la historia')
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: '#2C3137',
          border: '2px solid #73FFA2',
          borderRadius: '25px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h2 
              className="text-2xl font-bold"
              style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}
            >
              Nueva Historia
            </h2>
            <p 
              className="text-base"
              style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
            >
              Comparte un momento que dure 24 horas
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* File Upload - Primero */}
          <div>
            {previews.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-[200px] flex items-center justify-center cursor-pointer transition-colors"
                style={{
                  backgroundColor: '#2C3137',
                  border: '2px dashed #66DEDB',
                  borderRadius: '25px',
                }}
              >
                <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                  <PhotoIcon className="w-12 h-12" style={{ color: '#9CA3AF' }} />
                  <p className="text-sm" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif' }}>
                    Agrega imágenes o videos para tu historia
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {previews.map((preview, index) => {
                    const file = selectedFiles[index]
                    const isImage = file?.type.startsWith('image/')
                    const isVideo = file?.type.startsWith('video/')
                    
                    return (
                      <div key={index} className="relative">
                        {isImage && (
                          <div className="relative w-full rounded-[25px] overflow-hidden">
                            <Image
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              width={400}
                              height={300}
                              className="w-full h-auto max-h-64 object-cover"
                              unoptimized
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index)}
                              className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 transition-colors"
                              disabled={isUploading}
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        {isVideo && (
                          <div className="relative w-full rounded-[25px] overflow-hidden">
                            <video
                              src={preview}
                              controls
                              className="w-full h-auto max-h-64"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index)}
                              className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 transition-colors"
                              disabled={isUploading}
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm transition-colors"
                  style={{ color: '#73FFA2' }}
                  disabled={isUploading}
                >
                  Agregar más archivos
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            )}
          </div>

          {/* Título - Opcional */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título (opcional)"
              className="w-full px-4 py-3 text-white placeholder-gray-400 focus:outline-none"
              style={{
                backgroundColor: '#2C3137',
                border: '2px solid #66DEDB',
                borderRadius: '25px',
                fontFamily: 'Poppins, sans-serif',
              }}
              disabled={isUploading}
            />
          </div>

          {/* Descripción - Segundo */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-4 text-white placeholder-gray-400 focus:outline-none resize-none"
              style={{
                backgroundColor: '#2C3137',
                border: '2px solid #66DEDB',
                borderRadius: '25px',
                fontFamily: 'Poppins, sans-serif',
              }}
              placeholder="¿Qué está pasando?"
              disabled={isUploading}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 font-semibold transition-colors"
              style={{
                backgroundColor: '#3B9BC3',
                color: 'white',
                borderRadius: '25px',
                fontFamily: 'Poppins, sans-serif',
              }}
              disabled={isUploading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#73FFA2',
                color: '#2C3137',
                borderRadius: '25px',
                fontFamily: 'Poppins, sans-serif',
              }}
              disabled={isUploading || selectedFiles.length === 0}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#2C3137] border-t-transparent rounded-full animate-spin"></div>
                  Creando...
                </>
              ) : (
                'Crear Historia'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

