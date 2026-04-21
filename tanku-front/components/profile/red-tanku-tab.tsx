'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import Image from 'next/image'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

interface GroupMember {
  id: string
  userId: string
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    profile: {
      avatar: string | null
    } | null
  }
}

interface Group {
  id: string
  userId: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  members: GroupMember[]
  membersCount: number
}

interface RecommendedGroup {
  name: string
  description: string
}

interface RedTankuTabProps {
  userId: string
}

export function RedTankuTab({ userId }: RedTankuTabProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [recommendedGroups, setRecommendedGroups] = useState<RecommendedGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddMembersModal, setShowAddMembersModal] = useState(false)
  const [showManageMembersModal, setShowManageMembersModal] = useState(false)
  const [showRecommendedGroups, setShowRecommendedGroups] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [availableFriends, setAvailableFriends] = useState<any[]>([])
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Cargar grupos y recomendaciones
  useEffect(() => {
    loadGroups()
    loadRecommendedGroups()
    loadFriends()
  }, [userId])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<Group[]>(API_ENDPOINTS.GROUPS.LIST)
      if (response.success && response.data) {
        setGroups(Array.isArray(response.data) ? response.data : [])
      }
    } catch (error) {
      console.error('Error al cargar grupos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecommendedGroups = async () => {
    try {
      const response = await apiClient.get<RecommendedGroup[]>(API_ENDPOINTS.GROUPS.RECOMMENDED)
      if (response.success && response.data) {
        setRecommendedGroups(Array.isArray(response.data) ? response.data : [])
      }
    } catch (error) {
      console.error('Error al cargar grupos recomendados:', error)
    }
  }

  const loadFriends = async () => {
    try {
      const response = await apiClient.get<{ friends: any[]; count: number }>(API_ENDPOINTS.FRIENDS.LIST)
      if (response.success && response.data) {
        const friendsList = response.data.friends || []
        setFriends(friendsList)
        return friendsList
      }
      return []
    } catch (error) {
      console.error('Error al cargar amigos:', error)
      return []
    }
  }

  const handleCreateGroup = () => {
    console.log('[RedTankuTab] handleCreateGroup llamado')
    setFormData({ name: '', description: '' })
    setSelectedFriends([])
    setError(null)
    setEditingGroup(null)
    // Cargar amigos antes de abrir el modal
    loadFriends()
    setShowCreateModal(true)
    console.log('[RedTankuTab] showCreateModal establecido a true')
  }

  const handleShowRecommendedGroups = () => {
    setShowRecommendedGroups(true)
  }

  const handleCloseRecommendedGroups = () => {
    setShowRecommendedGroups(false)
    // Guardar en localStorage que el usuario cerró los grupos recomendados
    if (typeof window !== 'undefined') {
      localStorage.setItem('tanku_hide_recommended_groups', 'true')
    }
  }

  const redTankuActionButtonClass =
    'rounded-full text-[11px] sm:text-xs font-semibold text-black shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90'
  const modalActionButtonClass =
    'rounded-[25px] px-3 py-2 text-[11px] sm:px-4 sm:py-2.5 sm:text-xs font-semibold transition-colors shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)]'
  const tankuModalSurfaceClass = 'rounded-[24px] border border-[#414141] bg-[#171B21]'
  const tankuModalInputClass =
    'w-full rounded-[20px] border border-[#66DEDB]/55 bg-[#11161d] px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#73FFA2]'

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || '',
    })
    setError(null)
    setShowEditModal(true)
  }

  const handleAddMembers = async (group: Group) => {
    setSelectedGroup(group)
    setSelectedFriends([])
    setError(null)
    
    // Cargar amigos y filtrar los que ya están en el grupo
    const friendsList = await loadFriends()
    const groupMemberIds = new Set(group.members.map(m => m.userId))
    const available = friendsList.filter(f => !groupMemberIds.has(f.friend.id))
    setAvailableFriends(available)
    setShowAddMembersModal(true)
  }

  const handleManageMembers = (group: Group) => {
    setSelectedGroup(group)
    setError(null)
    setShowManageMembersModal(true)
  }

  const handleSaveGroup = async () => {
    if (!formData.name.trim()) {
      setError('El nombre del grupo es requerido')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      if (editingGroup) {
        // Actualizar grupo existente
        const response = await apiClient.put<Group>(
          API_ENDPOINTS.GROUPS.UPDATE(editingGroup.id),
          {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          }
        )
        if (response.success && response.data) {
          await loadGroups()
          setShowEditModal(false)
          setEditingGroup(null)
        }
      } else {
        // Crear nuevo grupo
        const response = await apiClient.post<Group>(API_ENDPOINTS.GROUPS.CREATE, {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          memberIds: selectedFriends,
        })
        if (response.success && response.data) {
          await loadGroups()
          setShowCreateModal(false)
          setFormData({ name: '', description: '' })
          setSelectedFriends([])
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar el grupo')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este grupo?')) return

    try {
      const response = await apiClient.delete(API_ENDPOINTS.GROUPS.DELETE(groupId))
      if (response.success) {
        await loadGroups()
      }
    } catch (error) {
      console.error('Error al eliminar grupo:', error)
      alert('Error al eliminar el grupo')
    }
  }

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.GROUPS.REMOVE_MEMBER(groupId, memberId)
      )
      if (response.success && response.data) {
        await loadGroups()
      }
    } catch (error) {
      console.error('Error al eliminar miembro:', error)
      alert('Error al eliminar el miembro')
    }
  }

  const handleAddSelectedMembers = async () => {
    if (!selectedGroup || selectedFriends.length === 0) return

    setIsSaving(true)
    setError(null)

    try {
      // Agregar miembros uno por uno
      for (const memberId of selectedFriends) {
        await apiClient.post(API_ENDPOINTS.GROUPS.ADD_MEMBER(selectedGroup.id), {
          memberId,
        })
      }
      await loadGroups()
      setShowAddMembersModal(false)
      setSelectedGroup(null)
      setSelectedFriends([])
    } catch (err: any) {
      setError(err.message || 'Error al agregar miembros')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    )
  }

  const useRecommendedGroup = (recommended: RecommendedGroup) => {
    setFormData({
      name: recommended.name,
      description: recommended.description,
    })
    setShowCreateModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
        <span className="ml-2 text-white">Cargando grupos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Acciones superiores */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          {/* Botón de sugerencias - siempre visible si hay sugerencias */}
          {recommendedGroups.length > 0 && !showRecommendedGroups && (
            <button
              onClick={handleShowRecommendedGroups}
              className="text-xs text-gray-300 hover:text-[#73FFA2] transition-colors"
            >
              Ver Sugerencias
            </button>
          )}
          <button
            onClick={handleCreateGroup}
            type="button"
            className={`h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center ${redTankuActionButtonClass}`}
            style={{ background: 'linear-gradient(90deg, #73FFA2 0%, #1A485C 100%)' }}
            title="Crear grupo"
          >
            <PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* Grupos recomendados */}
      {showRecommendedGroups && recommendedGroups.length > 0 && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/60 p-4" onClick={handleCloseRecommendedGroups}>
          <div className={`w-full max-w-sm p-3.5 sm:p-4 ${tankuModalSurfaceClass}`} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#66DEDB]">Sugerencias de red</h4>
              <button
                onClick={handleCloseRecommendedGroups}
                className="text-gray-500 transition-colors hover:text-gray-300"
                title="Cerrar"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recommendedGroups.map((rec, index) => (
                <button
                  key={index}
                  onClick={() => {
                    useRecommendedGroup(rec)
                    setShowRecommendedGroups(false)
                  }}
                  className="rounded-[14px] border border-white/10 bg-[#10161d] px-3 py-2 text-left text-xs transition-colors hover:border-[#73FFA2]/45 hover:bg-white/[0.03]"
                >
                  <div className="font-medium text-white">{rec.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista de grupos */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <UserPlusIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-white text-lg font-medium mb-2">No tienes grupos aún</h4>
          <p className="text-gray-400 text-sm mb-4">
            Crea grupos para organizar tus amigos
          </p>
            <button
              onClick={handleCreateGroup}
              type="button"
              className={`px-3 sm:px-4 py-1 ${redTankuActionButtonClass}`}
              style={{ background: 'linear-gradient(90deg, #73FFA2 0%, #1A485C 100%)' }}
            >
              Crear mi primer grupo
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-[20px] border border-[#3b434f] bg-[#171B21] p-4 transition-colors hover:border-[#73FFA2]/55"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white mb-1">{group.name}</h4>
                  {group.description && (
                    <p className="text-sm text-gray-400">{group.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditGroup(group)}
                    className="p-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
                    title="Editar grupo"
                  >
                    <PencilIcon className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
                    title="Eliminar grupo"
                  >
                    <TrashIcon className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">
                    {group.membersCount} miembro{group.membersCount !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleManageMembers(group)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#73FFA2]/40 bg-[#73FFA2]/10 text-[#73FFA2] transition-colors hover:bg-[#73FFA2]/20"
                      title="Gestionar miembros"
                    >
                      <UserMinusIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleAddMembers(group)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#73FFA2]/40 bg-[#73FFA2]/10 text-[#73FFA2] transition-colors hover:bg-[#73FFA2]/20"
                      title="Agregar miembros"
                    >
                      <UserPlusIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.members.slice(0, 5).map((member) => (
                    <div
                      key={member.id}
                      className="relative group"
                      title={`${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || member.user.email}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                        {member.user.profile?.avatar ? (
                          <Image
                            src={member.user.profile.avatar}
                            alt="Avatar"
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                            unoptimized={member.user.profile.avatar.startsWith('http')}
                          />
                        ) : (
                          <span className="text-xs text-gray-400">
                            {(member.user.firstName?.[0] || member.user.email?.[0] || 'U').toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {group.membersCount > 5 && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-xs text-gray-400">+{group.membersCount - 5}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar grupo */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/70 p-3 sm:p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowCreateModal(false)
            setShowEditModal(false)
            setEditingGroup(null)
            setFormData({ name: '', description: '' })
            setSelectedFriends([])
            setError(null)
          }
        }}>
          <div className={`w-full max-w-md overflow-hidden p-4 sm:p-5 ${tankuModalSurfaceClass}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-bold text-[#66DEDB]">
                {editingGroup ? 'Editar red' : 'Crear nueva red'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  setEditingGroup(null)
                  setFormData({ name: '', description: '' })
                  setSelectedFriends([])
                  setError(null)
                }}
                className="text-gray-400 hover:text-white transition-colors"
                type="button"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-red-400/30 bg-red-900/20 px-3 py-2 text-xs text-red-400 sm:text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-300 sm:text-sm">
                  Nombre de la red
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={tankuModalInputClass}
                  placeholder="Ej: Amigos cercanos"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-300 sm:text-sm">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${tankuModalInputClass} resize-none`}
                  rows={3}
                  placeholder="Describe esta red..."
                />
              </div>

              {!editingGroup && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-300 sm:text-sm">
                    Agregar Amigos (opcional)
                  </label>
                  <div className="max-h-44 overflow-y-auto rounded-[20px] border border-white/10 bg-[#11161d] p-2.5">
                    {friends.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">
                        No tienes amigos aún
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {friends.map((friend) => (
                          <div
                            key={friend.friend.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-[14px] px-2 py-1.5 transition-colors ${
                              selectedFriends.includes(friend.friend.id)
                                ? 'bg-white/[0.06] ring-1 ring-[#73FFA2]/60'
                                : 'hover:bg-white/[0.04]'
                            }`}
                            onClick={() => toggleFriendSelection(friend.friend.id)}
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center flex-shrink-0">
                              {friend.friend.profile?.avatar ? (
                                <Image
                                  src={friend.friend.profile.avatar}
                                  alt="Avatar"
                                  width={32}
                                  height={32}
                                  className="object-cover w-full h-full"
                                  unoptimized={friend.friend.profile.avatar.startsWith('http')}
                                />
                              ) : (
                                <span className="text-xs text-gray-300">
                                  {(friend.friend.firstName?.[0] || friend.friend.email?.[0] || 'U').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-white">
                              {friend.friend.firstName || friend.friend.email}
                            </span>
                            {selectedFriends.includes(friend.friend.id) && (
                              <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#73FFA2] text-[#262626]">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-3">
                <button
                  onClick={handleSaveGroup}
                  disabled={isSaving || !formData.name.trim()}
                  type="button"
                  className={`${modalActionButtonClass} min-w-[150px] bg-[#73FFA2] text-[#262626] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      {editingGroup ? 'Guardar cambios' : 'Crear red'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar miembros */}
      {showAddMembersModal && selectedGroup && (
        <div
          className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/70 p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddMembersModal(false)
              setSelectedGroup(null)
              setSelectedFriends([])
              setError(null)
            }
          }}
        >
          <div className={`w-full max-w-md p-4 sm:p-5 ${tankuModalSurfaceClass}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-[#66DEDB]">
                Agregar Miembros a {selectedGroup.name}
              </h3>
              <button
                onClick={() => {
                  setShowAddMembersModal(false)
                  setSelectedGroup(null)
                  setSelectedFriends([])
                  setError(null)
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto rounded-[20px] border border-white/10 bg-[#11161d] p-2.5">
                {availableFriends.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">
                    Todos tus amigos ya están en este grupo
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableFriends.map((friend) => (
                      <div
                        key={friend.friend.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-[14px] px-2 py-1.5 transition-colors ${
                          selectedFriends.includes(friend.friend.id)
                            ? 'bg-white/[0.06] ring-1 ring-[#73FFA2]/60'
                            : 'hover:bg-white/[0.04]'
                        }`}
                        onClick={() => toggleFriendSelection(friend.friend.id)}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center flex-shrink-0">
                          {friend.friend.profile?.avatar ? (
                            <Image
                              src={friend.friend.profile.avatar}
                              alt="Avatar"
                              width={32}
                              height={32}
                              className="object-cover w-full h-full"
                              unoptimized={friend.friend.profile.avatar.startsWith('http')}
                            />
                          ) : (
                            <span className="text-xs text-gray-300">
                              {(friend.friend.firstName?.[0] || friend.friend.email?.[0] || 'U').toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-white">
                          {friend.friend.firstName || friend.friend.email}
                        </span>
                        {selectedFriends.includes(friend.friend.id) && (
                          <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#73FFA2] text-[#262626]">
                            <CheckIcon className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-center pt-3">
                <button
                  onClick={handleAddSelectedMembers}
                  disabled={isSaving || selectedFriends.length === 0}
                  className={`${modalActionButtonClass} min-w-[170px] bg-[#73FFA2] text-[#262626] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                      Agregando...
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="w-4 h-4" />
                      Agregar ({selectedFriends.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestionar miembros (clave para mobile) */}
      {showManageMembersModal && selectedGroup && (
        <div
          className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/70 p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowManageMembersModal(false)
              setSelectedGroup(null)
            }
          }}
        >
          <div className={`w-full max-w-md p-4 sm:p-5 ${tankuModalSurfaceClass}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-[#66DEDB]">
                Miembros de {selectedGroup.name}
              </h3>
              <button
                onClick={() => {
                  setShowManageMembersModal(false)
                  setSelectedGroup(null)
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-[20px] border border-white/10 bg-[#11161d] p-2.5">
              {selectedGroup.members.length === 0 ? (
                <p className="py-2 text-center text-sm text-gray-400">No hay miembros en esta red.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedGroup.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 rounded-[14px] px-2 py-1.5 hover:bg-white/[0.04]"
                    >
                      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-gray-600">
                        {member.user.profile?.avatar ? (
                          <Image
                            src={member.user.profile.avatar}
                            alt="Avatar"
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                            unoptimized={member.user.profile.avatar.startsWith('http')}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-300">
                            {(member.user.firstName?.[0] || member.user.email?.[0] || 'U').toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="truncate text-sm text-white">
                        {`${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || member.user.email}
                      </span>
                      <button
                        onClick={async () => {
                          await handleRemoveMember(selectedGroup.id, member.userId)
                        }}
                        className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-white transition-colors hover:bg-red-500"
                        title="Eliminar del grupo"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

