"use client"
import React from "react"
import { getListUsers } from "../actions/get-list-users"
import { sendFriendRequest } from "../actions/send-friend-request"
import { acceptFriendRequest } from "../actions/accept-friend-request"
import { getFriendRequests, FriendRequest } from "../actions/get-friend-requests"
import { getFriends } from "../actions/get-friends"
import { cancelFriendRequest } from "../actions/cancel-friend-request"
import { unfriend } from "../actions/unfriend"
import { useEffect, useState } from "react"
import Image from "next/image"
import { StoreCustomer } from "@medusajs/types"
import { usePersonalInfo } from "@lib/context"


type User = {
    id: string
    first_name: string
    last_name: string
}

 const UsersList = () => {
    const [users, setUsers] = useState<User[]>([])
    const [searchResults, setSearchResults] = useState<User[]>([])
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [showDropdown, setShowDropdown] = useState<boolean>(false)
    const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
    const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
    const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set())
    const [receivedRequestIds, setReceivedRequestIds] = useState<Set<string>>(new Set())
    const [friendIds, setFriendIds] = useState<Set<string>>(new Set())

    const { personalInfo } = usePersonalInfo()

    useEffect(() => {
        if (!personalInfo) return
       
        // Cargar usuarios y solicitudes de amistad
        Promise.all([
            getListUsers(),
            getFriendRequests(personalInfo.id),
            getFriends(personalInfo.id)
        ]).then(([usersData, friendRequestsData, friendsData]) => {
            // Filtrar al usuario actual de la lista
            const filteredUsers = usersData.filter((user: User) => user.id !== personalInfo.id)
            setUsers(filteredUsers)
            
            // Guardar solicitudes de amistad enviadas y recibidas
            setSentRequests(friendRequestsData.sent)
            setReceivedRequests(friendRequestsData.received)
            
            // Crear set de IDs a los que ya se envió solicitud
            const sentIds = new Set<string>(
                friendRequestsData.sent
                    .filter((req: FriendRequest) => req.status === 'pending')
                    .map((req: FriendRequest) => req.receiver_id)
            )
            setSentRequestIds(sentIds)
            
            // Crear set de IDs de quienes han enviado solicitud al usuario actual
            const receivedIds = new Set<string>(
                friendRequestsData.received
                    .filter((req: FriendRequest) => req.status === 'pending')
                    .map((req: FriendRequest) => req.sender_id)
            )
            setReceivedRequestIds(receivedIds)
            
            // IDs de amigos reales (tabla friend)
            const realFriendIds = new Set<string>(friendsData.map((f: any) => f.friend_customer_id))
            setFriendIds(realFriendIds)
        })
    }, [personalInfo])

    useEffect(() => {
        if (!personalInfo) return
        
        if (searchTerm.trim() === '') {
            setSearchResults([])
            setShowDropdown(false)
        } else {
            const filtered = users.filter(user => 
                (user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.last_name.toLowerCase().includes(searchTerm.toLowerCase())) &&
                user.id !== personalInfo.id // Excluir al usuario actual también de la búsqueda
            )
            setSearchResults(filtered)
            setShowDropdown(true)
        }
    }, [searchTerm, users, personalInfo])

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
    }

    const handleFollowUser = async (userId: string) => {
        if (!personalInfo) return
        
        try {
            await sendFriendRequest({
                sender_id: personalInfo.id,
                receiver_id: userId
            })
            alert('¡Solicitud de amistad enviada exitosamente!')
            // Actualizar el estado local para reflejar que se envió la solicitud
            
            setSentRequestIds(prev => new Set([...Array.from(prev), userId]))
        } catch (error) {
            console.error('Error al enviar solicitud de amistad:', error)
            alert('Error al enviar la solicitud de amistad')
        }
    }

    const handleSendFriendRequest = async (userId: string, message?: string) => {
        if (!personalInfo) return
        
        try {
            await sendFriendRequest({
                sender_id: personalInfo.id,
                receiver_id: userId,
                message
            })
            alert('¡Solicitud de amistad enviada exitosamente!')
            // Actualizar el estado local para reflejar que se envió la solicitud
            setSentRequestIds(prev => new Set([...Array.from(prev), userId]))
        } catch (error) {
            console.error('Error al enviar solicitud de amistad:', error)
            alert('Error al enviar la solicitud de amistad')
        }
    }

    const handleAcceptFriendRequest = async (userId: string) => {
        if (!personalInfo) return
        
        try {
            await acceptFriendRequest({
                sender_id: userId,
                receiver_id: personalInfo.id
            })
            // Actualizar el estado local para reflejar que ahora son amigos
            setReceivedRequestIds(prev => {
                const newSet = new Set<string>(Array.from(prev))
                newSet.delete(userId)
                return newSet
            })
            setFriendIds(prev => new Set<string>([...Array.from(prev), userId]))
            
            alert('¡Solicitud de amistad aceptada exitosamente!')
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        }
    }

    const handleCancelFriendRequest = async (userId: string) => {
        if (!personalInfo) return
        try {
            await cancelFriendRequest(personalInfo.id, userId)
            setSentRequestIds(prev => {
                const s = new Set(Array.from(prev))
                s.delete(userId)
                return s
            })
        } catch (e: any) {
            alert(e.message || 'No se pudo cancelar la solicitud')
        }
    }

    const handleUnfriend = async (userId: string) => {
        if (!personalInfo) return
        try {
            await unfriend(personalInfo.id, userId)
            setFriendIds(prev => {
                const s = new Set(Array.from(prev))
                s.delete(userId)
                return s
            })
        } catch (e: any) {
            alert(e.message || 'No se pudo eliminar la amistad')
        }
    }

    return (
        <div className="p-6 bg-[#1E1E1E] min-h-screen">
            <h1 className="text-3xl font-bold text-white mb-8 text-center">Lista de Usuarios</h1>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-8 relative">
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder="Buscar usuarios..."
                        className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20 transition-all duration-200"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
                
                {/* Dropdown */}
                {showDropdown && searchTerm.trim() !== '' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                        {searchResults.length > 0 ? (
                            searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-3 hover:bg-gray-700 transition-colors duration-200 border-b border-gray-700 last:border-b-0"
                                >
                                    <div className="flex items-center">
                                        <div className="relative w-10 h-10 mr-3">
                                            <Image
                                                src="/feed/avatar.png"
                                                alt={`${user.first_name} ${user.last_name}`}
                                                fill
                                                className="rounded-full object-cover border border-[#73FFA2]"
                                            />
                                        </div>
                                        <span className="text-white font-medium">
                                            {user.first_name} {user.last_name}
                                        </span>
                                    </div>
                                    {friendIds.has(user.id) ? (
                                    <button 
                                            disabled
                                            className="bg-[#66DEDB] text-black px-3 py-1 rounded-lg text-sm font-medium cursor-not-allowed"
                                        >
                                            Amigos
                                        </button>
                                    ) : receivedRequestIds.has(user.id) ? (
                                        <button 
                                            onClick={() => handleAcceptFriendRequest(user.id)}
                                            className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-200"
                                        >
                                            Aceptar
                                        </button>
                                    ) : sentRequestIds.has(user.id) ? (
                                        <button 
                                            disabled
                                            className="bg-gray-600 text-gray-300 px-3 py-1 rounded-lg text-sm font-medium cursor-not-allowed"
                                        >
                                            Solicitud Enviada
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleSendFriendRequest(user.id)}
                                            className="bg-[#66DEDB] text-gray-900 px-3 py-1 rounded-lg text-sm font-medium hover:bg-[#73FFA2] transition-colors duration-200"
                                        >
                                            Agregar
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-gray-400 text-center">
                                No se encontraron usuarios
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 max-w-6xl mx-auto">
                {users.map((user) => (
                    <div key={user.id} className="bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-700 flex flex-col h-full">
                        <div className="flex flex-col items-center text-center flex-grow">
                            <div className="relative w-16 h-16 mb-3">
                                <Image
                                    src={(user as any).avatar_url || "/feed/avatar.png"}
                                    alt={`${user.first_name} ${user.last_name}`}
                                    fill
                                    className="rounded-full object-cover border-2 border-[#73FFA2]"
                                />
                            </div>
                            <h3 className="text-sm font-semibold text-white mb-1 flex-grow">
                                {user.first_name} {user.last_name}
                            </h3>
                            <p className="text-xs text-gray-400 mb-2">
                                @{((user as any).alias || (user as any).email?.split('@')[0] || 'usuario')}
                            </p>
                        </div>
                        <div className="mt-auto">
                            {friendIds.has(user.id) ? (
                                <div className="w-full text-center">
                                    <div className="space-y-2">
                                        <button 
                                            disabled
                                            className="w-full bg-[#66DEDB] text-black px-3 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
                                        >
                                            Ya son Amigos
                                        </button>
                                        <button
                                            onClick={() => handleUnfriend(user.id)}
                                            className="w-full bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                        >
                                            Eliminar amigo
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-center text-xs text-[#66DEDB]">
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                                        </svg>
                                        Amigos confirmados
                                    </div>
                                </div>
                            ) : receivedRequestIds.has(user.id) ? (
                                <div className="w-full text-center">
                                    <button 
                                        onClick={() => handleAcceptFriendRequest(user.id)}
                                        className="w-full bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-200 mb-2"
                                    >
                                        Aceptar Solicitud
                                    </button>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-green-400 flex items-center">
                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd" />
                                            </svg>
                                            Te envió solicitud
                                        </span>
                                        <button
                                            onClick={() => handleCancelFriendRequest(user.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            Rechazar
                                        </button>
                                    </div>
                                </div>
                            ) : sentRequestIds.has(user.id) ? (
                                <div className="w-full text-center">
                                    <div className="space-y-2 mb-2">
                                        <button 
                                            disabled
                                            className="w-full bg-[#66DEDB] text-black px-3 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
                                        >
                                            Solicitud Enviada
                                        </button>
                                        <button 
                                            onClick={() => handleCancelFriendRequest(user.id)}
                                            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-600"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-center text-xs text-gray-400">
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Pendiente
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleSendFriendRequest(user.id)}
                                    className="w-full bg-[#73FFA2] hover:bg-[#66DEDB] text-black px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                                >
                                    Agregar Amigo
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )



}

export default UsersList
