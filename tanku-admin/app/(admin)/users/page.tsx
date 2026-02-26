'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

interface AdminUser {
  id: string
  email: string
  role: 'SUPER_ADMIN' | 'PRODUCT_MANAGER'
  firstName: string | null
  lastName: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export default function UsersPage() {
  const router = useRouter()
  const { user: currentUser, isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'PRODUCT_MANAGER' as 'SUPER_ADMIN' | 'PRODUCT_MANAGER',
    firstName: '',
    lastName: '',
    active: true,
  })

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    loadUsers()
  }, [hasHydrated, isAuthenticated])

  // Filtrar usuarios por búsqueda
  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users)
      return
    }

    const searchLower = search.toLowerCase()
    const filtered = users.filter((user) => {
      const email = user.email.toLowerCase()
      const firstName = (user.firstName || '').toLowerCase()
      const lastName = (user.lastName || '').toLowerCase()
      const fullName = `${firstName} ${lastName}`.trim()
      
      return (
        email.includes(searchLower) ||
        firstName.includes(searchLower) ||
        lastName.includes(searchLower) ||
        fullName.includes(searchLower)
      )
    })
    setFilteredUsers(filtered)
  }, [search, users])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('[USERS] Cargando usuarios desde:', API_ENDPOINTS.ADMIN.USERS.LIST)
      const response = await apiClient.get<{ success: boolean; data: AdminUser[] }>(
        API_ENDPOINTS.ADMIN.USERS.LIST
      )
      console.log('[USERS] Respuesta recibida:', response.data)
      if (response.data.success) {
        setUsers(response.data.data)
        setFilteredUsers(response.data.data)
      }
    } catch (err: any) {
      console.error('[USERS] Error completo:', err)
      console.error('[USERS] Status:', err.response?.status)
      console.error('[USERS] Data:', err.response?.data)
      console.error('[USERS] URL:', err.config?.url)
      
      if (err.response?.status === 404) {
        setError('Endpoint no encontrado. Verifica que el backend esté corriendo y tenga las rutas registradas.')
      } else if (err.response?.status === 401) {
        setError('No autorizado. Verifica que estés autenticado.')
      } else {
        setError(err.response?.data?.error?.message || err.message || 'Error al cargar usuarios')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({
      email: '',
      password: '',
      role: 'PRODUCT_MANAGER',
      firstName: '',
      lastName: '',
      active: true,
    })
    setEditingUser(null)
    setShowCreateModal(true)
  }

  const handleEdit = (user: AdminUser) => {
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      active: user.active,
    })
    setEditingUser(user)
    setShowCreateModal(true)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return

    try {
      await apiClient.delete(API_ENDPOINTS.ADMIN.USERS.DELETE(userId))
      await loadUsers()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error al eliminar usuario')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUser) {
        // Actualizar
        await apiClient.patch(API_ENDPOINTS.ADMIN.USERS.UPDATE(editingUser.id), formData)
      } else {
        // Crear
        if (!formData.password) {
          alert('La contraseña es requerida para crear un usuario')
          return
        }
        await apiClient.post(API_ENDPOINTS.ADMIN.USERS.CREATE, formData)
      }
      setShowCreateModal(false)
      await loadUsers()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error al guardar usuario')
    }
  }

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="max-w-7xl mx-auto">
          {/* Filters - Todo en una sola barra */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              {/* Search - Ocupa el resto del espacio */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Botón Crear usuario */}
              <button
                onClick={handleCreate}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Crear usuario
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 pt-0">

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium mb-2">{error}</p>
              {error.includes('404') || error.includes('no encontrado') ? (
                <div className="text-xs text-red-600 mt-2 space-y-1">
                  <p>• Verifica que el backend esté corriendo en el puerto correcto</p>
                  <p>• Reinicia el backend para cargar las nuevas rutas</p>
                  <p>• Verifica la URL del API en la configuración</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-gray-500 mt-3">Cargando usuarios...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <UserCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">
                  {search ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserCircleIcon className="w-8 h-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          {(user.firstName || user.lastName) && (
                            <div className="text-sm text-gray-500">
                              {user.firstName} {user.lastName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'SUPER_ADMIN'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {user.role === 'SUPER_ADMIN' ? (
                          <>
                            <ShieldCheckIcon className="w-3 h-3" />
                            Super Admin
                          </>
                        ) : (
                          'Product Manager'
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            )}
          </div>

          {/* Modal Create/Edit */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingUser ? 'Editar Usuario' : 'Crear Usuario'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as 'SUPER_ADMIN' | 'PRODUCT_MANAGER' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="PRODUCT_MANAGER">Product Manager</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-gray-700">
                    Usuario activo
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {editingUser ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

