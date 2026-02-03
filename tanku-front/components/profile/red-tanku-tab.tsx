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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#73FFA2]">RED TANKU</h3>
          <p className="text-sm text-gray-400 mt-1">
            Organiza tus amigos en grupos privados
          </p>
        </div>
        <div className="flex gap-2">
          {/* Botón de sugerencias - siempre visible si hay sugerencias */}
          {recommendedGroups.length > 0 && !showRecommendedGroups && (
            <button
              onClick={handleShowRecommendedGroups}
              className="text-sm text-gray-400 hover:text-[#73FFA2] transition-colors"
            >
              Ver Sugerencias
            </button>
          )}
          <button
            onClick={handleCreateGroup}
            type="button"
            className="bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 px-4 py-2 rounded-lg font-medium hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Crear Grupo
          </button>
        </div>
      </div>

      {/* Grupos recomendados */}
      {showRecommendedGroups && recommendedGroups.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-3 relative">
          <button
            onClick={handleCloseRecommendedGroups}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 transition-colors"
            title="Cerrar"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
          <h4 className="text-xs font-medium text-gray-400 mb-2 pr-6">Sugerencias</h4>
          <div className="flex flex-wrap gap-1.5">
            {recommendedGroups.map((rec, index) => (
              <button
                key={index}
                onClick={() => {
                  useRecommendedGroup(rec)
                  setShowRecommendedGroups(false)
                }}
                className="text-left px-2.5 py-1.5 rounded bg-gray-700/50 hover:bg-gray-700 transition-colors text-xs"
              >
                <div className="text-white font-medium">{rec.name}</div>
              </button>
            ))}
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
              className="bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 px-4 py-2 rounded-lg font-medium hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all"
            >
              Crear mi primer grupo
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-[#73FFA2] transition-colors"
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
                    className="p-1.5 rounded hover:bg-gray-700 transition-colors"
                    title="Editar grupo"
                  >
                    <PencilIcon className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-1.5 rounded hover:bg-gray-700 transition-colors"
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
                  <button
                    onClick={() => handleAddMembers(group)}
                    className="text-xs text-[#73FFA2] hover:text-[#66DEDB] transition-colors flex items-center gap-1"
                  >
                    <UserPlusIcon className="w-3 h-3" />
                    Agregar
                  </button>
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
                      <button
                        onClick={() => handleRemoveMember(group.id, member.userId)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar del grupo"
                      >
                        <XMarkIcon className="w-3 h-3 text-white" />
                      </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[100]" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowCreateModal(false)
            setShowEditModal(false)
            setEditingGroup(null)
            setFormData({ name: '', description: '' })
            setSelectedFriends([])
            setError(null)
          }
        }}>
          <div className="bg-gray-900 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#73FFA2]">
                {editingGroup ? 'Editar Grupo' : 'Crear Nuevo Grupo'}
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
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del Grupo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-[#73FFA2]"
                  placeholder="Ej: Familia, Amigos Cercanos..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-[#73FFA2]"
                  rows={3}
                  placeholder="Describe el grupo..."
                />
              </div>

              {!editingGroup && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Agregar Amigos (opcional)
                  </label>
                  <div className="bg-gray-800 rounded p-3 max-h-40 overflow-y-auto">
                    {friends.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">
                        No tienes amigos aún
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {friends.map((friend) => (
                          <label
                            key={friend.friend.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFriends.includes(friend.friend.id)}
                              onChange={() => toggleFriendSelection(friend.friend.id)}
                              className="w-4 h-4 text-[#73FFA2] bg-gray-700 border-gray-600 rounded focus:ring-[#73FFA2]"
                            />
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
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowEditModal(false)
                    setEditingGroup(null)
                    setFormData({ name: '', description: '' })
                    setSelectedFriends([])
                    setError(null)
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveGroup}
                  disabled={isSaving || !formData.name.trim()}
                  type="button"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 font-medium hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      {editingGroup ? 'Guardar Cambios' : 'Crear Grupo'}
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#73FFA2]">
                Agregar Miembros a {selectedGroup.name}
              </h3>
              <button
                onClick={() => {
                  setShowAddMembersModal(false)
                  setSelectedGroup(null)
                  setSelectedFriends([])
                  setError(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-gray-800 rounded p-3 max-h-60 overflow-y-auto">
                {availableFriends.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">
                    Todos tus amigos ya están en este grupo
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableFriends.map((friend) => (
                      <label
                        key={friend.friend.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend.friend.id)}
                          onChange={() => toggleFriendSelection(friend.friend.id)}
                          className="w-4 h-4 text-[#73FFA2] bg-gray-700 border-gray-600 rounded focus:ring-[#73FFA2]"
                        />
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
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowAddMembersModal(false)
                    setSelectedGroup(null)
                    setSelectedFriends([])
                    setError(null)
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddSelectedMembers}
                  disabled={isSaving || selectedFriends.length === 0}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 font-medium hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
    </div>
  )
}

