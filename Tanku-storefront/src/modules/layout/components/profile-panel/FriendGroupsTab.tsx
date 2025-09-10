"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { getFriendGroups, createFriendGroup, getGroupInvitations, respondToGroupInvitation, inviteToGroup, getGroupMembers } from '../actions/friend-groups'
import { getFriendRequests } from '@modules/social/actions/get-friend-requests'

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
  const [activeView, setActiveView] = useState<'groups' | 'invitations' | 'create'>('groups')
  const [groups, setGroups] = useState<FriendGroup[]>([])
  const [invitations, setInvitations] = useState<GroupInvitation[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  
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

  useEffect(() => {
    loadGroups()
    loadInvitations()
    loadFriends()
  }, [customerId])

  const loadGroups = async () => {
    setLoading(true)
    try {
      const response = await getFriendGroups(customerId)
      if (response.success) {
        setGroups(response.groups)
      }
    } catch (error) {
      console.error('Error loading groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInvitations = async () => {
    try {
      const response = await getGroupInvitations(customerId)
      if (response.success) {
        setInvitations(response.invitations)
      }
    } catch (error) {
      console.error('Error loading invitations:', error)
    }
  }

  const loadFriends = async () => {
    try {
      const response = await getFriendRequests(customerId)
     
      setFriends(response.sent) 
    } catch (error) {
      console.error('Error loading friends:', error)
    }
  }

  const loadGroupMembers = async (groupId: string) => {
    try {
      const response = await getGroupMembers(groupId)
      if (response.success) {
        setGroupMembers(response.members)
      }
    } catch (error) {
      console.error('Error loading group members:', error)
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
        alert(response.error || 'Error al crear el grupo')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Error al crear el grupo')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleRespondToInvitation = async (invitationId: string, response: 'accepted' | 'rejected') => {
    try {
      const result = await respondToGroupInvitation(invitationId, response)
      if (result.success) {
        loadInvitations()
        if (response === 'accepted') {
          loadGroups()
        }
      } else {
        alert(result.error || 'Error al responder la invitación')
      }
    } catch (error) {
      console.error('Error responding to invitation:', error)
      alert('Error al responder la invitación')
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
        alert('Invitaciones enviadas exitosamente')
      } else {
        alert(response.error || 'Error al enviar invitaciones')
      }
    } catch (error) {
      console.error('Error inviting friends:', error)
      alert('Error al enviar invitaciones')
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
            Mis Grupos ({groups.length})
          </button>
          <button
            onClick={() => setActiveView('invitations')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors relative ${
              activeView === 'invitations'
                ? 'bg-[#73FFA2] text-black'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Invitaciones
            {invitations.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {invitations.length}
              </span>
            )}
          </button>
        </div>
        <button
          onClick={() => setActiveView('create')}
          className="bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Crear Grupo
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
                <div key={group.id} className="bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-700 hover:border-[#73FFA2] transition-colors">
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
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          group.role === 'admin' ? 'bg-[#73FFA2] text-black' : 'bg-gray-600 text-gray-300'
                        }`}>
                          {group.role === 'admin' ? 'Admin' : 'Miembro'}
                        </span>
                      </div>
                      {group.description && (
                        <p className="text-gray-400 text-xs sm:text-sm mt-1">{group.description}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-2">
                        {group.member_count || 0} miembros • Creado {new Date(group.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 sm:mt-4">
                    <button
                      onClick={() => openGroupDetails(group.id)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors"
                    >
                      Ver Miembros
                    </button>
                    {group.role === 'admin' && (
                      <button
                        onClick={() => {
                          setSelectedGroup(group.id)
                          setShowInviteModal(true)
                        }}
                        className="bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors"
                      >
                        Invitar
                      </button>
                    )}
                  </div>
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
              <h3 className="text-white text-base sm:text-lg font-medium mb-1 sm:mb-2">No tienes grupos aún</h3>
              <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">Crea tu primer grupo para conectar con tus amigos</p>
              <button
                onClick={() => setActiveView('create')}
                className="bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Crear Primer Grupo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invitations View */}
      {activeView === 'invitations' && (
        <div className="space-y-4">
          {invitations.length > 0 ? (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-white text-sm sm:text-base font-semibold">{invitation.group_name}</h3>
                      <p className="text-gray-400 text-xs sm:text-sm">
                        Invitado por {invitation.sender_name}
                      </p>
                      {invitation.message && (
                        <p className="text-gray-300 text-xs sm:text-sm mt-1 sm:mt-2 italic">"{invitation.message}"</p>
                      )}
                      <p className="text-gray-500 text-xs mt-2">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleRespondToInvitation(invitation.id, 'accepted')}
                        className="bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-auto"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => handleRespondToInvitation(invitation.id, 'rejected')}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-auto"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-white text-base sm:text-lg font-medium mb-1 sm:mb-2">No tienes invitaciones pendientes</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Las invitaciones a grupos aparecerán aquí</p>
            </div>
          )}
        </div>
      )}

      {/* Create Group View */}
      {activeView === 'create' && (
        <div className="max-w-md mx-auto px-2 sm:px-0">
          <form onSubmit={handleCreateGroup} className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
            <h3 className="text-white text-base sm:text-lg font-semibold mb-3 sm:mb-4">Crear Nuevo Grupo</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Nombre del Grupo *
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
                  placeholder="Describe tu grupo..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Imagen del Grupo
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
                  Grupo privado (solo por invitación)
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
                {createLoading ? 'Creando...' : 'Crear Grupo'}
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
              <h3 className="text-white text-base sm:text-lg font-semibold">Miembros del Grupo</h3>
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
                      <Image src={member.avatar_url} alt={member.first_name} width={40} height={40} className="rounded-full w-8 h-8 sm:w-10 sm:h-10" />
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
                onClick={() => setShowInviteModal(false)}
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
                  placeholder="¡Únete a nuestro grupo!"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Seleccionar Amigos
                </label>
                <div className="max-h-32 sm:max-h-40 overflow-y-auto space-y-1 sm:space-y-2">
                  {friends.map((friend) => (
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
                      <div className="w-6 h-6 sm:w-8 sm:h-8  rounded-full flex items-center justify-center">
                       <Image
                        src={friend.avatar_url || '/placeholder.png'}
                        alt={friend.first_name}
                        width={44}
                        height={44}
                        className="rounded-full"
                      />
                      </div>
                      <span className="text-white text-xs sm:text-sm">{friend.first_name} {friend.last_name}</span>
                    </label>
                  ))}
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
                  Enviar Invitaciones
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
