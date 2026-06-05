'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { showNotification } from '@/components/notifications'
import {
  LockClosedIcon,
  LockOpenIcon,
  PhotoIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ArrowRightIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { DetailNavActions } from '@/components/admin/DetailNavActions'
import { useAdminDetailNavStore } from '@/lib/stores/admin-detail-nav-store'

interface CategoryDetail {
  id: string
  name: string
  handle: string
  description: string | null
  imageUrl: string | null
  dropiId: number | null
  /** Catálogo solo +18 para esta rama */
  restrictToAdults: boolean
  blocked: boolean
  blockedAt: string | null
  blockedBy: string | null
  parentId: string | null
  defaultPriceFormulaType: string | null
  defaultPriceFormulaValue: any
  createdAt: string
  updatedAt: string
  productsCount: number
  totalProductsCount: number
  children: CategoryDetail[]
  locker: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  } | null
}

export default function CategoryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const categoryId = params.id as string
  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [category, setCategory] = useState<CategoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    parentId: '',
    restrictToAdults: false,
  })
  const [allCategories, setAllCategories] = useState<CategoryDetail[]>([])
  const [priceFormulas, setPriceFormulas] = useState<Array<{
    id: string
    name: string
    type: string
    value: any
    description: string | null
    isDefault: boolean
  }>>([])
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>('')
  const setDetailNav = useAdminDetailNavStore((s) => s.setDetailNav)
  const clearDetailNav = useAdminDetailNavStore((s) => s.clearDetailNav)
  const [showCreateSubcategoryModal, setShowCreateSubcategoryModal] = useState(false)
  const [newSubcategory, setNewSubcategory] = useState({
    name: '',
    description: '',
  })
  const [showUnblockConfirmModal, setShowUnblockConfirmModal] = useState(false)
  const [pendingUnblockChildren, setPendingUnblockChildren] = useState(false)
  const [showBlockConfirmModal, setShowBlockConfirmModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [showDropiIdErrorModal, setShowDropiIdErrorModal] = useState(false)
  const [imageDragOver, setImageDragOver] = useState(false)

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    if (categoryId) {
      loadCategory()
      loadAllCategories()
      loadPriceFormulas()
    }
  }, [hasHydrated, isAuthenticated, categoryId])

  useEffect(() => {
    if (category && !isEditing) {
      setEditData({
        name: category.name,
        description: category.description || '',
        parentId: category.parentId || '',
        restrictToAdults: category.restrictToAdults,
      })
      setSelectedFormulaId('')
    }
  }, [category, isEditing])

  const loadCategory = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.get<{ success: boolean; data: CategoryDetail }>(
        API_ENDPOINTS.ADMIN.CATEGORIES.BY_ID(categoryId)
      )

      if (response.data.success && response.data.data) {
        setCategory(response.data.data)
      }
    } catch (err: any) {
      console.error('Error cargando categoría:', err)
      setError(err.response?.data?.error?.message || 'Error al cargar categoría')
    } finally {
      setLoading(false)
    }
  }

  const loadAllCategories = async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: CategoryDetail[] }>(
        API_ENDPOINTS.ADMIN.CATEGORIES.LIST
      )
      if (response.data.success && Array.isArray(response.data.data)) {
        setAllCategories(response.data.data)
      }
    } catch (err) {
      console.error('Error cargando categorías:', err)
    }
  }

  const loadPriceFormulas = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean
        data: Array<{
          id: string
          name: string
          type: string
          value: any
          description: string | null
          isDefault: boolean
        }>
      }>(API_ENDPOINTS.ADMIN.PRICE_FORMULAS.LIST)
      if (response.data.success && Array.isArray(response.data.data)) {
        setPriceFormulas(response.data.data)
      }
    } catch (err) {
      console.error('Error cargando fórmulas:', err)
    }
  }

  // Función recursiva para obtener todas las categorías planas (excluyendo la actual)
  const getAllCategoriesFlat = (nodes: CategoryDetail[], excludeId: string): CategoryDetail[] => {
    const result: CategoryDetail[] = []
    if (Array.isArray(nodes)) {
      nodes.forEach((node) => {
        if (node.id !== excludeId) {
          result.push(node)
          if (node.children && Array.isArray(node.children) && node.children.length > 0) {
            result.push(...getAllCategoriesFlat(node.children, excludeId))
          }
        }
      })
    }
    return result
  }

  const availableCategories = category
    ? getAllCategoriesFlat(allCategories, category.id)
    : []

  const handleSave = async () => {
    if (!editData.name.trim()) {
      showNotification('El nombre es requerido', 'error')
      return
    }

    try {
      setActionLoading(true)

      await apiClient.patch(API_ENDPOINTS.ADMIN.CATEGORIES.UPDATE(categoryId), {
        name: editData.name,
        description: editData.description || null,
        parentId: editData.parentId || null,
        restrictToAdults: editData.restrictToAdults,
      })

      showNotification('Categoría actualizada exitosamente', 'success')
      setIsEditing(false)
      await loadCategory()
    } catch (err: any) {
      console.error('Error actualizando categoría:', err)
      showNotification(
        err.response?.data?.error?.message || 'Error al actualizar categoría',
        'error'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleBlock = async () => {
    if (!category) return

    // Si se está desbloqueando una categoría padre, mostrar modal de confirmación
    if (category.blocked && !category.parentId) {
      setShowUnblockConfirmModal(true)
      return
    }

    // Si se está bloqueando una categoría padre, mostrar modal de confirmación
    if (!category.blocked && !category.parentId) {
      setShowBlockConfirmModal(true)
      return
    }

    // Para bloquear o desbloquear subcategorías, proceder directamente
    await executeToggleBlock(false)
  }

  const executeToggleBlock = async (unblockChildren: boolean) => {
    if (!category) return

    try {
      setActionLoading(true)

      await apiClient.patch(API_ENDPOINTS.ADMIN.CATEGORIES.TOGGLE_BLOCK(categoryId), {
        blocked: !category.blocked,
        unblockChildren: unblockChildren,
      })

      showNotification(
        `Categoría ${!category.blocked ? 'bloqueada' : 'desbloqueada'} exitosamente`,
        'success'
      )
      await loadCategory()
      setShowUnblockConfirmModal(false)
    } catch (err: any) {
      console.error('Error bloqueando categoría:', err)
      showNotification(
        err.response?.data?.error?.message || 'Error al bloquear/desbloquear categoría',
        'error'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!category) return

    // Si tiene dropiId y es categoría padre, mostrar modal de error
    if (category.dropiId !== null && category.parentId === null) {
      setShowDropiIdErrorModal(true)
      return
    }

    // Mostrar modal de confirmación
    setShowDeleteConfirmModal(true)
  }

  const executeDelete = async () => {
    if (!category) return

    try {
      setActionLoading(true)

      await apiClient.delete(API_ENDPOINTS.ADMIN.CATEGORIES.DELETE(categoryId))

      showNotification('Categoría eliminada exitosamente', 'success')
      router.push('/categories')
    } catch (err: any) {
      console.error('Error eliminando categoría:', err)
      showNotification(
        err.response?.data?.error?.message || 'Error al eliminar categoría',
        'error'
      )
    } finally {
      setActionLoading(false)
      setShowDeleteConfirmModal(false)
    }
  }

  const isImageFile = (file: File) =>
    file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i.test(file.name)

  const getDroppedImageFile = (dataTransfer: DataTransfer): File | null => {
    const fromFiles = Array.from(dataTransfer.files).find(isImageFile)
    if (fromFiles) return fromFiles

    for (const item of Array.from(dataTransfer.items)) {
      if (item.kind !== 'file') continue
      const file = item.getAsFile()
      if (file && isImageFile(file)) return file
    }

    return null
  }

  const uploadImageFile = async (file: File) => {
    if (!isImageFile(file)) {
      showNotification('Solo se permiten archivos de imagen', 'error')
      return
    }

    try {
      setActionLoading(true)

      const formData = new FormData()
      formData.append('image', file)

      await apiClient.post(
        API_ENDPOINTS.ADMIN.CATEGORIES.UPLOAD_IMAGE(categoryId),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      showNotification('Imagen subida exitosamente', 'success')
      await loadCategory()
    } catch (err: any) {
      console.error('Error subiendo imagen:', err)
      showNotification(
        err.response?.data?.error?.message || 'Error al subir imagen',
        'error'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const resetImageDragState = () => {
    setImageDragOver(false)
  }

  const handleImageDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (actionLoading) return
    setImageDragOver(true)
  }

  const handleImageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (actionLoading) return

    e.dataTransfer.dropEffect = 'copy'
  }

  const handleImageDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const related = e.relatedTarget as Node | null
    if (related && e.currentTarget.contains(related)) return

    resetImageDragState()
  }

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    resetImageDragState()
    if (actionLoading) return

    const file = getDroppedImageFile(e.dataTransfer)
    if (!file) {
      showNotification('Solo se permiten archivos de imagen', 'error')
      return
    }
    await uploadImageFile(file)
  }

  const handleCreateSubcategory = async () => {
    if (!newSubcategory.name.trim()) {
      showNotification('El nombre es requerido', 'error')
      return
    }

    try {
      setActionLoading(true)

      await apiClient.post(API_ENDPOINTS.ADMIN.CATEGORIES.CREATE, {
        name: newSubcategory.name,
        description: newSubcategory.description || null,
        parentId: categoryId, // Automáticamente establece esta categoría como padre
      })

      showNotification('Subcategoría creada exitosamente', 'success')
      setShowCreateSubcategoryModal(false)
      setNewSubcategory({ name: '', description: '' })
      await loadCategory()
    } catch (err: any) {
      console.error('Error creando subcategoría:', err)
      showNotification(
        err.response?.data?.error?.message || 'Error al crear subcategoría',
        'error'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleImageDelete = async () => {
    if (!category?.imageUrl) return

    if (!confirm('¿Estás seguro de eliminar la imagen de la categoría?')) {
      return
    }

    try {
      setActionLoading(true)

      await apiClient.delete(API_ENDPOINTS.ADMIN.CATEGORIES.DELETE_IMAGE(categoryId))

      showNotification('Imagen eliminada exitosamente', 'success')
      await loadCategory()
    } catch (err: any) {
      console.error('Error eliminando imagen:', err)
      showNotification(
        err.response?.data?.error?.message || 'Error al eliminar imagen',
        'error'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetDefaultFormula = async () => {
    if (!selectedFormulaId) {
      showNotification('Selecciona una fórmula', 'error')
      return
    }

    try {
      setActionLoading(true)

      await apiClient.patch(API_ENDPOINTS.ADMIN.CATEGORIES.SET_DEFAULT_FORMULA(categoryId), {
        formulaId: selectedFormulaId,
      })

      showNotification('Fórmula por defecto configurada exitosamente', 'success')
      await loadCategory()
      setSelectedFormulaId('')
    } catch (err: any) {
      console.error('Error configurando fórmula:', err)
      showNotification(
        err.response?.data?.error?.message || 'Error al configurar fórmula',
        'error'
      )
    } finally {
      setActionLoading(false)
    }
  }

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  useEffect(() => {
    if (!category) return

    const subtitle = [
      category.handle,
      category.dropiId != null ? `Dropi ID: ${category.dropiId}` : null,
    ]
      .filter(Boolean)
      .join(' • ')

    if (isEditing) {
      setDetailNav({
        title: 'Editar categoría',
        subtitle,
        actions: [
          {
            id: 'cancel',
            label: 'Cancelar',
            variant: 'muted',
            disabled: actionLoading,
            onClick: () => setIsEditing(false),
          },
          {
            id: 'save',
            label: 'Guardar',
            variant: 'primary',
            disabled: actionLoading,
            onClick: () => void handleSave(),
          },
        ],
      })
      return
    }

    setDetailNav({
      title: category.name,
      subtitle,
      actions: [
        {
          id: 'edit',
          label: 'Editar',
          variant: 'default',
          disabled: actionLoading,
          onClick: () => setIsEditing(true),
        },
        {
          id: 'block',
          label: category.blocked ? 'Desbloquear' : 'Bloquear',
          variant: 'default',
          disabled: actionLoading,
          onClick: () => void handleToggleBlock(),
        },
        {
          id: 'delete',
          label: 'Eliminar',
          variant: 'danger',
          disabled: actionLoading,
          onClick: () => void handleDelete(),
        },
      ],
    })
  }, [category, isEditing, actionLoading, setDetailNav])

  useEffect(() => {
    return () => clearDetailNav()
  }, [clearDetailNav])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error || !category) {
    return (
      <AdminPageShell>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-red-600 mb-4">{error || 'Categoría no encontrada'}</p>
        </div>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell className="space-y-6">
          <div className="lg:hidden pb-3 border-b border-gray-200">
            <DetailNavActions placement="inline" />
          </div>

          {/* Información básica e Imagen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información básica */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h2>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={editData.description}
                      onChange={(e) =>
                        setEditData({ ...editData, description: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría Padre
                    </label>
                    <select
                      value={editData.parentId}
                      onChange={(e) => setEditData({ ...editData, parentId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sin categoría padre</option>
                      {availableCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editData.restrictToAdults}
                        onChange={(e) =>
                          setEditData({ ...editData, restrictToAdults: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm font-medium text-gray-800">
                        Catálogo solo para mayores de edad (+18)
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-7">
                      Afecta a todos los productos de esta categoría (y la marca del producto sigue aplicando con OR).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Nombre</span>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{category.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Estado</span>
                      <div className="flex items-center gap-2 mt-1">
                        {category.blocked ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium flex items-center gap-1">
                            <LockClosedIcon className="w-4 h-4" />
                            Bloqueada
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">
                            Activa
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Edad catálogo</span>
                      <div className="mt-1">
                        {category.restrictToAdults ? (
                          <span className="px-2 py-1 bg-rose-100 text-rose-900 rounded text-sm font-semibold">
                            Solo +18
                          </span>
                        ) : (
                          <span className="text-sm text-gray-700">Sin restricción +18 en categoría</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pt-2 border-t border-gray-200">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Creada</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(category.createdAt).toLocaleString('es-ES', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    {category.updatedAt && category.updatedAt !== category.createdAt && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Última modificación</span>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(category.updatedAt).toLocaleString('es-ES', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Imagen */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Imagen</h2>
              <div
                onDragEnter={handleImageDragEnter}
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
                className={`relative w-full min-h-[220px] rounded-xl overflow-hidden border-2 border-dashed ${
                  imageDragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                } ${actionLoading ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-6">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      draggable={false}
                      className="max-h-40 w-auto max-w-full rounded-lg object-contain select-none pointer-events-none shadow-sm"
                    />
                  ) : (
                    <>
                      <PhotoIcon className="w-14 h-14 text-gray-400" />
                      <p className="text-sm text-gray-500 text-center">
                        Arrastra una imagen aquí
                      </p>
                    </>
                  )}
                  <p className="text-xs text-gray-400 text-center">
                    JPG, PNG, WebP, GIF
                  </p>
                </div>

                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-blue-500/15 transition-opacity duration-150 ${
                    imageDragOver ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <p className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
                    Suelta para {category.imageUrl ? 'reemplazar' : 'subir'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-xs text-gray-500 text-center">
                  Arrastra y suelta una imagen en el recuadro
                </p>

                {category.imageUrl && (
                  <button
                    type="button"
                    onClick={handleImageDelete}
                    disabled={actionLoading}
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Eliminar imagen
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Estadísticas y Subcategorías en la misma línea */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Estadísticas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500">Productos Directos</span>
                  <p className="text-xl font-bold text-gray-900">{category.productsCount}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Total (con Subcategorías)</span>
                  <p className="text-xl font-bold text-gray-900">{category.totalProductsCount}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Subcategorías</span>
                  <p className="text-xl font-bold text-gray-900">{category.children.length}</p>
                </div>
              </div>
            </div>

            {/* Subcategorías */}
            {category.children && category.children.length > 0 ? (
              <div className="bg-white rounded-lg shadow p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FolderIcon className="w-5 h-5" />
                    Subcategorías ({category.children.length})
                  </h2>
                  <button
                    onClick={() => setShowCreateSubcategoryModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Nueva subcategoría
                  </button>
                </div>
                <div className="space-y-2 overflow-y-auto max-h-[500px] pr-2 -mr-2">
                  {category.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/categories/${child.id}`}
                      className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all group"
                    >
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                        {child.imageUrl ? (
                          <img
                            src={child.imageUrl}
                            alt={child.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PhotoIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {child.name}
                          </p>
                          {child.blocked && (
                            <LockClosedIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          {child.dropiId && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              Dropi: {child.dropiId}
                            </span>
                          )}
                        </div>
                        {child.description && (
                          <p className="text-sm text-gray-500 truncate mb-1">{child.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{child.productsCount} producto(s) directo(s)</span>
                          <span>•</span>
                          <span>{child.totalProductsCount} total</span>
                          {child.children && child.children.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{child.children.length} subcategoría(s)</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FolderIcon className="w-5 h-5" />
                    Subcategorías
                  </h2>
                  <button
                    onClick={() => setShowCreateSubcategoryModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Nueva subcategoría
                  </button>
                </div>
                <p className="text-sm text-gray-500">No hay subcategorías</p>
              </div>
            )}
          </div>

          {/* Fórmula por defecto */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Fórmula de Precio por Defecto</h2>

            {category.defaultPriceFormulaType ? (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Fórmula actual: <span className="font-medium">{category.defaultPriceFormulaType}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {JSON.stringify(category.defaultPriceFormulaValue)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">No hay fórmula configurada</p>
            )}

            <div className="flex gap-2">
              <select
                value={selectedFormulaId}
                onChange={(e) => setSelectedFormulaId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar fórmula...</option>
                {priceFormulas.map((formula) => (
                  <option key={formula.id} value={formula.id}>
                    {formula.name} ({formula.type})
                  </option>
                ))}
              </select>
              <button
                onClick={handleSetDefaultFormula}
                disabled={actionLoading || !selectedFormulaId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar
              </button>
            </div>
          </div>

      {/* Modal Nueva Subcategoría */}
      {showCreateSubcategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Nueva Subcategoría</h2>
              <button
                onClick={() => {
                  setShowCreateSubcategoryModal(false)
                  setNewSubcategory({ name: '', description: '' })
                }}
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
                  value={newSubcategory.name}
                  onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Camisetas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={newSubcategory.description}
                  onChange={(e) =>
                    setNewSubcategory({ ...newSubcategory, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Descripción opcional..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateSubcategoryModal(false)
                    setNewSubcategory({ name: '', description: '' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateSubcategory}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para desbloquear categoría padre */}
      {showUnblockConfirmModal && category && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Desbloquear Categoría</h2>
              <button
                onClick={() => {
                  setShowUnblockConfirmModal(false)
                  setPendingUnblockChildren(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                Estás a punto de desbloquear la categoría <strong>"{category.name}"</strong>.
              </p>
              {category.children && category.children.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-3">
                    Esta categoría tiene <strong>{category.children.length}</strong> subcategoría(s).
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
                    setPendingUnblockChildren(false)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => executeToggleBlock(pendingUnblockChildren)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Procesando...' : 'Desbloquear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para bloquear categoría padre */}
      {showBlockConfirmModal && category && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Bloquear Categoría</h2>
              <button
                onClick={() => setShowBlockConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                Estás a punto de bloquear la categoría <strong>"{category.name}"</strong>.
              </p>
              {category.children && category.children.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Advertencia:</strong> Al bloquear esta categoría, también se bloquearán automáticamente todas sus <strong>{category.children.length} subcategoría(s)</strong>.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBlockConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowBlockConfirmModal(false)
                    executeToggleBlock(false)
                  }}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Procesando...' : 'Bloquear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar categoría */}
      {showDeleteConfirmModal && category && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Eliminar Categoría</h2>
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                ¿Estás seguro de eliminar la categoría <strong>"{category.name}"</strong>?
              </p>
              <p className="text-sm text-red-600">
                Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDelete}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de error para categoría con dropiId */}
      {showDropiIdErrorModal && category && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">No se puede eliminar</h2>
              <button
                onClick={() => setShowDropiIdErrorModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                No se puede eliminar la categoría <strong>"{category.name}"</strong> porque tiene un <strong>dropiId</strong> y está sincronizada desde Dropi.
              </p>
              <p className="text-sm text-gray-600">
                Las categorías sincronizadas desde Dropi no pueden ser eliminadas para mantener la integridad de los datos.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDropiIdErrorModal(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}

