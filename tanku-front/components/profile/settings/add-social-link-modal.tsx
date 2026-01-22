'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

type SocialLink = {
  platform: string
  url: string
}

const AVAILABLE_PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: 'f', color: 'bg-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: 'ig', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  { id: 'twitter', name: 'Twitter', icon: '🐦', color: 'bg-blue-400' },
  { id: 'youtube', name: 'YouTube', icon: '▶', color: 'bg-red-600' },
  { id: 'tiktok', name: 'TikTok', icon: '♪', color: 'bg-black' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: 'bg-blue-700' },
]

interface AddSocialLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (link: SocialLink) => Promise<void>
  availablePlatforms: typeof AVAILABLE_PLATFORMS
  isLoading?: boolean
}

export function AddSocialLinkModal({
  isOpen,
  onClose,
  onAdd,
  availablePlatforms,
  isLoading = false,
}: AddSocialLinkModalProps) {
  const [newLink, setNewLink] = useState({ platform: '', url: '' })
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAdd = async () => {
    if (!newLink.platform || !newLink.url) {
      setError('Por favor completa todos los campos')
      return
    }

    // Validar URL
    try {
      new URL(newLink.url)
    } catch {
      setError('Por favor ingresa una URL válida')
      return
    }

    setError(null)
    await onAdd({ ...newLink })
    
    // Limpiar formulario y cerrar
    setNewLink({ platform: '', url: '' })
    onClose()
  }

  const handleClose = () => {
    setNewLink({ platform: '', url: '' })
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 rounded-xl shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-[#73FFA2]">Agregar Red Social</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Plataforma</label>
            <select
              value={newLink.platform}
              onChange={(e) => {
                setNewLink({ ...newLink, platform: e.target.value })
                setError(null)
              }}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB]"
            >
              <option value="">Selecciona una plataforma</option>
              {availablePlatforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">URL</label>
            <input
              type="url"
              value={newLink.url}
              onChange={(e) => {
                setNewLink({ ...newLink, url: e.target.value })
                setError(null)
              }}
              placeholder="https://..."
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleAdd()
                }
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-700">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={isLoading || !newLink.platform || !newLink.url}
            className="flex-1 px-4 py-2 bg-[#73FFA2] hover:bg-[#66DEDB] text-gray-900 font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
      </div>

      {/* Overlay para cerrar al hacer clic fuera */}
      <div
        className="absolute inset-0 -z-10"
        onClick={handleClose}
      />
    </div>
  )
}

