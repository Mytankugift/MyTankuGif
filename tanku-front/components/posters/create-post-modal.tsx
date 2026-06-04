'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import Image from 'next/image'
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { tankuModalBtnClass } from '@/lib/ui/tanku-modal-buttons'
import { NOTIFICATION_ROW_DIVIDER_STYLE } from '@/lib/notifications-display'
import {
  tankuOrderModalBackdropClass,
  tankuOrderModalDropzoneClass,
  tankuOrderModalInputClass,
  tankuOrderModalPanelClass,
  tankuVerticalModalPanelClass,
} from '@/lib/ui/tanku-modal-surface'

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
      className="fixed inset-0 isolate flex items-center justify-center p-3 sm:p-4"
      style={{ zIndex: 10050 }}
    >
      <div
        className={clsx(
          'absolute inset-0 transition-opacity duration-300',
          tankuOrderModalBackdropClass,
        )}
        style={{ opacity: enter ? 1 : 0 }}
        aria-hidden
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-post-title"
        className={clsx(
          'relative z-10 flex min-h-0 flex-none flex-col overflow-hidden',
          tankuOrderModalPanelClass,
          tankuVerticalModalPanelClass,
          'transition-[transform,opacity] duration-300 ease-out',
          enter
            ? 'translate-y-0 scale-100 opacity-100'
            : clsx(
                'opacity-0',
                'max-md:-translate-y-full max-md:scale-100',
                'md:-translate-y-6 md:scale-[0.97]',
              ),
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5"
          style={NOTIFICATION_ROW_DIVIDER_STYLE}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Image
              src="/icons_tanku/mobile_tanku_icono_nueva_historia.svg"
              alt=""
              width={20}
              height={20}
              className="h-[18px] w-[18px] shrink-0 object-contain"
              unoptimized
            />
            <h2
              id="create-post-title"
              className="truncate text-sm font-bold leading-tight text-[#66DEDB]"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Nueva publicación
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" strokeWidth={2} />
          </button>
        </header>

        <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 pb-3">
            <p className="text-center text-[10px] leading-snug text-gray-500">
              Comparte algo que te importa
            </p>

            {error ? (
              <div className="rounded-lg border border-red-400/30 bg-red-900/20 px-2 py-1 text-[10px] text-red-400">
                {error}
              </div>
            ) : null}

            <div>
              {!preview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={tankuOrderModalDropzoneClass}
                >
                  <PhotoIcon className="h-8 w-8 text-gray-500" />
                  <p className="mt-2 max-w-[85%] px-2 text-center text-[10px] leading-snug text-gray-500">
                    Imagen o video vertical
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative mx-auto aspect-[9/16] w-full max-h-[min(50vh,26rem)] overflow-hidden rounded-xl border border-[#414141] bg-black/40">
                    {isImage ? (
                      <Image
                        src={preview}
                        alt="Vista previa"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                    {isVideo ? (
                      <video src={preview} controls className="h-full w-full object-cover" />
                    ) : null}
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1.5 text-white hover:bg-black/90"
                      disabled={isUploading}
                      aria-label="Quitar archivo"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-center text-[10px] text-[#66DEDB] hover:text-[#73FFA2]"
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

            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={clsx(tankuOrderModalInputClass, 'resize-none')}
              placeholder="Nota opcional…"
              disabled={isUploading}
            />

            <div className="flex justify-center pt-1">
              <button
                type="submit"
                className={tankuModalBtnClass(
                  'primary',
                  'compact',
                  'inline-flex min-w-[6.5rem] items-center justify-center gap-1 px-5',
                )}
                disabled={isUploading || !selectedFile}
              >
                {isUploading ? (
                  <>
                    <div className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-[#262626] border-t-transparent" />
                    <span>Subiendo…</span>
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
