'use client'

import React, { useState, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import Image from 'next/image'
import { XMarkIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated?: () => void
}

export function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { token } = useAuthStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Resetear formulario cuando se cierra
  React.useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setDescription('')
      setSelectedFile(null)
      setPreview(null)
      setError(null)
    }
  }, [isOpen])

  // Generar preview cuando se selecciona un archivo
  React.useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }, [selectedFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Por favor selecciona una imagen o video válido')
      return
    }

    // Validar tamaño (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('El archivo debe ser menor a 50MB')
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!title?.trim() && !description?.trim()) {
      setError('Se requiere al menos un título o descripción')
      return
    }

    if (!selectedFile) {
      setError('Se requiere al menos una imagen o video')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('files', selectedFile) // El backend espera 'files' (array)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
      const response = await fetch(`${API_URL}${API_ENDPOINTS.POSTERS.CREATE}`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Éxito: cerrar modal y recargar
        onClose()
        if (onPostCreated) {
          onPostCreated()
        }
      } else {
        setError(data.error?.message || data.message || 'Error al crear el post')
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear el post')
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  const isImage = selectedFile?.type.startsWith('image/')
  const isVideo = selectedFile?.type.startsWith('video/')

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Crear Nuevo Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isUploading}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error message */}
          {error && (
            <div className="bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Título */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Título (opcional)
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#73FFA2] focus:border-transparent"
              placeholder="Escribe un título..."
              disabled={isUploading}
            />
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#73FFA2] focus:border-transparent resize-none"
              placeholder="Comparte algo con la comunidad..."
              disabled={isUploading}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Imagen o Video (requerido)
            </label>
            {!preview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-[#73FFA2] transition-colors"
              >
                <div className="flex flex-col items-center gap-2">
                  <PhotoIcon className="w-12 h-12 text-gray-500" />
                  <p className="text-gray-400 text-sm">
                    Haz clic para seleccionar una imagen o video
                  </p>
                  <p className="text-gray-500 text-xs">Máximo 50MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            ) : (
              <div className="relative">
                {isImage && (
                  <div className="relative w-full rounded-lg overflow-hidden border border-gray-700">
                    <Image
                      src={preview}
                      alt="Preview"
                      width={800}
                      height={600}
                      className="w-full h-auto max-h-96 object-contain"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 transition-colors"
                      disabled={isUploading}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
                {isVideo && (
                  <div className="relative w-full rounded-lg overflow-hidden border border-gray-700">
                    <video
                      src={preview}
                      controls
                      className="w-full h-auto max-h-96"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 transition-colors"
                      disabled={isUploading}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-sm text-[#73FFA2] hover:text-[#66e891] transition-colors"
                  disabled={isUploading}
                >
                  Cambiar archivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              disabled={isUploading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#73FFA2] hover:bg-[#66e891] text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isUploading || (!title?.trim() && !description?.trim()) || !selectedFile}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  Subiendo...
                </>
              ) : (
                'Publicar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

