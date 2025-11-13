"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { getFriends, FriendItem } from "@modules/social/actions/get-friends"
import { unfriend } from "@modules/social/actions/unfriend"
import { usePersonalInfo } from "@lib/context"
import Link from "next/link"
import { Trash } from "@medusajs/icons"

// Custom MessageCircle Icon
const MessageCircle = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
)

// Custom UserPlus Icon
const UserPlus = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="19" y1="8" x2="19" y2="14"/>
    <line x1="22" y1="11" x2="16" y2="11"/>
  </svg>
)

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [unfriendingId, setUnfriendingId] = useState<string | null>(null)
  const { personalInfo } = usePersonalInfo()

  useEffect(() => {
    if (personalInfo?.id) {
      loadFriends()
    }
  }, [personalInfo?.id])

  const loadFriends = async () => {
    setLoading(true)
    try {
      const friendsList = await getFriends(personalInfo!.id)
      setFriends(friendsList)
    } catch (error) {
      console.error("Error loading friends:", error)
      setFriends([])
    } finally {
      setLoading(false)
    }
  }

  const handleUnfriend = async (friendId: string) => {
    if (!personalInfo?.id || !window.confirm("¿Estás seguro de que quieres eliminar a este amigo?")) return
    setUnfriendingId(friendId)
    try {
      await unfriend(personalInfo.id, friendId)
      await loadFriends() // Reload friends after unfriending
    } catch (error) {
      console.error("Error unfriending:", error)
      alert("Error al eliminar amigo.")
    } finally {
      setUnfriendingId(null)
    }
  }

  const filteredFriends = friends.filter(friendItem =>
    (friendItem.friend.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friendItem.friend.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friendItem.friend.pseudonym?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friendItem.friend.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="p-6 bg-[#1E1E1E] min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-8 text-center">Mis Amigos</h1>

      {/* Search Bar */}
      <div className="max-w-md mx-auto mb-8 relative">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar amigos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#73FFA2] focus:ring-1 focus:ring-[#73FFA2] transition-colors"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#73FFA2]"></div>
        </div>
      ) : (
        <>
          {filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <UserPlus size={32} />
              </div>
              <h3 className="text-white text-lg sm:text-xl font-medium mb-2">
                {searchQuery ? "No se encontraron amigos" : "No tienes amigos aún"}
              </h3>
              <p className="text-gray-400 text-sm sm:text-base">
                {searchQuery
                  ? "Intenta con otro nombre o email."
                  : "Explora y conecta con otros usuarios"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredFriends.map((friendItem) => {
                const friend = friendItem.friend
                const displayName = friend.pseudonym ||
                  `${friend.first_name || ""} ${friend.last_name || ""}`.trim() ||
                  friend.email?.split("@")[0] ||
                  "Usuario Desconocido"

                return (
                  <div
                    key={friendItem.id}
                    className="bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-700 flex flex-col items-center text-center"
                  >
                    <div className="relative w-20 h-20 mb-3">
                      <Image
                        src={friend.avatar_url || "/feed/avatar.png"}
                        alt={displayName}
                        fill
                        className="rounded-full object-cover border-2 border-[#73FFA2]"
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {displayName}
                    </h3>
                    {friend.email && (
                      <p className="text-gray-400 text-xs sm:text-sm truncate">
                        {friend.email}
                      </p>
                    )}
                    <div className="flex gap-2 mt-4 w-full">
                      <Link
                        href={`/messages`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#73FFA2] hover:bg-[#66e891] text-gray-900 rounded-lg font-medium text-sm transition-colors"
                      >
                        <MessageCircle size={16} />
                        <span>Mensaje</span>
                      </Link>
                      <button
                        onClick={() => handleUnfriend(friendItem.friend_customer_id)}
                        disabled={unfriendingId === friendItem.friend_customer_id}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                      >
                        {unfriendingId === friendItem.friend_customer_id ? (
                          <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        ) : (
                          <Trash className="w-4 h-4" />
                        )}
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
