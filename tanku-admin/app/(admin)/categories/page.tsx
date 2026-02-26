'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  PhotoIcon,
  XMarkIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface CategoryTreeNode {
  id: string
  name: string
  handle: string
  description: string | null
  imageUrl: string | null
  dropiId: number | null
  blocked: boolean
  blockedAt: string | null
  blockedBy: string | null
  parentId: string | null
  defaultPriceFormulaType: string | null
  defaultPriceFormulaValue: any
  productsCount: number
  totalProductsCount: number
  children: CategoryTreeNode[]
  locker: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  } | null
}

interface CategoryTreeProps {
  categories: CategoryTreeNode[]
  onEdit: (category: CategoryTreeNode) => void
  onDelete: (category: CategoryTreeNode) => void
  onToggleBlock: (category: CategoryTreeNode) => void
  expandedNodes: Set<string>
  onToggleExpand: (id: string) => void
  level?: number
}

function CategoryTreeItem({
  category,
  onEdit,
  onDelete,
  onToggleBlock,
  expandedNodes,
  onToggleExpand,
  level = 0,
}: {
  category: CategoryTreeNode
  onEdit: (category: CategoryTreeNode) => void
  onDelete: (category: CategoryTreeNode) => void
  onToggleBlock: (category: CategoryTreeNode) => void
  expandedNodes: Set<string>
  onToggleExpand: (id: string) => void
  level: number
}) {
  const hasChildren = category.children.length > 0
  const isExpanded = expandedNodes.has(category.id)
  const indent = level * 24

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 border-b border-gray-200 bg-white"
        style={{ paddingLeft: `${16 + indent}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => hasChildren && onToggleExpand(category.id)}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>

        {/* Image */}
        <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-gray-200 overflow-hidden border border-gray-300">
          {category.imageUrl ? (
            <img
              src={category.imageUrl}
              alt={category.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <PhotoIcon className="w-5 h-5 text-gray-500" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 truncate">{category.name}</span>
            {category.blocked && (
              <LockClosedIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
            {category.dropiId && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                Dropi: {category.dropiId}
              </span>
            )}
          </div>
          {category.description && (
            <p className="text-sm text-gray-600 truncate mt-0.5">{category.description}</p>
          )}
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
            <span className="font-medium">{category.productsCount} producto(s) directo(s)</span>
            <span className="font-medium">{category.totalProductsCount} total (con hijos)</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/categories/${category.id}`}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Editar"
          >
            <PencilIcon className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onToggleBlock(category)}
            className={`p-2 rounded transition-colors ${
              category.blocked
                ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title={category.blocked ? 'Desbloquear' : 'Bloquear'}
          >
            {category.blocked ? (
              <LockClosedIcon className="w-4 h-4" />
            ) : (
              <LockOpenIcon className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onDelete(category)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Eliminar"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {category.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleBlock={onToggleBlock}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const router = useRouter()
  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [categories, setCategories] = useState<CategoryTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUnblockConfirmModal, setShowUnblockConfirmModal] = useState(false)
  const [pendingUnblockCategory, setPendingUnblockCategory] = useState<CategoryTreeNode | null>(null)
  const [pendingUnblockChildren, setPendingUnblockChildren] = useState(false)
  const [showBlockConfirmModal, setShowBlockConfirmModal] = useState(false)
  const [pendingBlockCategory, setPendingBlockCategory] = useState<CategoryTreeNode | null>(null)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<CategoryTreeNode | null>(null)
  const [showDropiIdErrorModal, setShowDropiIdErrorModal] = useState(false)
  const [pendingDropiIdCategory, setPendingDropiIdCategory] = useState<CategoryTreeNode | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    parentId: '',
  })

  // Cargar categorías
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await apiClient.get<{ success: boolean; data: CategoryTreeNode[] }>(
        `${API_ENDPOINTS.ADMIN.CATEGORIES.LIST}?${params.toString()}`
      )

      if (response.data.success && Array.isArray(response.data.data)) {
        const categoriesData = response.data.data
        setCategories(categoriesData)
        // Expandir todos los nodos por defecto
        const allIds = new Set<string>()
        const collectIds = (nodes: CategoryTreeNode[]) => {
          if (Array.isArray(nodes)) {
            nodes.forEach((node) => {
              allIds.add(node.id)
              if (node.children && node.children.length > 0) {
                collectIds(node.children)
              }
            })
          }
        }
        collectIds(categoriesData)
        setExpandedNodes(allIds)
      }
    } catch (err: any) {
      console.error('Error cargando categorías:', err)
      setError(err.response?.data?.error?.message || 'Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      loadCategories()
    }
  }, [hasHydrated, isAuthenticated, loadCategories])

  const handleToggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleToggleBlock = async (category: CategoryTreeNode) => {
    // Si se está desbloqueando una categoría padre, mostrar modal de confirmación
    if (category.blocked && !category.parentId) {
      setPendingUnblockCategory(category)
      setShowUnblockConfirmModal(true)
      return
    }

    // Si se está bloqueando una categoría padre, mostrar modal de confirmación
    if (!category.blocked && !category.parentId) {
      setPendingBlockCategory(category)
      setShowBlockConfirmModal(true)
      return
    }

    // Para bloquear o desbloquear subcategorías, proceder directamente
    await executeToggleBlock(category, false)
  }

  const executeToggleBlock = async (category: CategoryTreeNode, unblockChildren: boolean) => {
    try {
      const response = await apiClient.patch<{ success: boolean }>(
        API_ENDPOINTS.ADMIN.CATEGORIES.TOGGLE_BLOCK(category.id),
        { 
          blocked: !category.blocked,
          unblockChildren: unblockChildren,
        }
      )

      if (response.data.success) {
        await loadCategories()
        setShowUnblockConfirmModal(false)
        setPendingUnblockCategory(null)
        setPendingUnblockChildren(false)
      }
    } catch (err: any) {
      console.error('Error bloqueando categoría:', err)
      alert(err.response?.data?.error?.message || 'Error al bloquear/desbloquear categoría')
    }
  }

  const handleDelete = async (category: CategoryTreeNode) => {
    // Si tiene dropiId y es categoría padre, mostrar modal de error
    if (category.dropiId !== null && category.parentId === null) {
      setPendingDropiIdCategory(category)
      setShowDropiIdErrorModal(true)
      return
    }

    setPendingDeleteCategory(category)
    setShowDeleteConfirmModal(true)
  }

  const executeDelete = async (category: CategoryTreeNode) => {
    try {
      const response = await apiClient.delete<{ success: boolean }>(
        API_ENDPOINTS.ADMIN.CATEGORIES.DELETE(category.id)
      )
      if (response.data.success) {
        await loadCategories()
        setShowDeleteConfirmModal(false)
        setPendingDeleteCategory(null)
      }
    } catch (err: any) {
      console.error('Error eliminando categoría:', err)
      alert(err.response?.data?.error?.message || 'Error al eliminar categoría')
    }
  }

  const handleCreate = async () => {
    if (!newCategory.name.trim()) {
      alert('El nombre es requerido')
      return
    }

    try {
      const response = await apiClient.post<{ success: boolean }>(
        API_ENDPOINTS.ADMIN.CATEGORIES.CREATE,
        {
          name: newCategory.name,
          description: newCategory.description || null,
          parentId: newCategory.parentId || null,
        }
      )

      if (response.data.success) {
        setShowCreateModal(false)
        setNewCategory({ name: '', description: '', parentId: '' })
        await loadCategories()
      }
    } catch (err: any) {
      console.error('Error creando categoría:', err)
      alert(err.response?.data?.error?.message || 'Error al crear categoría')
    }
  }

  // Función recursiva para obtener todas las categorías planas (para el select de padre)
  const getAllCategoriesFlat = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
    const result: CategoryTreeNode[] = []
    if (Array.isArray(nodes)) {
      nodes.forEach((node) => {
        result.push(node)
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          result.push(...getAllCategoriesFlat(node.children))
        }
      })
    }
    return result
  }

  const allCategoriesFlat = getAllCategoriesFlat(categories)

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
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
                    placeholder="Buscar categorías..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Botón Nueva categoría */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Nueva categoría
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto h-full">
          {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-600 mb-2">{error}</p>
              <button
                onClick={loadCategories}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No hay categorías</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear Primera Categoría
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {categories.map((category) => (
              <CategoryTreeItem
                key={category.id}
                category={category}
                onEdit={(cat) => router.push(`/categories/${cat.id}`)}
                onDelete={handleDelete}
                onToggleBlock={handleToggleBlock}
                expandedNodes={expandedNodes}
                onToggleExpand={handleToggleExpand}
                level={0}
              />
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Nueva Categoría</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Ropa Deportiva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Descripción opcional..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría Padre (opcional)
                </label>
                <select
                  value={newCategory.parentId}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, parentId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sin categoría padre</option>
                  {allCategoriesFlat
                    .filter((cat) => !cat.parentId) // Solo categorías principales (sin padre)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para desbloquear categoría padre */}
      {showUnblockConfirmModal && pendingUnblockCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Desbloquear Categoría</h2>
              <button
                onClick={() => {
                  setShowUnblockConfirmModal(false)
                  setPendingUnblockCategory(null)
                  setPendingUnblockChildren(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                Estás a punto de desbloquear la categoría <strong>"{pendingUnblockCategory.name}"</strong>.
              </p>
              {pendingUnblockCategory.children && pendingUnblockCategory.children.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-3">
                    Esta categoría tiene <strong>{pendingUnblockCategory.children.length}</strong> subcategoría(s).
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pendingUnblockChildren}
                        onChange={(e) => setPendingUnblockChildren(e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-yellow-800">
                        También desbloquear todas las subcategorías
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowUnblockConfirmModal(false)
                    setPendingUnblockCategory(null)
                    setPendingUnblockChildren(false)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => pendingUnblockCategory && executeToggleBlock(pendingUnblockCategory, pendingUnblockChildren)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Desbloquear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para bloquear categoría padre */}
      {showBlockConfirmModal && pendingBlockCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Bloquear Categoría</h2>
              <button
                onClick={() => {
                  setShowBlockConfirmModal(false)
                  setPendingBlockCategory(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                Estás a punto de bloquear la categoría <strong>"{pendingBlockCategory.name}"</strong>.
              </p>
              {pendingBlockCategory.children && pendingBlockCategory.children.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Advertencia:</strong> Al bloquear esta categoría, también se bloquearán automáticamente todas sus <strong>{pendingBlockCategory.children.length} subcategoría(s)</strong>.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowBlockConfirmModal(false)
                    setPendingBlockCategory(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowBlockConfirmModal(false)
                    executeToggleBlock(pendingBlockCategory, false)
                    setPendingBlockCategory(null)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Bloquear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar categoría */}
      {showDeleteConfirmModal && pendingDeleteCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Eliminar Categoría</h2>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false)
                  setPendingDeleteCategory(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                ¿Estás seguro de eliminar la categoría <strong>"{pendingDeleteCategory.name}"</strong>?
              </p>
              <p className="text-sm text-red-600">
                Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false)
                    setPendingDeleteCategory(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => executeDelete(pendingDeleteCategory)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de error para categoría con dropiId */}
      {showDropiIdErrorModal && pendingDropiIdCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">No se puede eliminar</h2>
              <button
                onClick={() => {
                  setShowDropiIdErrorModal(false)
                  setPendingDropiIdCategory(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                No se puede eliminar la categoría <strong>"{pendingDropiIdCategory.name}"</strong> porque tiene un <strong>dropiId</strong> y está sincronizada desde Dropi.
              </p>
              <p className="text-sm text-gray-600">
                Las categorías sincronizadas desde Dropi no pueden ser eliminadas para mantener la integridad de los datos.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDropiIdErrorModal(false)
                    setPendingDropiIdCategory(null)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

