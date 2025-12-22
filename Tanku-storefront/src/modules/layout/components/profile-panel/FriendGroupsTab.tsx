"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { getFriendGroups, createFriendGroup, inviteToGroup, getGroupMembers, removeMemberFromGroup, deleteFriendGroup, updateFriendGroup } from '../actions/friend-groups'
import { getFriends } from '@modules/social/actions/get-friends'

interface FriendGroup {
  id: string
  group_name: string
  description?: string
  image_url?: string | null
  created_by: string
  is_private: boolean
  created_at: string
  member_count?: number
  role?: string
}

interface GroupInvitation {
  id: string
  group_id: string
  group_name: string
  sender_name: string
  sender_id: string
  message?: string
  created_at: string
}

interface GroupMember {
  id: string
  customer_id: string
  first_name: string
  last_name: string
  email: string
  role: string
  joined_at: string
  avatar_url?: string
}

interface Friend {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_url?: string
}

interface FriendGroupsTabProps {
  customerId: string
}

const FriendGroupsTab: React.FC<FriendGroupsTabProps> = ({ customerId }) => {
  const [activeView, setActiveView] = useState<'groups' | 'create'>('groups')
  const [groups, setGroups] = useState<FriendGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [groupMemberIds, setGroupMemberIds] = useState<Set<string>>(new Set())
  
  // Create group form state
  const [createForm, setCreateForm] = useState({
    group_name: '',
    description: '',
    is_private: false,
    image: null as File | null
  })
  const [createLoading, setCreateLoading] = useState(false)

  // Invite form state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [inviteMessage, setInviteMessage] = useState('')
  
  // Edit group state
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    group_name: '',
    description: '',
    image: null as File | null
  })
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    loadGroups()
    loadFriends()
  }, [customerId])

  const loadGroups = async () => {
    if (!customerId) {
      console.error('No customerId provided')
      return
    }
    
    setLoading(true)
    try {
      const response = await getFriendGroups(customerId)
      if (response.success) {
        setGroups(response.groups || [])
      } else {
        console.error('Error loading groups:', response.error)
        setGroups([])
      }
    } catch (error) {
      console.error('Error loading groups:', error)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }


  const loadFriends = async () => {
    try {
      const friendsList = await getFriends(customerId)
      
      // Mapear FriendItem a Friend usando friend_customer_id como id
      const mappedFriends: Friend[] = friendsList.map((item) => ({
        id: item.friend_customer_id,
        first_name: item.friend.first_name || 'Usuario',
        last_name: item.friend.last_name || '',
        email: item.friend.email || '',
        avatar_url: item.friend.avatar_url || undefined,
      }))
      
      setFriends(mappedFriends)
    } catch (error) {
      console.error('Error loading friends:', error)
    }
  }

  const loadGroupMembers = async (groupId: string) => {
    try {
      const response = await getGroupMembers(groupId)
      if (response.success) {
        setGroupMembers(response.members)
        // Obtener el rol del usuario actual en la Red
        const currentMember = response.members.find((m: GroupMember) => m.customer_id === customerId)
        setCurrentUserRole(currentMember?.role || null)
      }
    } catch (error) {
      console.error('Error loading group members:', error)
    }
  }

  const loadGroupMembersForInvite = async (groupId: string) => {
    try {
      // Cargar miembros del grupo para obtener el rol del usuario y filtrar contactos ya agregados
      // En el modelo de Red Tanku (clasificación privada), no hay invitaciones pendientes
      // Los contactos se agregan directamente, así que solo necesitamos los miembros actuales
      const response = await getGroupMembers(groupId)
      if (response.success) {
        const memberIds = new Set<string>(response.members.map((m: GroupMember) => m.customer_id))
        const currentMember = response.members.find((m: GroupMember) => m.customer_id === customerId)
        setCurrentUserRole(currentMember?.role || null)
        setGroupMemberIds(memberIds)
      } else {
        setGroupMemberIds(new Set<string>())
      }
    } catch (error) {
      console.error('Error loading group members for invite:', error)
      setGroupMemberIds(new Set<string>())
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!selectedGroup) return
    
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${memberName} de la Red?`)) {
      return
    }

    try {
      const response = await removeMemberFromGroup({
        group_id: selectedGroup,
        member_id: memberId,
        removed_by: customerId
      })

      if (response.success) {
        alert(response.message || 'Miembro eliminado exitosamente')
        // Recargar contactos de la Red
        loadGroupMembers(selectedGroup)
        // Recargar grupos para actualizar el contador
        loadGroups()
      } else {
        alert(response.error || 'Error al eliminar miembro')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Error al eliminar miembro')
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.group_name.trim()) return

    setCreateLoading(true)
    try {
      const response = await createFriendGroup({
        group_name: createForm.group_name,
        description: createForm.description,
        is_private: createForm.is_private,
        created_by: customerId,
        image: createForm.image
      })

      if (response.success) {
        setCreateForm({ group_name: '', description: '', is_private: false, image: null })
        setActiveView('groups')
        loadGroups()
      } else {
        alert(response.error || 'Error al crear la Red')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Error al crear la Red')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la Red "${groupName}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const response = await deleteFriendGroup(groupId, customerId)
      if (response.success) {
        alert(response.message || 'Red eliminada exitosamente')
        loadGroups()
        if (selectedGroup === groupId) {
          setSelectedGroup(null)
        }
      } else {
        alert(response.error || 'Error al eliminar la Red')
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      alert('Error al eliminar la Red')
    }
  }

  const handleStartEdit = (group: FriendGroup) => {
    setEditingGroup(group.id)
    setEditForm({
      group_name: group.group_name,
      description: group.description || '',
      image: null
    })
  }

  const handleCancelEdit = () => {
    setEditingGroup(null)
    setEditForm({ group_name: '', description: '', image: null })
  }

  const handleUpdateGroup = async (e: React.FormEvent, groupId: string) => {
    e.preventDefault()
    if (!editForm.group_name.trim()) return

    setEditLoading(true)
    try {
      const response = await updateFriendGroup({
        group_id: groupId,
        group_name: editForm.group_name,
        description: editForm.description,
        updated_by: customerId,
        image: editForm.image
      })

      if (response.success) {
        setEditingGroup(null)
        setEditForm({ group_name: '', description: '', image: null })
        loadGroups()
        alert(response.message || 'Red actualizada exitosamente')
      } else {
        alert(response.error || 'Error al actualizar la Red')
      }
    } catch (error) {
      console.error('Error updating group:', error)
      alert('Error al actualizar la Red')
    } finally {
      setEditLoading(false)
    }
  }


  const handleInviteFriends = async () => {
    if (!selectedGroup || selectedFriends.length === 0) return

    try {
      const response = await inviteToGroup({
        group_id: selectedGroup,
        friend_ids: selectedFriends,
        message: inviteMessage,
        invited_by: customerId
      })

      if (response.success) {
        setShowInviteModal(false)
        setSelectedFriends([])
        setInviteMessage('')
        setSelectedGroup(null)
        alert('Contactos agregados exitosamente')
        // Recargar Redes para actualizar el contador de contactos
        loadGroups()
      } else {
        alert(response.error || 'Error al agregar contactos')
      }
    } catch (error) {
      console.error('Error inviting friends:', error)
      alert('Error al agregar contactos')
    }
  }

  const openGroupDetails = (groupId: string) => {
    setSelectedGroup(groupId)
    loadGroupMembers(groupId)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2 sm:space-x-4 w-full sm:w-auto">
          <button
            onClick={() => setActiveView('groups')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              activeView === 'groups'
                ? 'bg-[#73FFA2] text-black'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Mi Red Tanku ({groups.length})
          </button>
        </div>
        <button
          onClick={() => setActiveView('create')}
          className="bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Crear Red
        </button>
      </div>

      {/* Groups View */}
      {activeView === 'groups' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
            </div>
          ) : groups.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {groups.map((group) => (
                <div key={group.id} className="bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-700 hover:border-[#73FFA2] transition-colors relative">
                  {/* Botón eliminar en esquina superior derecha */}
                  {group.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.group_name)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-200 transition-colors p-1"
                      title="Eliminar Red"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#1A485C] to-[#73FFA2] rounded-lg flex items-center justify-center">
                      {group.image_url ? (
                        <Image src={group.image_url} alt={group.group_name} width={48} height={48} className="rounded-lg object-cover w-10 h-10 sm:w-12 sm:h-12" />
                      ) : (
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <h3 className="text-white text-sm sm:text-base font-semibold">{group.group_name}</h3>
                        {group.is_private && (
                          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                        {/* Botón editar al lado del nombre */}
                        {group.role === 'admin' && (
                          <button
                            onClick={() => handleStartEdit(group)}
                            className="text-gray-400 hover:text-gray-200 transition-colors p-1"
                            title="Editar Red"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-gray-400 text-xs sm:text-sm mt-1">{group.description}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-2">
                        {group.member_count || 0} miembros • Creado {new Date(group.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {editingGroup === group.id ? (
                    <form onSubmit={(e) => handleUpdateGroup(e, group.id)} className="mt-3 sm:mt-4 space-y-2">
                      <input
                        type="text"
                        value={editForm.group_name}
                        onChange={(e) => setEditForm({ ...editForm, group_name: e.target.value })}
                        placeholder="Nombre de la Red"
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                        required
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Descripción (opcional)"
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                        rows={2}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditForm({ ...editForm, image: e.target.files?.[0] || null })}
                        className="w-full text-sm text-gray-300"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={editLoading}
                          className="flex-1 bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {editLoading ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex gap-2 mt-3 sm:mt-4">
                      <button
                        onClick={() => openGroupDetails(group.id)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors"
                      >
                        Miembros
                      </button>
                      {group.role === 'admin' && (
                        <button
                          onClick={async () => {
                            setSelectedGroup(group.id)
                            setSelectedFriends([])
                            setInviteMessage('')
                            await loadGroupMembersForInvite(group.id)
                            setShowInviteModal(true)
                          }}
                          className="bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors"
                        >
                          Agregar Contactos
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-white text-base sm:text-lg font-medium mb-1 sm:mb-2">No tienes Red Tanku aún</h3>
              <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">Crea tu primera Red para organizar tus contactos</p>
              <button
                onClick={() => setActiveView('create')}
                className="bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Crear Mi Primera Red
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Group View */}
      {activeView === 'create' && (
        <div className="max-w-md mx-auto px-2 sm:px-0">
          <form onSubmit={handleCreateGroup} className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
            <h3 className="text-white text-base sm:text-lg font-semibold mb-3 sm:mb-4">Crear Nueva Red Tanku</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Nombre de la Red *
                </label>
                <input
                  type="text"
                  value={createForm.group_name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, group_name: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 sm:py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#73FFA2]"
                  placeholder="Ej: Amigos del colegio"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Descripción
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#73FFA2] resize-none"
                  placeholder="Describe tu Red..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Imagen de la Red
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCreateForm(prev => ({ ...prev, image: e.target.files?.[0] || null }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 sm:py-2 text-sm text-white file:mr-3 sm:file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs sm:file:text-sm file:bg-[#73FFA2] file:text-black"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_private"
                  checked={createForm.is_private}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, is_private: e.target.checked }))}
                  className="mr-2 rounded"
                />
                <label htmlFor="is_private" className="text-gray-300 text-xs sm:text-sm">
                  Red privada
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-4 sm:mt-6">
              <button
                type="button"
                onClick={() => setActiveView('groups')}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createLoading || !createForm.group_name.trim()}
                onClick={handleCreateGroup}
                className="flex-1 bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {createLoading ? 'Creando...' : 'Crear Red'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Group Members Modal */}
      {selectedGroup && !showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6 max-w-md w-full mx-4 max-h-[80vh] sm:max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-base sm:text-lg font-semibold">Contactos de la Red</h3>
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {groupMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-700 rounded-lg">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#73FFA2] rounded-full flex items-center justify-center">
                    {member.avatar_url ? (
                      <Image 
                        src={member.avatar_url} 
                        alt={member.first_name} 
                        width={40} 
                        height={40} 
                        className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
                        unoptimized={member.avatar_url?.startsWith('http')}
                      />
                    ) : (
                      <span className="text-black font-semibold text-sm">
                        {member.first_name[0]}{member.last_name[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-xs sm:text-sm font-medium">{member.first_name} {member.last_name}</p>
                    <p className="text-gray-400 text-xs sm:text-sm">{member.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    member.role === 'admin' ? 'bg-[#73FFA2] text-black' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {member.role}
                  </span>
                  {currentUserRole === 'admin' && member.customer_id !== customerId && (
                    <button
                      onClick={() => handleRemoveMember(member.id, `${member.first_name} ${member.last_name}`)}
                      className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                      title="Eliminar miembro"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-base sm:text-lg font-semibold">Invitar Amigos</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setSelectedGroup(null)
                  setSelectedFriends([])
                  setInviteMessage('')
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Mensaje (opcional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#73FFA2] resize-none"
                  placeholder="Mensaje opcional para agregar a la Red"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Seleccionar Amigos
                </label>
                <div className="max-h-32 sm:max-h-40 overflow-y-auto space-y-1 sm:space-y-2">
                  {(() => {
                    // Filtrar amigos que ya están en la Red
                    const availableFriends = friends.filter(friend => !groupMemberIds.has(friend.id))
                    
                    return availableFriends.length > 0 ? (
                      availableFriends.map((friend) => (
                      <label key={friend.id} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 hover:bg-gray-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFriends(prev => [...prev, friend.id])
                            } else {
                              setSelectedFriends(prev => prev.filter(id => id !== friend.id))
                            }
                          }}
                          className="rounded"
                        />
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-gray-600 overflow-hidden">
                          {friend.avatar_url ? (
                            <Image
                              src={friend.avatar_url}
                              alt={`${friend.first_name} ${friend.last_name}`}
                              width={32}
                              height={32}
                              className="rounded-full w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-xs font-semibold">
                              {friend.first_name?.[0]?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <span className="text-white text-xs sm:text-sm">
                          {friend.first_name} {friend.last_name}
                        </span>
                      </label>
                    ))
                    ) : (
                      <div className="text-center py-4 text-gray-400 text-xs sm:text-sm">
                        {friends.length === 0 
                          ? 'No tienes amigos agregados aún'
                          : 'Todos tus amigos ya están en esta Red'}
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInviteFriends}
                  disabled={selectedFriends.length === 0}
                  className="flex-1 bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Agregar Contactos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FriendGroupsTab
