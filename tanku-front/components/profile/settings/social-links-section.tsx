'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import {
  SETTINGS_SOCIAL_PLATFORM_IDS,
  SOCIAL_PLATFORM_META,
} from '@/components/profile/social-links-display'
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

interface SocialLinksSectionProps {
  onUpdate?: () => void
  /** Sin tarjeta de ajustes; para panel flotante tipo notificaciones en el perfil */
  embedded?: boolean
  /** Alineado al modal de configuración (tarjetas oscuras) */
  design?: 'default' | 'settings'
}

const socialRowSettings =
  'flex items-center justify-between gap-2 rounded border border-white/[0.06] bg-[#1a1a1a] px-2 py-1.5'

export function SocialLinksSection({ onUpdate, embedded = false, design = 'default' }: SocialLinksSectionProps) {
  const isSettings = design === 'settings'
  const { user, checkAuth } = useAuthStore()
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Cargar redes sociales del usuario
  useEffect(() => {
    const loadSocialLinks = async () => {
      if (!user?.id) return
      try {
        const response = await apiClient.get<import('@/types/api-responses').UserProfileResponse>(API_ENDPOINTS.USERS.PROFILE.GET)
        console.log('📥 [SOCIAL LINKS] Respuesta del perfil:', response.data)
        if (response.success && response.data) {
          // socialLinks puede venir como array o como null/undefined
          const links = response.data.socialLinks || []
          console.log('📥 [SOCIAL LINKS] Redes sociales cargadas:', links)
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
      const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
        socialLinks: updatedLinks,
      })

      if (response.success) {
        setSocialLinks(updatedLinks)
        await checkAuth()
        if (onUpdate) {
          onUpdate()
        }
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
      const updatedLinks = socialLinks.filter(link => link.platform !== platform)
      const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
        socialLinks: updatedLinks,
      })

      if (response.success) {
        setSocialLinks(updatedLinks)
        await checkAuth()
        if (onUpdate) {
          onUpdate()
        }
      } else {
        setError(response.error?.message || 'Error al eliminar red social')
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar red social')
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
    p => !socialLinks.some(link => link.platform === p.id)
  )

  return (
    <div
      className={
        embedded
          ? 'space-y-4'
          : isSettings
            ? 'space-y-3 rounded-xl border border-[#73FFA2]/40 bg-[#0a0a0a] p-3 sm:p-4'
            : 'space-y-4 rounded-lg border-2 border-[#73FFA2] bg-transparent p-4 transition-colors hover:border-[#66DEDB]'
      }
    >
      {!embedded && (
        isSettings ? (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#73FFA2]">Redes sociales</h3>
              <p className="mb-2 mt-0.5 text-xs text-gray-500">Enlaces a tus perfiles.</p>
            </div>
            {availablePlatforms.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                disabled={isLoading}
                className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center self-start rounded border border-[#73FFA2]/40 bg-[#73FFA2]/10 text-[#73FFA2] transition hover:bg-[#73FFA2]/20 disabled:opacity-50"
                title="Agregar red"
                aria-label="Agregar red social"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <h3 className="mb-4 text-lg font-semibold text-[#73FFA2]">Redes Sociales</h3>
        )
      )}
      
      {error && (
        <div
          className={
            isSettings
              ? 'rounded border border-red-500/20 bg-red-900/10 px-2 py-1.5 text-xs text-red-400'
              : 'rounded border border-red-400/30 bg-red-900/20 px-4 py-2 text-sm text-red-400'
          }
        >
          {error}
        </div>
      )}

      {/* Lista de redes sociales */}
      <div className={isSettings ? 'space-y-1' : 'space-y-2'}>
        {socialLinks.length === 0 ? (
          <p
            className={
              isSettings
                ? 'rounded border border-white/[0.06] bg-[#1a1a1a] px-2 py-1.5 text-[11px] text-gray-500'
                : 'text-sm text-gray-400'
            }
          >
            {isSettings ? 'Ninguna red' : 'No has agregado ninguna red social'}
          </p>
        ) : (
          socialLinks.map((link) => {
            const platformInfo = getPlatformInfo(link.platform)
            return (
              <div
                key={link.platform}
                className={
                  isSettings
                    ? socialRowSettings
                    : `flex items-center justify-between rounded-lg p-2 ${embedded ? 'bg-white/[0.04]' : 'bg-gray-800/50'}`
                }
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                  {platformInfo && (
                    <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center overflow-visible sm:h-5 sm:w-5">
                      <Image
                        src={platformInfo.iconPath}
                        alt={platformInfo.name}
                        width={platformInfo.width ?? 20}
                        height={platformInfo.height ?? 20}
                        className={
                          platformInfo.width
                            ? isSettings
                              ? 'h-4 w-auto max-w-[28px] object-contain sm:h-5 sm:max-w-[32px]'
                              : 'h-6 w-auto max-w-[34px] object-contain'
                            : isSettings
                              ? 'h-4 w-4 object-contain sm:h-5 sm:w-5'
                              : 'h-6 w-6 object-contain'
                        }
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        isSettings
                          ? 'truncate text-[11px] font-medium text-white sm:text-xs'
                          : 'truncate text-sm font-medium text-white'
                      }
                    >
                      {platformInfo?.name || link.platform}
                    </p>
                    <p
                      className={
                        isSettings ? 'truncate text-[9px] text-gray-500 sm:text-[10px]' : 'truncate text-xs text-gray-400'
                      }
                    >
                      {link.url}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLink(link.platform)}
                  className={
                    isSettings
                      ? 'shrink-0 rounded p-0.5 text-red-400/90 transition hover:bg-red-500/10'
                      : 'rounded p-1.5 text-red-400 transition-colors hover:bg-red-900/20 hover:text-red-300'
                  }
                  title="Eliminar"
                >
                  <TrashIcon className={isSettings ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {!isSettings && availablePlatforms.length > 0 && (
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

      {/* Modal para agregar red social */}
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

