/**
 * Tarjeta de sugerencia de amigo
 */

'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFriends } from '@/lib/hooks/use-friends'
import type { FriendSuggestionDTO } from '@/types/api'

interface SuggestionCardProps {
  suggestion: FriendSuggestionDTO
  onSendRequest: (friendId: string) => Promise<void>
}

export function SuggestionCard({ suggestion, onSendRequest }: SuggestionCardProps) {
  const router = useRouter()
  const { sendFriendRequest, blockUser } = useFriends()
  const [isSending, setIsSending] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [hovered, setHovered] = useState<'categories' | 'activities' | 'friends' | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSendRequest = async () => {
    setIsSending(true)
    try {
      await sendFriendRequest(suggestion.userId)
      await onSendRequest(suggestion.userId)
    } catch (error) {
      console.error('Error enviando solicitud:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleBlock = async () => {
    if (!confirm(`¿Estás seguro de que quieres bloquear a ${suggestion.user.firstName || 'este usuario'}? No aparecerá más en sugerencias.`)) {
      return
    }

    setIsBlocking(true)
    try {
      await blockUser(suggestion.userId)
      await onSendRequest(suggestion.userId) // Refrescar sugerencias
    } catch (error) {
      console.error('Error bloqueando usuario:', error)
    } finally {
      setIsBlocking(false)
      setIsMenuOpen(false)
    }
  }

  const fullName = `${suggestion.user.firstName || ''} ${suggestion.user.lastName || ''}`.trim() || 'Sin nombre'
  const initialAvatar = suggestion.user.profile?.avatar || ''
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'U')}&background=1E1E1E&color=73FFA2&size=128&bold=true`
  const [imgSrc, setImgSrc] = useState<string>(initialAvatar || fallbackAvatar)

  const getReasonText = () => {
    switch (suggestion.reason) {
      case 'mutual_friends':
        return suggestion.mutualFriendsCount
          ? `${suggestion.mutualFriendsCount} amigo${suggestion.mutualFriendsCount > 1 ? 's' : ''} en común`
          : 'Amigos en común'
      case 'similar_interests':
        return 'Intereses similares'
      case 'similar_activities':
        return 'Actividades similares'
      default:
        return 'Te puede interesar'
    }
  }

  const hasCommonInterests =
    (suggestion.commonCategories && suggestion.commonCategories.length > 0) ||
    (suggestion.commonActivities && suggestion.commonActivities.length > 0)

  const hasMutualFriends = suggestion.mutualFriendsCount !== undefined && suggestion.mutualFriendsCount > 0

  const categoriesCount = suggestion.commonCategories?.length || 0
  const activitiesCount = suggestion.commonActivities?.length || 0
  const mutualCount = suggestion.mutualFriendsCount || 0

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-[#73FFA2]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#73FFA2]/10 relative">
      {/* Menú de 3 puntos en esquina superior derecha */}
      <div className="absolute top-3 right-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsMenuOpen(!isMenuOpen)
          }}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          aria-label="Más opciones"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400"
          >
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </button>

        {/* Dropdown menu */}
        {isMenuOpen && (
          <>
            {/* Overlay para cerrar al hacer clic fuera */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsMenuOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20">
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  setIsMenuOpen(false)
                  await handleBlock()
                }}
                disabled={isBlocking}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              >
                {isBlocking ? 'Bloqueando...' : '🚫 Bloquear usuario'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-5">
        {/* Imagen grande a la izquierda - clickeable */}
        <button
          onClick={() => router.push(suggestion.user.username ? `/profile/${suggestion.user.username}` : `/profile/${suggestion.userId}`)}
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 border-2 border-gray-700 hover:border-[#73FFA2]/50 transition-colors cursor-pointer"
        >
          <Image
            src={imgSrc}
            alt={fullName}
            width={128}
            height={128}
            className="object-cover w-full h-full"
            onError={(e) => {
              if (imgSrc !== fallbackAvatar) {
                setImgSrc(fallbackAvatar)
              } else {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }
            }}
            referrerPolicy="no-referrer"
            unoptimized
          />
        </button>

        {/* Información a la derecha */}
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          {/* Username primero (sin @), luego nombre y razón - clickeable */}
          <div>
            <button
              onClick={() => router.push(suggestion.user.username ? `/profile/${suggestion.user.username}` : `/profile/${suggestion.userId}`)}
              className="text-left"
            >
              {suggestion.user.username ? (
                <>
                  <h3 className="text-white font-semibold text-lg mb-0.5 hover:text-[#73FFA2] transition-colors">
                    {suggestion.user.username}
                  </h3>
                  {fullName && fullName !== 'Sin nombre' && (
                    <p className="text-sm text-gray-400 mb-1">{fullName}</p>
                  )}
                </>
              ) : (
                <h3 className="text-white font-semibold text-lg mb-1 hover:text-[#73FFA2] transition-colors">
                  {fullName}
                </h3>
              )}
            </button>
            <p className="text-[#73FFA2] text-sm font-medium">{getReasonText()}</p>
          </div>

          {/* Líneas compactas con +N y tooltip */}
          <div className="space-y-1.5">
            {hasMutualFriends && (
              <div
                className="relative inline-block"
                onMouseEnter={() => setHovered('friends')}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="text-sm text-gray-300 cursor-help hover:text-white transition-colors">
                  {mutualCount === 1
                  ? `1 amigo en común`
                  : `${mutualCount} amigos en común`}
                </span>
                {hovered === 'friends' && suggestion.mutualFriendNames && (
                  <div className="absolute z-10 bottom-full left-0 mb-2 p-2 bg-gray-900 border border-[#73FFA2]/50 rounded-lg shadow-xl min-w-[180px]">
                    <p className="text-xs text-gray-400 mb-1.5 font-medium">Amigos en común:</p>
                    <ul className="text-xs text-gray-300 list-disc pl-4 space-y-0.5 max-h-40 overflow-auto custom-scrollbar">
                      {suggestion.mutualFriendNames.map((name, idx) => (
                        <li key={idx}>{name}</li>
                      ))}
                    </ul>
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-gray-900 border-r border-b border-[#73FFA2]/50 transform rotate-45"></div>
                  </div>
                )}
              </div>
            )}

            {categoriesCount > 0 && (
              <div
                className="relative inline-block ml-0"
                onMouseEnter={() => setHovered('categories')}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="text-sm text-gray-300 cursor-help hover:text-white transition-colors">
                {categoriesCount === 1
                  ? `1 categoría en común`
                  : `${categoriesCount} categorías en común`}
                </span>
                {hovered === 'categories' && suggestion.commonCategories && (
                  <div className="absolute z-10 bottom-full left-0 mb-2 p-2 bg-gray-900 border border-[#73FFA2]/50 rounded-lg shadow-xl min-w-[180px]">
                    <p className="text-xs text-gray-400 mb-1.5 font-medium">Todas las categorías:</p>
                    <div className="flex flex-wrap gap-1 max-h-40 overflow-auto custom-scrollbar">
                      {suggestion.commonCategories.map((cat, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-[#73FFA2]/20 text-[#73FFA2] rounded"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-gray-900 border-r border-b border-[#73FFA2]/50 transform rotate-45"></div>
                  </div>
                )}
              </div>
            )}

            {activitiesCount > 0 && (
              <div
                className="relative inline-block ml-0"
                onMouseEnter={() => setHovered('activities')}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="text-sm text-gray-300 cursor-help hover:text-white transition-colors">
                  {activitiesCount === 1
                  ? `1 actividad en común`
                  : `${activitiesCount} actividades en común`}
                </span>
                {hovered === 'activities' && suggestion.commonActivities && (
                  <div className="absolute z-10 bottom-full left-0 mb-2 p-2 bg-gray-900 border border-[#66DEDB]/50 rounded-lg shadow-xl min-w-[180px]">
                    <p className="text-xs text-gray-400 mb-1.5 font-medium">Todas las actividades:</p>
                    <div className="flex flex-wrap gap-1 max-h-40 overflow-auto custom-scrollbar">
                      {suggestion.commonActivities.map((act, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-[#66DEDB]/20 text-[#66DEDB] rounded"
                        >
                          {act}
                        </span>
                      ))}
                    </div>
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-gray-900 border-r border-b border-[#66DEDB]/50 transform rotate-45"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botón de acción - ahora ocupa todo el ancho */}
          <div className="mt-auto">
            <button
              onClick={handleSendRequest}
              disabled={isSending || isBlocking}
              className="w-full px-4 py-2.5 text-sm bg-[#73FFA2] text-gray-900 font-semibold rounded-lg hover:bg-[#66DEDB] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:shadow-[#73FFA2]/20"
            >
              {isSending ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

