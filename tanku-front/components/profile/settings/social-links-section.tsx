'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { PlusIcon, TrashIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import {
  SETTINGS_SOCIAL_PLATFORM_IDS,
  SOCIAL_PLATFORM_META,
} from '@/components/profile/social-links-display'
import { tankuSettingsSectionShellClass } from '@/lib/tanku-modal-panel'
import { AddSocialLinkModal } from './add-social-link-modal'

type SocialLink = {
  platform: string
  url: string
}

const AVAILABLE_PLATFORMS = SETTINGS_SOCIAL_PLATFORM_IDS.map((id) => ({
  id,
  name: SOCIAL_PLATFORM_META[id].name,
  iconPath: SOCIAL_PLATFORM_META[id].iconPath,
  width: SOCIAL_PLATFORM_META[id].width,
  height: SOCIAL_PLATFORM_META[id].height,
}))

const addLinkBtnSettings =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[20px] border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs font-medium text-[#73FFA2] transition hover:border-[#73FFA2]/30 hover:bg-[#73FFA2]/10 disabled:opacity-50'

interface SocialLinksSectionProps {
  onUpdate?: () => void
  embedded?: boolean
  design?: 'default' | 'settings'
}

function displayHandle(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    const path = u.pathname.replace(/^\/+|\/+$/g, '')
    if (path) return path.length > 36 ? `${path.slice(0, 34)}…` : path
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url.length > 40 ? `${url.slice(0, 38)}…` : url
  }
}

export function SocialLinksSection({ onUpdate, embedded = false, design = 'default' }: SocialLinksSectionProps) {
  const isSettings = design === 'settings'
  const { user, checkAuth } = useAuthStore()
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    const loadSocialLinks = async () => {
      if (!user?.id) return
      try {
        const response = await apiClient.get<import('@/types/api-responses').UserProfileResponse>(
          API_ENDPOINTS.USERS.PROFILE.GET,
        )
        if (response.success && response.data) {
          const links = response.data.socialLinks || []
          setSocialLinks(Array.isArray(links) ? links : [])
        } else {
          setSocialLinks([])
        }
      } catch (err) {
        console.error('Error cargando redes sociales:', err)
        setSocialLinks([])
      }
    }
    loadSocialLinks()
  }, [user?.id])

  const handleAddLink = async (newLink: SocialLink) => {
    setIsLoading(true)
    setError(null)

    try {
      if (socialLinks.some((link) => link.platform === newLink.platform)) {
        const msg = 'Ya tienes esta plataforma agregada'
        setError(msg)
        throw new Error(msg)
      }

      const updatedLinks = [...socialLinks, newLink]
      const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(
        API_ENDPOINTS.USERS.PROFILE.UPDATE,
        { socialLinks: updatedLinks },
      )

      if (response.success) {
        setSocialLinks(updatedLinks)
        await checkAuth()
        onUpdate?.()
      } else {
        const msg = response.error?.message || 'Error al agregar red social'
        setError(msg)
        throw new Error(msg)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al agregar red social'
      setError(msg)
      throw err instanceof Error ? err : new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveLink = async (platform: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const updatedLinks = socialLinks.filter((link) => link.platform !== platform)
      const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(
        API_ENDPOINTS.USERS.PROFILE.UPDATE,
        { socialLinks: updatedLinks },
      )

      if (response.success) {
        setSocialLinks(updatedLinks)
        await checkAuth()
        onUpdate?.()
      } else {
        setError(response.error?.message || 'Error al eliminar red social')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar red social')
    } finally {
      setIsLoading(false)
    }
  }

  const getPlatformInfo = (platformId: string) => {
    const meta = SOCIAL_PLATFORM_META[platformId]
    if (!meta) return undefined
    return {
      id: platformId,
      name: meta.name,
      iconPath: meta.iconPath,
      width: meta.width,
      height: meta.height,
    }
  }

  const availablePlatforms = AVAILABLE_PLATFORMS.filter(
    (p) => !socialLinks.some((link) => link.platform === p.id),
  )

  const shellClass = embedded
    ? 'space-y-4'
    : isSettings
      ? tankuSettingsSectionShellClass
      : 'space-y-4 rounded-lg border-2 border-[#73FFA2] bg-transparent p-4 transition-colors hover:border-[#66DEDB]'

  const renderSettingsContent = () => (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[#73FFA2]">Redes sociales</h3>
          <p className="mt-0.5 text-xs text-gray-500">Enlaces visibles en tu perfil público.</p>
        </div>
        {availablePlatforms.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={isLoading}
            className={addLinkBtnSettings}
            title="Agregar red"
            aria-label="Agregar red social"
          >
            <PlusIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-[20px] border border-red-500/20 bg-red-900/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {socialLinks.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#414141] bg-black/15 px-4 py-8 text-center">
          <p className="text-sm text-gray-400">Aún no has conectado ninguna red</p>
          <p className="mt-1 text-xs text-gray-500">Instagram, TikTok, YouTube y más</p>
          {availablePlatforms.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              disabled={isLoading}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-black shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)] transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, #73FFA2 0%, #1A485C 100%)' }}
            >
              <PlusIcon className="h-4 w-4" />
              Agregar red social
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {socialLinks.map((link) => {
            const platformInfo = getPlatformInfo(link.platform)
            const href = link.url.startsWith('http') ? link.url : `https://${link.url}`

            return (
              <div
                key={link.platform}
                className="group flex min-w-0 items-center gap-2 rounded-[20px] border border-[#414141]/70 bg-black/25 p-2 pl-2.5"
              >
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2.5"
                  title={`Abrir ${platformInfo?.name || link.platform}`}
                >
                  {platformInfo && (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-black/30">
                      <Image
                        src={platformInfo.iconPath}
                        alt=""
                        width={platformInfo.width ?? 22}
                        height={platformInfo.height ?? 22}
                        className={
                          platformInfo.width
                            ? 'h-5 w-auto max-w-[28px] object-contain'
                            : 'h-5 w-5 object-contain'
                        }
                        unoptimized
                      />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {platformInfo?.name || link.platform}
                    </span>
                    <span className="block truncate text-xs text-gray-500">{displayHandle(link.url)}</span>
                  </span>
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-gray-500 opacity-0 transition group-hover:opacity-100" />
                </a>
                <button
                  type="button"
                  onClick={() => handleRemoveLink(link.platform)}
                  disabled={isLoading}
                  className="shrink-0 rounded-[14px] border border-transparent p-1.5 text-red-400/90 transition hover:border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
                  title="Eliminar"
                  aria-label={`Eliminar ${platformInfo?.name || link.platform}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {socialLinks.length > 0 && availablePlatforms.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-[#414141] bg-black/10 py-2.5 text-sm text-[#66DEDB] transition hover:border-[#66DEDB]/50 hover:bg-black/20 disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          Agregar otra red
        </button>
      )}
    </>
  )

  const renderDefaultContent = () => (
    <>
      {!embedded && <h3 className="mb-4 text-lg font-semibold text-[#73FFA2]">Redes Sociales</h3>}

      {error && (
        <div className="rounded border border-red-400/30 bg-red-900/20 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {socialLinks.length === 0 ? (
          <p className="text-sm text-gray-400">No has agregado ninguna red social</p>
        ) : (
          socialLinks.map((link) => {
            const platformInfo = getPlatformInfo(link.platform)
            return (
              <div
                key={link.platform}
                className={`flex items-center justify-between rounded-lg p-2 ${embedded ? 'bg-white/[0.04]' : 'bg-gray-800/50'}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {platformInfo && (
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                      <Image
                        src={platformInfo.iconPath}
                        alt={platformInfo.name}
                        width={platformInfo.width ?? 20}
                        height={platformInfo.height ?? 20}
                        className={
                          platformInfo.width
                            ? 'h-6 w-auto max-w-[34px] object-contain'
                            : 'h-6 w-6 object-contain'
                        }
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {platformInfo?.name || link.platform}
                    </p>
                    <p className="truncate text-xs text-gray-400">{link.url}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLink(link.platform)}
                  className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-900/20 hover:text-red-300"
                  title="Eliminar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {availablePlatforms.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-black shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg, #73FFA2 0%, #1A485C 100%)' }}
        >
          <PlusIcon className="h-4 w-4" />
          Agregar red social
        </button>
      )}
    </>
  )

  return (
    <div className={shellClass}>
      {isSettings && !embedded ? renderSettingsContent() : renderDefaultContent()}

      <AddSocialLinkModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddLink}
        availablePlatforms={availablePlatforms}
        isLoading={isLoading}
      />
    </div>
  )
}
