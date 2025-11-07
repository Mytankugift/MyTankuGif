"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { fetchListStoreProduct } from "@modules/home/components/actions/get-list-store-products"
import { getListUsers } from "@modules/social/actions/get-list-users"
import { sendFriendRequest } from "@modules/social/actions/send-friend-request"
import { acceptFriendRequest } from "@modules/social/actions/accept-friend-request"
import { getFriendRequests, FriendRequest } from "@modules/social/actions/get-friend-requests"
import { getFriends } from "@modules/social/actions/get-friends"
import { cancelFriendRequest } from "@modules/social/actions/cancel-friend-request"
import { unfriend } from "@modules/social/actions/unfriend"
import { usePersonalInfo } from "@lib/context"

interface Product {
  id: string
  title: string
  description?: string
  thumbnail?: string
  handle: string
  status: string
  created_at: string
  updated_at: string
  [key: string]: any
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_url?: string
  [key: string]: any
}

type SearchType = 'all' | 'products' | 'people'

export default function ExploreSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('all')
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  
  // Friendship state management
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set())
  const [receivedRequestIds, setReceivedRequestIds] = useState<Set<string>>(new Set())
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())

  const { personalInfo } = usePersonalInfo()

  // Load initial data
  useEffect(() => {
    if (!personalInfo) return
    
    const loadData = async () => {
      setLoading(true)
      try {
        const [productsData, usersData, friendRequestsData, friendsData] = await Promise.all([
          fetchListStoreProduct(),
          getListUsers(),
          getFriendRequests(personalInfo.id),
          getFriends(personalInfo.id)
        ])
        
        // Filter out current user from users list
        const filteredUsersData = (usersData || []).filter((user: User) => user.id !== personalInfo.id)
        
        setProducts(productsData || [])
        setUsers(filteredUsersData)
        setFilteredProducts(productsData || [])
        setFilteredUsers(filteredUsersData)
        
        // Set friendship data
        setSentRequests(friendRequestsData.sent)
        setReceivedRequests(friendRequestsData.received)
        
        // Create set of IDs for sent pending requests
        const sentIds = new Set<string>(
          friendRequestsData.sent
            .filter((req: FriendRequest) => req.status === 'pending')
            .map((req: FriendRequest) => req.receiver_id)
        )
        setSentRequestIds(sentIds)
        
        // Create set of IDs for received pending requests
        const receivedIds = new Set<string>(
          friendRequestsData.received
            .filter((req: FriendRequest) => req.status === 'pending')
            .map((req: FriendRequest) => req.sender_id)
        )
        setReceivedRequestIds(receivedIds)
        
        // Friend IDs reales (tabla friend)
        const realFriendIds = new Set<string>(friendsData.map((f: any) => f.friend_customer_id))
        setFriendIds(realFriendIds)
        
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [personalInfo])

  // Filter data based on search query
  useEffect(() => {
    if (!personalInfo) return
    
    if (!searchQuery.trim()) {
      setFilteredProducts(products)
      setFilteredUsers(users)
      return
    }

    const query = searchQuery.toLowerCase()
    
    // Filter products
    const filteredProds = products.filter(product =>
      product.title?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    )
    
    // Filter users (excluding current user)
    const filteredUsrs = users.filter(user =>
      user.id !== personalInfo.id && (
        user.first_name?.toLowerCase().includes(query) ||
        user.last_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(query)
      )
    )

    setFilteredProducts(filteredProds)
    setFilteredUsers(filteredUsrs)
  }, [searchQuery, products, users, personalInfo])

  const getDisplayData = () => {
    switch (searchType) {
      case 'products':
        return { products: filteredProducts, users: [] }
      case 'people':
        return { products: [], users: filteredUsers }
      default:
        return { products: filteredProducts, users: filteredUsers }
    }
  }

  const { products: displayProducts, users: displayUsers } = getDisplayData()

  // Friendship functions
  const handleSendFriendRequest = async (userId: string, message?: string) => {
    if (!personalInfo) return
    
    try {
      await sendFriendRequest({
        sender_id: personalInfo.id,
        receiver_id: userId,
        message
      })
      alert('¡Solicitud de amistad enviada exitosamente!')
      // Update local state to reflect sent request
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
      // Update local state to reflect accepted friendship
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
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#73FFA2] mb-4">#Explore</h2>
        <p className="text-gray-300 text-lg">
          Descubre productos y conecta con personas
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-gray-800 rounded-2xl p-6 mb-8 border border-gray-700">
        {/* Search Input */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar productos o personas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#73FFA2] focus:ring-1 focus:ring-[#73FFA2] transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2">
          {[
            { key: 'all', label: 'Todo', count: filteredProducts.length + filteredUsers.length },
            { key: 'products', label: 'Productos', count: filteredProducts.length },
            { key: 'people', label: 'Personas', count: filteredUsers.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSearchType(tab.key as SearchType)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === tab.key
                  ? 'bg-[#73FFA2] text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#73FFA2] rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-[#66DEDB] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-4 h-4 bg-[#73FFA2] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          <p className="text-gray-400 mt-2">Cargando...</p>
        </div>
      )}

      {/* Results Section */}
      {!loading && (
        <div className="space-y-8">
          {/* Products Section */}
          {displayProducts.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-[#73FFA2] mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Productos ({displayProducts.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayProducts.map((product) => (
                  <div key={product.id} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-700">
                    <div className="relative h-48">
                      <Image
                        src={product.thumbnail || "/feed/default-product.png"}
                        alt={product.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h4 className="text-white font-semibold mb-2 line-clamp-2">{product.title}</h4>
                      {product.description && (
                        <p className="text-gray-400 text-sm line-clamp-3 mb-3">{product.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.status === 'published' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {product.status === 'published' ? 'Disponible' : 'Borrador'}
                        </span>
                        <button className="text-[#73FFA2] hover:text-[#66DEDB] text-sm font-medium transition-colors">
                          Ver más
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Section */}
          {displayUsers.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-[#73FFA2] mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Personas ({displayUsers.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {displayUsers.map((user) => (
                  <div key={user.id} className="bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-700 flex flex-col h-full">
                    <div className="flex flex-col items-center text-center flex-grow">
                      <div className="relative w-16 h-16 mb-3">
                        <Image
                          src={user.avatar_url || "/feed/avatar.png"}
                          alt={`${user.first_name} ${user.last_name}`}
                          fill
                          className="rounded-full object-cover border-2 border-[#73FFA2]"
                        />
                      </div>
                      <h4 className="text-sm font-semibold text-white mb-1 flex-grow">
                        {user.first_name} {user.last_name}
                      </h4>
                      <p className="text-xs text-gray-400 mb-3">@{(user as any).alias || user.email?.split('@')[0] || 'usuario'}</p>
                    </div>
                    <div className="mt-auto">
                      {friendIds.has(user.id) ? (
                        <div className="w-full text-center">
                          <div className="space-y-2 mb-2">
                            <button 
                              disabled
                              className="w-full bg-[#66DEDB] text-black px-3 py-2 rounded-lg text-xs font-medium cursor-not-allowed"
                            >
                              Ya son Amigos
                            </button>
                            <button
                              onClick={() => handleUnfriend(user.id)}
                              className="w-full bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-700"
                            >
                              Eliminar
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
                            className="w-full bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors duration-200 mb-2"
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
                            <button onClick={() => handleCancelFriendRequest(user.id)} className="text-red-400 hover:text-red-300">
                              Rechazar
                            </button>
                          </div>
                        </div>
                      ) : sentRequestIds.has(user.id) ? (
                        <div className="w-full text-center">
                          <div className="space-y-2 mb-2">
                            <button 
                              disabled
                              className="w-full bg-[#66DEDB] text-black px-3 py-2 rounded-lg text-xs font-medium cursor-not-allowed"
                            >
                              Solicitud Enviada
                            </button>
                            <button 
                              onClick={() => handleCancelFriendRequest(user.id)}
                              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-600"
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
                          className="w-full bg-[#73FFA2] hover:bg-[#66DEDB] text-black text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                        >
                          Agregar Amigo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && displayProducts.length === 0 && displayUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-400 mb-2">
                {searchQuery ? 'No se encontraron resultados' : 'Comienza a explorar'}
              </h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? `No hay ${searchType === 'products' ? 'productos' : searchType === 'people' ? 'personas' : 'resultados'} que coincidan con "${searchQuery}"`
                  : 'Usa el buscador para encontrar productos y personas'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
