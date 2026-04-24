'use client'

import { useState } from 'react'
import { LinkIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { NOTIFICATION_ROW_DIVIDER_STYLE } from '@/lib/notifications-display'
import { TankuCustomSelect } from '@/components/ui/tanku-custom-select'

type SocialLink = {
  platform: string
  url: string
}

export type SocialPlatformPickOption = {
  id: string
  name: string
}

interface AddSocialLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (link: SocialLink) => Promise<void>
  availablePlatforms: SocialPlatformPickOption[]
  isLoading?: boolean
}

function userPlaceholder(platform: string): string {
  switch (platform) {
    case 'youtube':
      return 'Ej. Rame-0712 o @Rame-0712'
    case 'tiktok':
      return 'Usuario o @usuario'
    case 'instagram':
      return 'Tu usuario de Instagram'
    case 'twitter':
    case 'x':
      return '@usuario o usuario'
    case 'facebook':
      return 'Nombre de usuario o página'
    case 'linkedin':
      return 'slug de tu perfil (/in/…)'
    default:
      return 'Usuario o @'
  }
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

  const platformOptions = [
    { value: '', label: 'Selecciona una plataforma' },
    ...availablePlatforms.map((p) => ({ value: p.id, label: p.name })),
  ]

  const handleAdd = async () => {
    if (!newLink.platform || !newLink.url.trim()) {
      setError('Selecciona plataforma e indica tu usuario o perfil')
      return
    }

    setError(null)
    try {
      await onAdd({ platform: newLink.platform, url: newLink.url.trim() })
      setNewLink({ platform: '', url: '' })
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  const handleClose = () => {
    setNewLink({ platform: '', url: '' })
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className="relative flex w-full max-w-md max-h-[min(90vh,560px)] flex-col overflow-hidden rounded-xl border border-[#414141] shadow-2xl"
        style={{ backgroundColor: '#171B21' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b p-4" style={NOTIFICATION_ROW_DIVIDER_STYLE}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <LinkIcon className="h-7 w-7 shrink-0 text-[#73FFA2]" aria-hidden />
              <h2 className="truncate text-base font-semibold text-white">Agregar red social</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          {error && (
            <div className="rounded border border-red-400/30 bg-red-900/20 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <TankuCustomSelect
            label="Plataforma"
            labelId="platform-label"
            placeholder="Selecciona una plataforma"
            value={newLink.platform}
            onChange={(v) => {
              setNewLink({ ...newLink, platform: v })
              setError(null)
            }}
            options={platformOptions}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Usuario o @ de tu perfil
            </label>
            <input
              type="text"
              autoComplete="off"
              value={newLink.url}
              onChange={(e) => {
                setNewLink({ ...newLink, url: e.target.value })
                setError(null)
              }}
              placeholder={userPlaceholder(newLink.platform)}
              className="w-full rounded-full border border-[#414141] bg-[#0f1218] px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-[#73FFA2] focus:outline-none focus:ring-2 focus:ring-[#73FFA2]/25"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  void handleAdd()
                }
              }}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              No hace falta pegar la URL completa; guardamos el enlace correcto automáticamente.
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-[#414141] p-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 rounded-full border border-[#414141] bg-white/[0.06] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={isLoading || !newLink.platform || !newLink.url.trim()}
              className="flex-1 rounded-full px-4 py-2.5 font-semibold text-black shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, #73FFA2 0%, #1A485C 100%)' }}
            >
              {isLoading ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
