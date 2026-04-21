'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import Image from 'next/image'
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'

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

  const [mounted, setMounted] = useState(false)
  const [enter, setEnter] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setEnter(false)
      return
    }
    setEnter(false)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEnter(true))
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  React.useEffect(() => {
    if (!isOpen) {
      setDescription('')
      setSelectedFile(null)
      setPreview(null)
      setError(null)
    }
  }, [isOpen])

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

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Por favor selecciona una imagen o video válido')
      return
    }

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

    if (!selectedFile) {
      setError('Se requiere al menos una imagen o video')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('title', '')
      formData.append('description', description.trim())
      formData.append('files', selectedFile)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
      const response = await fetch(`${API_URL}${API_ENDPOINTS.POSTERS.CREATE}`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        onClose()
        if (onPostCreated) {
          onPostCreated()
        }
      } else {
        setError(data.error?.message || data.message || 'Error al crear el post')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el post')
    } finally {
      setIsUploading(false)
    }
  }

  const isImage = selectedFile?.type.startsWith('image/')
  const isVideo = selectedFile?.type.startsWith('video/')

  if (!isOpen || !mounted) return null

  const modal = (
    <div
      className="fixed inset-0 isolate flex items-center justify-center p-3 sm:p-4 md:p-6"
      style={{ zIndex: 10050 }}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: enter ? 1 : 0 }}
        aria-hidden
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-post-title"
        className={clsx(
          'relative z-10 flex min-h-0 w-full flex-col overflow-hidden rounded-[22px] border-2 border-[#73FFA2] bg-[#2C3137] shadow-2xl transition-[transform,opacity] duration-300 ease-out',
          /* Misma caja que «Nueva historia»: móvil / tablet / desktop */
          'max-h-[min(92dvh,620px)] max-w-[min(100%,22rem)] sm:max-w-md md:max-h-[min(88vh,720px)] md:max-w-lg lg:max-w-xl',
          enter
            ? 'translate-y-0 scale-100 opacity-100'
            : clsx(
                'opacity-0',
                'max-md:-translate-y-full max-md:scale-100',
                'md:-translate-y-8 md:scale-[0.96]'
              )
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-5 md:py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 md:gap-3">
            <Image
              src="/icons_tanku/mobile_tanku_icono_nueva_historia.svg"
              alt=""
              width={22}
              height={22}
              className="h-[19px] w-[19px] shrink-0 object-contain md:h-[22px] md:w-[22px]"
              unoptimized
            />
            <h2
              id="create-post-title"
              className="truncate text-lg font-bold leading-tight md:text-xl"
              style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}
            >
              Nueva publicación
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 md:h-9 md:w-9"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-7 w-7 md:h-6 md:w-6" strokeWidth={2} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col space-y-2.5 p-3 pb-4 max-md:space-y-2 md:space-y-6 md:p-5 md:pb-6"
          >
            <p
              className="text-[11px] leading-snug md:text-[15px]"
              style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
            >
              Comparte algo que te importa
            </p>

            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-900/20 px-2.5 py-1.5 text-[11px] text-red-400 md:px-4 md:py-2 md:text-sm">
                {error}
              </div>
            )}

            <div>
              {!preview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square w-full max-w-full cursor-pointer items-center justify-center transition-colors md:aspect-auto md:min-h-[220px]"
                  style={{
                    backgroundColor: '#2C3137',
                    border: '2px dashed #66DEDB',
                    borderRadius: '25px',
                  }}
                >
                  <div className="flex max-w-[90%] flex-col items-center gap-2 px-3 py-4 text-center md:max-w-none md:gap-3 md:px-6 md:py-8">
                    <PhotoIcon className="h-10 w-10 md:h-12 md:w-12" style={{ color: '#9CA3AF' }} />
                    <p
                      className="text-xs leading-snug md:text-sm"
                      style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif' }}
                    >
                      Agrega una imagen o video. Algo que te ayude a sentir lo que quieres decir.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative space-y-2">
                  {isImage && (
                    <div className="relative w-full overflow-hidden rounded-[25px]">
                      <Image
                        src={preview}
                        alt="Preview"
                        width={800}
                        height={600}
                        className="h-auto max-h-28 w-full object-contain md:max-h-96"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white transition-colors hover:bg-black/90"
                        disabled={isUploading}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  {isVideo && (
                    <div className="relative w-full overflow-hidden rounded-[25px]">
                      <video src={preview} controls className="max-h-28 h-auto w-full md:max-h-96" />
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white transition-colors hover:bg-black/90"
                        disabled={isUploading}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs transition-colors md:text-sm"
                    style={{ color: '#73FFA2' }}
                    disabled={isUploading}
                  >
                    Cambiar archivo
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
            </div>

            <div>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl px-2.5 py-1.5 text-xs leading-snug text-white placeholder-gray-400 focus:outline-none md:rounded-[25px] md:px-4 md:py-3 md:text-base md:leading-normal"
                style={{
                  backgroundColor: '#2C3137',
                  border: '2px solid #66DEDB',
                  fontFamily: 'Poppins, sans-serif',
                }}
                placeholder="Si quieres decir algo más, este es el lugar. A veces, unas palabras lo cambian todo."
                disabled={isUploading}
              />
            </div>

            <div className="flex gap-2 pt-2 max-md:gap-1.5 md:gap-3">
              <button
                type="button"
                onClick={onClose}
                className={clsx(
                  'flex min-h-0 flex-1 shrink items-center justify-center rounded-[25px] font-semibold transition-colors whitespace-nowrap',
                  'border-2 border-[#73FFA2] px-2 py-2 text-[11px] leading-none sm:text-xs md:px-4 md:py-3 md:text-base'
                )}
                style={{
                  backgroundColor: '#262626',
                  color: '#F4F4F4',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: 'inset 0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                }}
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={clsx(
                  'flex min-h-0 flex-1 shrink items-center justify-center gap-1 rounded-[25px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap',
                  'px-2 py-2 text-[11px] leading-none sm:text-xs md:gap-2 md:px-4 md:py-3 md:text-base'
                )}
                style={{
                  backgroundColor: '#73FFA2',
                  color: '#262626',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: 'inset 0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                }}
                disabled={isUploading || !selectedFile}
              >
                {isUploading ? (
                  <>
                    <div className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-[#262626] border-t-transparent md:h-4 md:w-4" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  'Publicar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
