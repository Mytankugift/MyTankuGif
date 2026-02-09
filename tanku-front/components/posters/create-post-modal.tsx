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
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Resetear formulario cuando se cierra
  React.useEffect(() => {
    if (!isOpen) {
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
    if (!selectedFile) {
      setError('Se requiere al menos una imagen o video')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('title', '') // Título vacío ya que no se usa
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
              Nueva Publicación
            </h2>
            <p 
              className="text-base"
              style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
            >
              Comparte algo que te importa
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
            {!preview ? (
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
                    Agrega una imagen o video. Algo que te ayude a sentir lo que quieres decir.
                  </p>
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
                  <div className="relative w-full rounded-[25px] overflow-hidden">
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
                  <div className="relative w-full rounded-[25px] overflow-hidden">
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
                  className="mt-2 text-sm transition-colors"
                  style={{ color: '#73FFA2' }}
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

          {/* Descripción - Segundo */}
          <div>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-4 text-white placeholder-gray-400 focus:outline-none resize-none"
              style={{
                backgroundColor: '#2C3137',
                border: '2px solid #66DEDB',
                borderRadius: '25px',
                fontFamily: 'Poppins, sans-serif',
              }}
              placeholder="Si quieres decir algo más, este es el lugar. A veces, unas palabras lo cambian todo."
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
              disabled={isUploading || !selectedFile}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#2C3137] border-t-transparent rounded-full animate-spin"></div>
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

