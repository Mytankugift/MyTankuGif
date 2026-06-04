'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CameraIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { getProfileCompletionPercent, getProfileMissingItems } from './profile-completion'
import { clsx } from 'clsx'

interface SettingsProfileSidebarProps {
  onViewMisTankus: () => void
}

/** Cierre de sesión: móvil al final del formulario; escritorio al pie de la columna izquierda, tras “Completa tu perfil”. */
export function SettingsModalLogoutButton({ className }: { className?: string }) {
  const { logout } = useAuthStore()
  const router = useRouter()
  return (
    <div className={clsx('w-full shrink-0 border-t border-white/10 pt-2', className)}>
      <button
        type="button"
        onClick={() => {
          logout()
          router.push('/')
        }}
        className="w-full rounded-full border border-red-500/50 bg-transparent py-2.5 text-center text-sm font-semibold text-red-400 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)] transition hover:bg-red-500/10"
      >
        Cerrar sesión
      </button>
    </div>
  )
}

export function SettingsProfileSidebar({ onViewMisTankus }: SettingsProfileSidebarProps) {
  const { user, checkAuth } = useAuthStore()
  const [uploading, setUploading] = useState(false)
  const [imgSrc, setImgSrc] = useState(user?.profile?.avatar || '')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setImgSrc(user?.profile?.avatar || '')
  }, [user?.profile?.avatar])

  const pct = useMemo(() => getProfileCompletionPercent(user), [user])
  const missing = useMemo(() => getProfileMissingItems(user), [user])
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || 'Usuario'

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !user?.id) return
      if (!file.type.startsWith('image/')) return
      if (file.size > 5 * 1024 * 1024) return
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('avatar', file)
        const token = useAuthStore.getState().token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
        const response = await fetch(`${API_URL}${API_ENDPOINTS.USERS.PROFILE_AVATAR}`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
          credentials: 'include',
        })
        const data = await response.json()
        if (data.success || response.ok) {
          await checkAuth()
        }
      } catch (err) {
        console.error('Error subiendo avatar:', err)
      } finally {
        setUploading(false)
        e.target.value = ''
      }
    },
    [user?.id, checkAuth]
  )

  if (!user) return null

  return (
    <aside
      className="flex w-full max-w-full shrink-0 flex-col overflow-visible rounded-lg border border-[#414141]/90 bg-black/20 p-2.5 max-md:pb-0 md:max-h-full md:min-h-0 md:max-w-[200px] md:shrink-0 md:overflow-hidden md:h-full"
    >
      <div className="relative mx-auto mb-2 w-[72px] shrink-0 sm:w-[80px]">
        <div className="relative h-[72px] w-[72px] overflow-hidden rounded-full border-2 border-[#73FFA2]/40 bg-[#1E1E1E] sm:h-[80px] sm:w-[80px]">
          {imgSrc ? (
            <Image src={imgSrc} alt="" fill className="object-cover" sizes="80px" unoptimized={imgSrc.startsWith('http')} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-500">
              {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#73FFA2] text-[#0d0d0d] shadow-md transition hover:brightness-95 disabled:opacity-50"
          title="Cambiar foto"
        >
          {uploading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0d0d0d] border-t-transparent" />
          ) : (
            <CameraIcon className="h-3 w-3" />
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <h3 className="text-center text-xs font-bold leading-tight text-white sm:text-sm">{displayName}</h3>
      <button
        type="button"
        onClick={onViewMisTankus}
        className="mt-1 text-center text-xs font-medium text-[#73FFA2] transition hover:underline"
      >
        Ver mis TANKUS
      </button>

      <div className="mt-2 min-h-0 border-t border-white/10 pt-2 md:flex md:min-h-0 md:flex-1 md:flex-col">
        <p className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Completa tu perfil
        </p>
        <div className="mt-1 flex shrink-0 items-center justify-between gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#2a2a2a]">
            <div
              className="h-full rounded-full bg-[#73FFA2] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold tabular-nums text-[#73FFA2]">{pct}%</span>
        </div>
        {missing.length > 0 && (
          <div className="mt-1.5 min-h-0 pr-0.5 text-[9px] leading-snug text-gray-400 max-md:max-h-none sm:text-[10px] md:max-h-40 md:flex-1 md:overflow-y-auto md:variant-selector-scrollbar">
            <p className="shrink-0 font-medium text-gray-500">Falta completar:</p>
            <ul className="mt-0.5 list-inside list-disc space-y-0.5 marker:text-[#73FFA2]/50">
              {missing.map((m) => (
                <li key={m} className="pl-0.5">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-2 hidden w-full shrink-0 md:block">
        <SettingsModalLogoutButton />
      </div>
    </aside>
  )
}
