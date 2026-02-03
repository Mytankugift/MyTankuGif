'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { AddSocialLinkModal } from './add-social-link-modal'

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

interface SocialLinksSectionProps {
  onUpdate?: () => void
}

export function SocialLinksSection({ onUpdate }: SocialLinksSectionProps) {
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
    // Verificar que no exista ya esta plataforma
    if (socialLinks.some(link => link.platform === newLink.platform)) {
      setError('Ya tienes esta plataforma agregada')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
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
        setError(response.error?.message || 'Error al agregar red social')
      }
    } catch (err: any) {
      setError(err.message || 'Error al agregar red social')
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
    return AVAILABLE_PLATFORMS.find(p => p.id === platformId)
  }

  const availablePlatforms = AVAILABLE_PLATFORMS.filter(
    p => !socialLinks.some(link => link.platform === p.id)
  )

  return (
    <div className="bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors space-y-4">
      <h3 className="text-lg font-semibold text-[#73FFA2] mb-4">Redes Sociales</h3>
      
      {error && (
        <div className="bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Lista de redes sociales */}
      <div className="space-y-2">
        {socialLinks.length === 0 ? (
          <p className="text-gray-400 text-sm">No has agregado ninguna red social</p>
        ) : (
          socialLinks.map((link) => {
            const platformInfo = getPlatformInfo(link.platform)
            return (
              <div
                key={link.platform}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {platformInfo && (
                    <div className={`w-6 h-6 rounded-full ${platformInfo.color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xs font-bold">{platformInfo.icon}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{platformInfo?.name || link.platform}</p>
                    <p className="text-gray-400 text-xs truncate">{link.url}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveLink(link.platform)}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                  title="Eliminar"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Botón discreto para agregar red social */}
      {availablePlatforms.length > 0 && (
        <button
          onClick={() => setShowAddModal(true)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-4 h-4" />
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

