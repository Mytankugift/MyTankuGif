/**
 * Tarjeta individual de amigo
 */

'use client'

import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFriends } from '@/lib/hooks/use-friends'
import type { FriendDTO } from '@/types/api'

interface FriendCardProps {
  friend: FriendDTO
  onRefresh: () => void
  groups: Array<{ id: string; name: string }> // ✅ Grupos ya resueltos, sin fetch
}

export function FriendCard({ friend, onRefresh, groups }: FriendCardProps) {
  const router = useRouter()
  const { removeFriend, blockUser } = useFriends()
  const [isRemoving, setIsRemoving] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  // ✅ Sin fetch, sin listeners, sin efectos - Solo UI


  const handleRemove = async () => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${friend.friend.firstName || 'este amigo'}?`)) {
      return
    }

    setIsRemoving(true)
    try {
      await removeFriend(friend.friendId)
      onRefresh()
    } catch (error) {
      console.error('Error eliminando amigo:', error)
    } finally {
      setIsRemoving(false)
    }
  }

  const handleBlock = async () => {
    if (!confirm(`¿Estás seguro de que quieres bloquear a ${friend.friend.firstName || 'este usuario'}?`)) {
      return
    }

    setIsBlocking(true)
    try {
      await blockUser(friend.friendId)
      setIsMenuOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Error bloqueando usuario:', error)
    } finally {
      setIsBlocking(false)
    }
  }

  const fullName = `${friend.friend.firstName || ''} ${friend.friend.lastName || ''}`.trim() || 'Sin nombre'
  const initialAvatar = friend.friend.profile?.avatar || ''
  const [imgSrc, setImgSrc] = useState<string>(initialAvatar)

  return (
    <div className="relative rounded-lg p-3 border border-[#66DEDB] transition-all hover:border-[#73FFA2]">
      {/* Menú de 3 puntos en esquina superior derecha */}
      <div className="absolute top-2 right-2 z-10">
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

      <div className="flex gap-3">
        {/* Avatar cuadrado con bordes redondeados - clickeable */}
        <button
          onClick={() => router.push(friend.friend.username ? `/profile/${friend.friend.username}` : `/profile/${friend.friendId}`)}
          className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden flex-shrink-0 border border-[#66DEDB] bg-gray-700 flex items-center justify-center hover:border-[#73FFA2] transition-colors cursor-pointer"
        >
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={fullName}
              width={128}
              height={128}
              className="object-cover w-full h-full"
              onError={(e) => {
                setImgSrc('')
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
              referrerPolicy="no-referrer"
              unoptimized={imgSrc.startsWith('http')}
            />
          ) : (
            <span className="text-2xl text-gray-400 font-bold">
              {(friend.friend.firstName?.[0] || friend.friend.email?.[0] || 'U').toUpperCase()}
            </span>
          )}
        </button>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          {/* Username primero (sin @), luego nombre - clickeable */}
          <button
            onClick={() => router.push(friend.friend.username ? `/profile/${friend.friend.username}` : `/profile/${friend.friendId}`)}
            className="text-left"
          >
            {friend.friend.username ? (
              <>
                <h3 className="text-lg font-semibold text-[#73FFA2] truncate hover:text-[#66DEDB] transition-colors">
                  {friend.friend.username}
                </h3>
                {fullName && fullName !== 'Sin nombre' && (
                  <p className="text-sm text-gray-400 truncate">{fullName}</p>
                )}
              </>
            ) : (
              <h3 className="text-lg font-semibold text-[#73FFA2] truncate hover:text-[#66DEDB] transition-colors">
                {fullName}
              </h3>
            )}
          </button>
          
          {/* Botones distribuidos uniformemente */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <button
                className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
                title="Enviar Tanku"
              >
                Enviar Tanku
              </button>
              <Link
                href={`/messages?userId=${friend.friendId}`}
                className="px-3 py-1.5 text-xs font-medium bg-[#66DEDB] text-black rounded-lg hover:bg-[#73FFA2] transition-colors whitespace-nowrap"
              >
                Mensaje
              </Link>
            </div>
            {/* Icono de eliminar amigo al final, justo debajo de los 3 puntos */}
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className="flex-shrink-0 p-1.5 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
              title="Eliminar amigo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="22" viewBox="0 0 25 31" fill="none">
                <path d="M6.14453 6.30288V2.8517L12.4998 1.04193L18.5183 2.8517V6.30288" stroke="#66DEDB" strokeWidth="2"/>
                <path d="M7.19678 11.2692L7.19678 17.6244V23.6429" stroke="#66DEDB" strokeWidth="2"/>
                <path d="M12.3315 11.2692V17.6244V23.6429" stroke="#66DEDB" strokeWidth="2"/>
                <path d="M17.4663 11.2692V17.6244V23.6429" stroke="#66DEDB" strokeWidth="2"/>
                <path d="M23.9131 5.78876L21.9707 29.1804H2.83105L1.07715 5.78876H23.9131Z" stroke="#66DEDB" strokeWidth="2"/>
              </svg>
            </button>
          </div>

          {/* Red TANKU - Mostrar grupos donde está el amigo, debajo de los botones */}
          <div className="mt-1">
            {groups.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-[#66DEDB] whitespace-nowrap">Red TANKU:</span>
                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => (
                    <span
                      key={group.id}
                      className="px-2 py-1 text-xs rounded-lg bg-[#73FFA2] text-gray-900 font-medium"
                      title={`Está en el grupo ${group.name}`}
                    >
                      {group.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">Red TANKU: Sin grupos asignados</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
