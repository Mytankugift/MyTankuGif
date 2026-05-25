'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { showNotification, closeNotification } from '@/components/notifications'
import {
  LockClosedIcon,
  LockOpenIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { DetailNavActions } from '@/components/admin/DetailNavActions'
import { useAdminDetailNavStore } from '@/lib/stores/admin-detail-nav-store'

interface WarehouseVariant {
  id: string
  warehouseId: number
  warehouseName: string | null
  warehouseCity: string | null
  stock: number
}

interface ProductVariant {
  id: string
  sku: string
  title: string
  price: number
  suggestedPrice: number | null
  tankuPrice: number | null
  stock: number
  active: boolean
  tankuPriceLocked: boolean
  warehouseVariants: WarehouseVariant[]
}

interface ProductDetail {
  id: string
  title: string
  handle: string
  description: string | null
  images: string[]
  customImageUrls: string[]
  hiddenImages: string[]
  categoryId: string | null
  restrictToAdults: boolean
  active: boolean
  lockedByAdmin: boolean
  lockedAt: string | null
  lockedBy: string | null
  priceFormulaType: string | null
  priceFormulaValue: any
  createdAt: string
  updatedAt: string
  inRanking: boolean
  dropiId: number | null
  inDropiCatalog: boolean
  removedFromCatalogAt: string | null
  hasOrderHistory: boolean
  catalogLabel: string
  rankingInfo: {
    globalScore: number
    createdAt: string
    updatedAt: string
  } | null
  metrics: {
    wishlistCount: number
    ordersCount: number
    likesCount: number
    commentsCount: number
    updatedAt: string
  } | null
  category: {
    id: string
    name: string
    handle: string
    restrictToAdults: boolean
  } | null
  variants: ProductVariant[]
  locker: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  } | null
}

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const { isAuthenticated, _hasHydrated: hasHydrated, user } = useAdminAuthStore()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    categoryId: '',
    restrictToAdults: false,
  })
  const [editingVariantTitle, setEditingVariantTitle] = useState<string | null>(null)
  const [variantTitleValue, setVariantTitleValue] = useState('')
  const [categories, setCategories] = useState<Array<{ id: string; name: string; handle: string }>>([])
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>('')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('')
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string; handle: string }>>([])
  const [allCategoriesTree, setAllCategoriesTree] = useState<any[]>([])
  const setDetailNav = useAdminDetailNavStore((s) => s.setDetailNav)
  const clearDetailNav = useAdminDetailNavStore((s) => s.clearDetailNav)
  const [priceFormulas, setPriceFormulas] = useState<Array<{
    id: string
    name: string
    type: string
    value: any
    description: string | null
    isDefault: boolean
  }>>([])
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>('')
  const [loadingFormulas, setLoadingFormulas] = useState(false)

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    if (productId) {
      loadProduct()
      loadCategories()
      loadPriceFormulas()
    }
  }, [hasHydrated, isAuthenticated, productId])

  // Cargar información de categorías cuando el producto esté disponible
  useEffect(() => {
    if (product) {
      loadAllCategoriesForCheck()
    }
  }, [product])

  // Efecto para cargar subcategorías cuando cambia el padre seleccionado
  useEffect(() => {
    if (selectedParentCategory) {
      loadSubcategories(selectedParentCategory)
      // No resetear aquí, se maneja en loadAllCategoriesForCheck o cuando el usuario cambia manualmente
    } else {
      setSubcategories([])
      setSelectedSubcategory('')
    }
  }, [selectedParentCategory])

  // Inicializar datos de edición cuando se carga el producto
  useEffect(() => {
    if (product && !isEditing) {
      setEditData({
        title: product.title,
        description: product.description || '',
        categoryId: product.categoryId || '',
        restrictToAdults: product.restrictToAdults,
      })
    }
  }, [product, isEditing])

  const loadProduct = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.get<{ success: boolean; data: ProductDetail }>(
        API_ENDPOINTS.ADMIN.PRODUCTS.BY_ID(productId)
      )
      if (response.data.success) {
        setProduct(response.data.data)
      }
    } catch (err: any) {
      console.error('Error cargando producto:', err)
      setError(err.response?.data?.error?.message || 'Error al cargar producto')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      // Cargar solo categorías principales (sin padre)
      const response = await apiClient.get<{ success: boolean; data: Array<{ id: string; name: string; handle: string }> }>(
        `${API_ENDPOINTS.ADMIN.CATEGORIES.LIST}?parentId=null`
      )
      if (response.data.success && Array.isArray(response.data.data)) {
        setCategories(response.data.data)
      }
    } catch (err: any) {
      console.error('Error cargando categorías:', err)
      setCategories([])
    }
  }

  const loadSubcategories = async (parentId: string): Promise<void> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: any[] }>(
        `${API_ENDPOINTS.ADMIN.CATEGORIES.LIST}?parentId=${parentId}`
      )
      if (response.data.success && Array.isArray(response.data.data)) {
        console.log(`Subcategorías cargadas para ${parentId}:`, response.data.data.length)
        setSubcategories(response.data.data)
      } else {
        console.log(`No se encontraron subcategorías para ${parentId}`)
        setSubcategories([])
      }
    } catch (err: any) {
      console.error('Error cargando subcategorías:', err)
      setSubcategories([])
    }
  }

  const loadAllCategoriesForCheck = async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: any[] }>(
        API_ENDPOINTS.ADMIN.CATEGORIES.LIST
      )
      if (response.data.success && Array.isArray(response.data.data)) {
        setAllCategoriesTree(response.data.data)
        
        // Si hay producto, determinar si es padre o hijo
        if (product?.categoryId) {
          const findCategory = (nodes: any[], targetId: string): any => {
            for (const node of nodes) {
              if (node.id === targetId) {
                return node
              }
              if (node.children && node.children.length > 0) {
                const found = findCategory(node.children, targetId)
                if (found) return found
              }
            }
            return null
          }
          
          const categoryNode = findCategory(response.data.data, product.categoryId)
          if (categoryNode) {
            console.log('Categoría encontrada:', categoryNode.name, 'parentId:', categoryNode.parentId)
            if (categoryNode.parentId) {
              // Es subcategoría
              setSelectedParentCategory(categoryNode.parentId)
              setSelectedSubcategory(categoryNode.id)
              await loadSubcategories(categoryNode.parentId)
            } else {
              // Es categoría padre
              console.log('Es categoría padre, cargando subcategorías...')
              setSelectedParentCategory(categoryNode.id)
              setSelectedSubcategory('') // Por defecto "Sin subcategoría"
              // Cargar subcategorías inmediatamente
              await loadSubcategories(categoryNode.id)
            }
          } else {
            console.log('No se encontró la categoría del producto')
          }
        }
      }
    } catch (err: any) {
      console.error('Error cargando todas las categorías:', err)
    }
  }

  const loadPriceFormulas = async () => {
    try {
      setLoadingFormulas(true)
      const response = await apiClient.get<{ success: boolean; data: Array<any> }>(
        API_ENDPOINTS.ADMIN.PRICE_FORMULAS.LIST
      )
      if (response.data.success) {
        setPriceFormulas(response.data.data)
      }
    } catch (err: any) {
      console.error('Error cargando fórmulas:', err)
      setPriceFormulas([])
    } finally {
      setLoadingFormulas(false)
    }
  }

  const handleApplyFormula = async () => {
    if (!product || !selectedFormulaId) return
    
    let loadingNotificationId: string | undefined
    try {
      setActionLoading(true)
      loadingNotificationId = showNotification('Aplicando fórmula...', 'info', 0) as any
      
      const response = await apiClient.post<{ success: boolean; data: ProductDetail }>(
        API_ENDPOINTS.ADMIN.PRODUCTS.APPLY_PRICE_FORMULA(product.id),
        { formulaId: selectedFormulaId }
      )
      
      if (response.data.success) {
        if (loadingNotificationId) {
          closeNotification(loadingNotificationId)
        }
        setProduct(response.data.data)
        setSelectedFormulaId('')
        showNotification('Fórmula aplicada correctamente. Todos los precios han sido recalculados.', 'success')
      }
    } catch (err: any) {
      console.error('Error aplicando fórmula:', err)
      if (loadingNotificationId) {
        closeNotification(loadingNotificationId)
      }
      showNotification(err.response?.data?.error?.message || 'Error al aplicar fórmula', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const getFormulaDescription = (formulaType: string | null, formulaValue: any): string => {
    if (!formulaType || !formulaValue) return 'Estándar: (base × 1.15) + $10,000'
    
    switch (formulaType) {
      case 'STANDARD':
        return '(base × 1.15) + $10,000'
      case 'CUSTOM_STANDARD':
        const mult = formulaValue.multiplier || 1.15
        const fixed = formulaValue.fixedAmount || 10000
        return `(base × ${mult}) + $${fixed.toLocaleString('es-CO')}`
      case 'PERCENTAGE':
        return `base × (1 + ${formulaValue.percentage || 0}%)`
      case 'FIXED':
        return `base + $${(formulaValue.fixed || 0).toLocaleString('es-CO')}`
      case 'MIN_MARGIN':
        return `base + max(15% de base, $${(formulaValue.minMargin || 0).toLocaleString('es-CO')})`
      default:
        return JSON.stringify(formulaValue)
    }
  }

  const formatPrice = (price: number | null) => {
    if (!price) return '-'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const handleLock = async () => {
    if (!product) return
    try {
      setActionLoading(true)
      await apiClient.post(API_ENDPOINTS.ADMIN.PRODUCTS.LOCK(product.id))
      await loadProduct() // Recargar para obtener info actualizada
    } catch (err: any) {
      console.error('Error bloqueando producto:', err)
      alert(err.response?.data?.error?.message || 'Error al bloquear producto')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnlock = async () => {
    if (!product) return
    try {
      setActionLoading(true)
      await apiClient.post(API_ENDPOINTS.ADMIN.PRODUCTS.UNLOCK(product.id))
      await loadProduct() // Recargar para obtener info actualizada
    } catch (err: any) {
      console.error('Error desbloqueando producto:', err)
      alert(err.response?.data?.error?.message || 'Error al desbloquear producto')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleActive = async () => {
    if (!product) return
    let loadingNotificationId: string | undefined
    try {
      setActionLoading(true)
      loadingNotificationId = showNotification('Guardando cambios...', 'info', 0) as any
      
      await apiClient.patch(API_ENDPOINTS.ADMIN.PRODUCTS.TOGGLE_ACTIVE(product.id), {
        active: !product.active,
      })
      // Cerrar notificación de carga
      if (loadingNotificationId) {
        closeNotification(loadingNotificationId)
      }
      await loadProduct() // Recargar para obtener info actualizada
      showNotification(`Producto ${!product.active ? 'activado' : 'desactivado'} correctamente`, 'success')
    } catch (err: any) {
      console.error('Error cambiando estado:', err)
      // Cerrar notificación de carga
      if (loadingNotificationId) {
        closeNotification(loadingNotificationId)
      }
      showNotification(err.response?.data?.error?.message || 'Error al cambiar estado', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveProduct = async () => {
    if (!product) return
    let loadingNotificationId: string | undefined
    try {
      setActionLoading(true)
      loadingNotificationId = showNotification('Guardando...', 'info', 0) as any
      
      // Determinar categoryId final: si hay subcategoría seleccionada, usar esa; si no, usar padre
      const finalCategoryId = selectedSubcategory || selectedParentCategory || null
      
      const response = await apiClient.patch<{ success: boolean; data: ProductDetail }>(
        API_ENDPOINTS.ADMIN.PRODUCTS.UPDATE(product.id),
        {
          title: editData.title,
          description: editData.description || null,
          categoryId: finalCategoryId,
          restrictToAdults: editData.restrictToAdults,
        }
      )
      if (response.data.success) {
        // Cerrar notificación de carga
        if (loadingNotificationId) {
          closeNotification(loadingNotificationId)
        }
        setProduct(response.data.data)
        setIsEditing(false)
        showNotification('Producto guardado correctamente', 'success')
      }
    } catch (err: any) {
      console.error('Error guardando producto:', err)
      // Cerrar notificación de carga
      if (loadingNotificationId) {
        closeNotification(loadingNotificationId)
      }
      showNotification(err.response?.data?.error?.message || 'Error al guardar producto', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelEdit = () => {
    if (product) {
      setEditData({
        title: product.title,
        description: product.description || '',
        categoryId: product.categoryId || '',
        restrictToAdults: product.restrictToAdults,
      })
      // Resetear estados de categoría
      loadAllCategoriesForCheck()
    }
    setIsEditing(false)
  }

  const handleStartEdit = () => {
    if (product) {
      setEditData({
        title: product.title,
        description: product.description || '',
        categoryId: product.categoryId || '',
        restrictToAdults: product.restrictToAdults,
      })
      // Cargar información de categoría para determinar padre/hijo
      loadAllCategoriesForCheck()
      // Si ya hay una categoría padre seleccionada, asegurar que se carguen subcategorías
      if (selectedParentCategory) {
        loadSubcategories(selectedParentCategory)
      }
    }
    setIsEditing(true)
  }

  const handleStartEditVariantTitle = (variant: ProductVariant) => {
    setEditingVariantTitle(variant.id)
    setVariantTitleValue(variant.title)
  }

  const handleSaveVariantTitle = async (variantId: string) => {
    if (!product) return
    let loadingNotificationId: string | undefined
    try {
      setActionLoading(true)
      loadingNotificationId = showNotification('Guardando variante...', 'info', 0) as any
      
      await apiClient.patch(
        API_ENDPOINTS.ADMIN.PRODUCTS.UPDATE_VARIANT_TITLE(product.id, variantId),
        {
          title: variantTitleValue,
        }
      )
      // Cerrar notificación de carga
      if (loadingNotificationId) {
        closeNotification(loadingNotificationId)
      }
      await loadProduct() // Recargar para obtener info actualizada
      setEditingVariantTitle(null)
      showNotification('Variante guardada correctamente', 'success')
    } catch (err: any) {
      console.error('Error guardando título de variante:', err)
      // Cerrar notificación de carga
      if (loadingNotificationId) {
        closeNotification(loadingNotificationId)
      }
      showNotification(err.response?.data?.error?.message || 'Error al guardar variante', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelEditVariantTitle = () => {
    setEditingVariantTitle(null)
    setVariantTitleValue('')
  }

  const handleSetMainImage = async (imageIndex: number) => {
    if (!product) return
    let loadingNotificationId: string | undefined
    try {
      setActionLoading(true)
      loadingNotificationId = showNotification('Reordenando imágenes...', 'info', 0) as any
      
      const response = await apiClient.patch<{ success: boolean; data: ProductDetail }>(
        API_ENDPOINTS.ADMIN.PRODUCTS.REORDER_IMAGES(product.id),
        {
          imageIndex,
        }
      )
      
      if (response.data.success) {
        // Cerrar notificación de carga
        if (loadingNotificationId) {
          closeNotification(loadingNotificationId)
        }
        setProduct(response.data.data)
        showNotification('Imagen principal actualizada', 'success')
      }
    } catch (err: any) {
      console.error('Error reordenando imágenes:', err)
      // Cerrar notificación de carga
      if (loadingNotificationId) {
        closeNotification(loadingNotificationId)
      }
      showNotification(err.response?.data?.error?.message || 'Error al cambiar imagen principal', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUploadImage = async (file: File) => {
    if (!product) return
    let loadingNotificationId: string | undefined
    try {
      setActionLoading(true)
      loadingNotificationId = showNotification('Subiendo imagen...', 'info', 0) as any

      const formData = new FormData()
      formData.append('image', file)

      const response = await apiClient.post<{ success: boolean; data: ProductDetail }>(
        API_ENDPOINTS.ADMIN.PRODUCTS.UPLOAD_IMAGE(product.id),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      if (response.data.success) {
        if (loadingNotificationId) {
          closeNotification(loadingNotificationId)
        }
        setProduct(response.data.data)
        showNotification('Imagen agregada correctamente', 'success')
      }
    } catch (err: any) {
      console.error('Error subiendo imagen:', err)
      if (loadingNotificationId) {
        closeNotification(loadingNotificationId)
      }
      showNotification(err.response?.data?.error?.message || 'Error al subir imagen', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteImage = async (imageUrl: string) => {
    if (!product) return
    if (!confirm('¿Estás seguro de que deseas eliminar esta imagen? Esta acción no se puede deshacer.')) {
      return
    }

    let loadingNotificationId: string | undefined
    try {
      setActionLoading(true)
      loadingNotificationId = showNotification('Eliminando imagen...', 'info', 0) as any

      const response = await apiClient.delete<{ success: boolean; data: ProductDetail }>(
        API_ENDPOINTS.ADMIN.PRODUCTS.DELETE_IMAGE(product.id),
        {
          data: { imageUrl },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.data.success) {
        if (loadingNotificationId) {
          closeNotification(loadingNotificationId)
        }
        setProduct(response.data.data)
        showNotification('Imagen eliminada correctamente', 'success')
      }
    } catch (err: any) {
      console.error('Error eliminando imagen:', err)
      if (loadingNotificationId) {
        closeNotification(loadingNotificationId)
      }
      showNotification(err.response?.data?.error?.message || 'Error al eliminar imagen', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleHideImage = async (imageUrl: string) => {
    if (!product) return
    let loadingNotificationId: string | undefined
    try {
      setActionLoading(true)
      loadingNotificationId = showNotification('Bloqueando imagen...', 'info', 0) as any

      const response = await apiClient.patch<{ success: boolean; data: ProductDetail }>(
        API_ENDPOINTS.ADMIN.PRODUCTS.HIDE_IMAGE(product.id),
        { imageUrl }
      )

      if (response.data.success) {
        if (loadingNotificationId) {
          closeNotification(loadingNotificationId)
        }
        setProduct(response.data.data)
        showNotification('Imagen bloqueada', 'success')
      }
    } catch (err: any) {
      console.error('Error bloqueando imagen:', err)
      if (loadingNotificationId) {
        closeNotification(loadingNotificationId)
      }
      showNotification(err.response?.data?.error?.message || 'Error al bloquear imagen', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleShowImage = async (imageUrl: string) => {
    if (!product) return
    let loadingNotificationId: string | undefined
    try {
      setActionLoading(true)
      loadingNotificationId = showNotification('Desbloqueando imagen...', 'info', 0) as any

      const response = await apiClient.patch<{ success: boolean; data: ProductDetail }>(
        API_ENDPOINTS.ADMIN.PRODUCTS.SHOW_IMAGE(product.id),
        { imageUrl }
      )

      if (response.data.success) {
        if (loadingNotificationId) {
          closeNotification(loadingNotificationId)
        }
        setProduct(response.data.data)
        showNotification('Imagen desbloqueada', 'success')
      }
    } catch (err: any) {
      console.error('Error desbloqueando imagen:', err)
      if (loadingNotificationId) {
        closeNotification(loadingNotificationId)
      }
      showNotification(err.response?.data?.error?.message || 'Error al desbloquear imagen', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    if (!product) return

    const actions: Parameters<typeof setDetailNav>[0]['actions'] = [
      {
        id: 'toggle-active',
        label: product.active ? 'Marcar como inactivo' : 'Activar producto',
        variant: product.active ? 'danger' : 'primary',
        disabled:
          actionLoading || (!product.active && !product.inDropiCatalog),
        title:
          !product.active && !product.inDropiCatalog
            ? 'No está en favoritos Dropi. Sincroniza catálogo tras marcar favorito.'
            : undefined,
        onClick: () => void handleToggleActive(),
      },
    ]

    if (product.lockedByAdmin && user?.role === 'SUPER_ADMIN') {
      actions.push({
        id: 'unlock',
        label: 'Desbloquear',
        variant: 'default',
        disabled: actionLoading,
        onClick: () => void handleUnlock(),
      })
    }

    setDetailNav({
      title: product.title,
      subtitle: product.handle,
      actions,
    })
  }, [product, actionLoading, user?.role, setDetailNav])

  useEffect(() => {
    return () => clearDetailNav()
  }, [clearDetailNav])

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <AdminPageShell>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-red-600">{error || 'Producto no encontrado'}</p>
        </div>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {product.lockedByAdmin && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <LockClosedIcon className="w-3.5 h-3.5" />
              Bloqueado por admin
            </span>
          )}
          {product.inRanking ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              Visible en frontend
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
              <XCircleIcon className="w-3.5 h-3.5" />
              No visible en frontend
            </span>
          )}
          {!product.active && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
              Inactivo
            </span>
          )}
          {!product.inDropiCatalog && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium border ${
                product.hasOrderHistory
                  ? 'bg-slate-50 text-slate-800 border-slate-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              {product.catalogLabel}
            </span>
          )}
        </div>

        <div className="lg:hidden pb-3 mb-2 border-b border-gray-200">
          <DetailNavActions placement="inline" />
        </div>

        {/* Variantes - OCUPA TODO EL ANCHO */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col gap-3 mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Variantes</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-full sm:max-w-lg sm:ml-auto">
                  <select
                    value={selectedFormulaId}
                    onChange={(e) => setSelectedFormulaId(e.target.value)}
                    disabled={actionLoading || loadingFormulas}
                    className="w-full min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 text-sm"
                  >
                    <option value="">Aplicar fórmula...</option>
                    {priceFormulas.map((formula) => (
                      <option key={formula.id} value={formula.id}>
                        {formula.name} {formula.isDefault && '(Por defecto)'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyFormula}
                    disabled={actionLoading || !selectedFormulaId || loadingFormulas}
                    className="w-full sm:w-auto shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
              {product.priceFormulaType && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Fórmula actual:</span> {product.priceFormulaType} - {getFormulaDescription(product.priceFormulaType, product.priceFormulaValue)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Las fórmulas se calculan desde el Precio Sugerido. El producto está bloqueado y los workers no sobreescribirán los precios.
                  </p>
                </div>
              )}
              {product.variants.length === 0 ? (
                <p className="text-gray-500">No hay variantes</p>
              ) : (
                <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Título
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Precio Sugerido
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tanku Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Stock
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {product.variants.map((variant) => (
                        <tr key={variant.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                            {variant.sku}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {editingVariantTitle === variant.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={variantTitleValue}
                                  onChange={(e) => setVariantTitleValue(e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault() // Prevenir submit del formulario
                                      handleSaveVariantTitle(variant.id)
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault()
                                      handleCancelEditVariantTitle()
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // No cerrar si se hace click en los botones
                                    const relatedTarget = e.relatedTarget as HTMLElement
                                    if (!relatedTarget || (!relatedTarget.closest('button'))) {
                                      // Solo cancelar si no se hizo click en un botón
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveVariantTitle(variant.id)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancelEditVariantTitle}
                                  disabled={actionLoading}
                                  className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 disabled:opacity-50"
                                >
                                  ✗
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group">
                                <span>{variant.title}</span>
                                <button
                                  onClick={() => handleStartEditVariantTitle(variant)}
                                  className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-blue-600 hover:text-blue-900 transition-opacity"
                                  title="Editar título"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {formatPrice(variant.suggestedPrice)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                            {formatPrice(variant.tankuPrice)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex flex-col">
                              <span
                                className={`font-medium ${
                                  variant.stock > 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {variant.stock}
                              </span>
                              {variant.warehouseVariants && variant.warehouseVariants.length > 0 && (
                                <span className="text-xs text-gray-500 mt-1">
                                  {variant.warehouseVariants.length} warehouse{variant.warehouseVariants.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                variant.active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {variant.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="lg:hidden space-y-3">
                  {product.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="rounded-lg border border-gray-200 p-3 bg-gray-50/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-mono text-gray-600">{variant.sku}</p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            variant.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {variant.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {editingVariantTitle === variant.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={variantTitleValue}
                            onChange={(e) => setVariantTitleValue(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveVariantTitle(variant.id)}
                            disabled={actionLoading}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditVariantTitle}
                            className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{variant.title}</p>
                          <button
                            type="button"
                            onClick={() => handleStartEditVariantTitle(variant)}
                            className="text-xs text-blue-600 shrink-0"
                          >
                            Editar
                          </button>
                        </div>
                      )}
                      <dl className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-gray-400">Sugerido</dt>
                          <dd>{formatPrice(variant.suggestedPrice)}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">Tanku</dt>
                          <dd className="text-blue-600 font-medium">
                            {formatPrice(variant.tankuPrice)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">Stock</dt>
                          <dd
                            className={
                              variant.stock > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
                            }
                          >
                            {variant.stock}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
                </>
              )}
          </div>
        </div>

        {/* Resto de información en grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(320px,22rem)] xl:grid-cols-[minmax(0,1fr)_min(300px,20rem)] 2xl:grid-cols-[minmax(0,1fr)_min(340px,22rem)] gap-6 items-start">
          {/* Columna principal */}
          <div className="space-y-6 min-w-0">
            {/* Información básica */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Información Básica</h2>
                {!isEditing ? (
                  <button
                    onClick={handleStartEdit}
                    className="text-blue-600 hover:text-blue-900 font-medium text-sm transition-colors"
                  >
                    Editar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveProduct}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {actionLoading ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Título del producto"
                    />
                  ) : (
                    <p className="text-gray-900">{product.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Handle</label>
                  <p className="text-gray-600 font-mono text-sm bg-gray-50 px-3 py-2 rounded border border-gray-200">
                    {product.handle}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">No editable (usado para URLs y wishlist)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  {isEditing ? (
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={14}
                      className="w-full min-h-[320px] px-4 py-3 text-base leading-relaxed border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                      placeholder="Descripción del producto"
                    />
                  ) : (
                    <p className="text-gray-900 whitespace-pre-wrap text-base leading-relaxed min-h-[4rem]">
                      {product.description || 'Sin descripción'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  {isEditing ? (
                    <div className="space-y-3">
                      {/* Selector de categoría padre */}
                      <select
                        value={selectedParentCategory}
                        onChange={(e) => {
                          setSelectedParentCategory(e.target.value)
                          setSelectedSubcategory('') // Resetear subcategoría al cambiar padre
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">Sin categoría</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      
                      {/* Selector de subcategoría (solo si hay padre seleccionado y tiene hijos) */}
                      {selectedParentCategory && subcategories.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Subcategoría (opcional)
                          </label>
                          <div className="space-y-2 pl-2 border-l-2 border-gray-200">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="radio"
                                name="subcategory"
                                value=""
                                checked={selectedSubcategory === ''}
                                onChange={() => {
                                  setSelectedSubcategory('')
                                }}
                                className="text-blue-600"
                              />
                              <span className="text-sm text-gray-700">Sin subcategoría</span>
                            </label>
                            {subcategories.map((subcat) => (
                              <label key={subcat.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                <input
                                  type="radio"
                                  name="subcategory"
                                  value={subcat.id}
                                  checked={selectedSubcategory === subcat.id}
                                  onChange={() => {
                                    setSelectedSubcategory(subcat.id)
                                  }}
                                  className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700">{subcat.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-gray-900">
                        {product.category ? product.category.name : 'Sin categoría'}
                      </p>
                      {/* Mostrar subcategorías también en modo visualización */}
                      {selectedParentCategory && subcategories.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Subcategoría
                          </label>
                          <div className="space-y-2 pl-2 border-l-2 border-gray-200">
                            <label className="flex items-center gap-2 p-2 rounded">
                              <input
                                type="radio"
                                name="subcategory-view"
                                value=""
                                checked={selectedSubcategory === ''}
                                disabled
                                className="text-blue-600"
                              />
                              <span className="text-sm text-gray-700">Sin subcategoría</span>
                            </label>
                            {subcategories.map((subcat) => (
                              <label key={subcat.id} className="flex items-center gap-2 p-2 rounded">
                                <input
                                  type="radio"
                                  name="subcategory-view"
                                  value={subcat.id}
                                  checked={selectedSubcategory === subcat.id}
                                  disabled
                                  className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700">{subcat.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restricción de edad (+18)
                  </label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editData.restrictToAdults}
                          onChange={(e) =>
                            setEditData({ ...editData, restrictToAdults: e.target.checked })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-sm text-gray-800">
                          Marcar este producto como solo para mayores de edad
                        </span>
                      </label>
                      {product.category?.restrictToAdults && (
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                          La categoría ya está marcada como +18; el catálogo aplica la restricción. Puedes marcar el
                          producto además para dejarlo explícito.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-800 space-y-1">
                      {product.restrictToAdults || product.category?.restrictToAdults ? (
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 text-xs font-semibold">
                            Solo mayores (+18)
                          </span>
                          <span className="text-gray-600">
                            {product.restrictToAdults && product.category?.restrictToAdults
                              ? 'Producto y categoría'
                              : product.restrictToAdults
                                ? 'Solo por producto'
                                : 'Por categoría'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-600">
                          Sin restricción +18 en producto ni categoría actual
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {product.active ? 'Activo' : 'Inactivo'}
                    </span>
                    {product.lockedByAdmin && (
                      <span className="text-xs text-amber-600">
                        (Los workers no cambiarán la información básica, pero sí pueden actualizar stock y estado según disponibilidad)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna lateral — ancho acotado en pantallas grandes */}
          <div className="space-y-6 w-full max-w-sm mx-auto lg:max-w-none lg:mx-0 lg:sticky lg:top-4">
            {/* Imágenes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Imágenes</h2>
                <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors text-sm font-medium">
                  Subir imagen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleUploadImage(file)
                      }
                      e.target.value = '' // Reset input
                    }}
                    disabled={actionLoading}
                  />
                </label>
              </div>
              {(() => {
                // Filtrar imágenes visibles (no bloqueadas)
                const visibleImages = product.images.filter(
                  img => !product.hiddenImages.includes(img)
                )

                if (visibleImages.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Sin imágenes visibles</p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div className="space-y-3">
                    {/* Imagen principal destacada */}
                    <div className="relative">
                      <div className="relative aspect-square max-h-[280px] lg:max-h-[240px] mx-auto rounded-lg overflow-hidden border-2 border-blue-500 shadow-md">
                        <img
                          src={visibleImages[0]}
                          alt={`${product.title} - Imagen principal`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Imagen+no+disponible'
                          }}
                        />
                        <div className="absolute top-2 left-2 flex gap-2">
                          <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                            Principal
                          </div>
                          {product.customImageUrls.includes(visibleImages[0]) && (
                            <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                              Propia
                            </div>
                          )}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-2">
                          {product.customImageUrls.includes(visibleImages[0]) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteImage(visibleImages[0])
                              }}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-700 transition-colors"
                              disabled={actionLoading}
                            >
                              Eliminar
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleHideImage(visibleImages[0])
                            }}
                            className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-yellow-700 transition-colors"
                            disabled={actionLoading}
                          >
                            Bloquear
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Resto de imágenes en grid */}
                    {visibleImages.length > 1 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Otras imágenes ({visibleImages.length - 1})</p>
                        <div className="grid grid-cols-2 gap-2 max-w-[220px] lg:max-w-none mx-auto lg:mx-0">
                          {visibleImages.slice(1).map((image, index) => {
                            const actualIndex = product.images.indexOf(image) // Índice real en el array original
                            const isCustom = product.customImageUrls.includes(image)
                            return (
                              <div 
                                key={actualIndex} 
                                className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group"
                              >
                                <img
                                  src={image}
                                  alt={`${product.title} - Imagen ${actualIndex + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Imagen+no+disponible'
                                  }}
                                />
                                <div className="absolute top-2 left-2 flex gap-2">
                                  {isCustom && (
                                    <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                                      Propia
                                    </div>
                                  )}
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex flex-col items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleSetMainImage(actualIndex)}
                                    className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
                                    disabled={actionLoading}
                                  >
                                    Hacer principal
                                  </button>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isCustom && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteImage(image)
                                        }}
                                        className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-700 transition-colors"
                                        disabled={actionLoading}
                                      >
                                        Eliminar
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleHideImage(image)
                                      }}
                                      className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-yellow-700 transition-colors"
                                      disabled={actionLoading}
                                    >
                                      Bloquear
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Mostrar imágenes bloqueadas si hay */}
                    {product.hiddenImages.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">Imágenes bloqueadas ({product.hiddenImages.length})</p>
                        <div className="grid grid-cols-2 gap-3">
                          {product.hiddenImages.map((image, index) => {
                            const actualIndex = product.images.indexOf(image)
                            const isCustom = product.customImageUrls.includes(image)
                            return (
                              <div 
                                key={`hidden-${actualIndex}`} 
                                className="relative aspect-square rounded-lg overflow-hidden border border-gray-300 opacity-60 group"
                              >
                                <img
                                  src={image}
                                  alt={`${product.title} - Imagen bloqueada ${actualIndex + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Imagen+no+disponible'
                                  }}
                                />
                                <div className="absolute top-2 left-2 flex gap-2">
                                  <div className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium">
                                    Bloqueada
                                  </div>
                                  {isCustom && (
                                    <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                                      Propia
                                    </div>
                                  )}
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center">
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isCustom && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteImage(image)
                                        }}
                                        className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-700 transition-colors"
                                        disabled={actionLoading}
                                      >
                                        Eliminar
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleShowImage(image)
                                      }}
                                      className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-700 transition-colors"
                                      disabled={actionLoading}
                                    >
                                      Mostrar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Información adicional */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Información Adicional</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Creado:</span>
                  <p className="text-gray-900">
                    {new Date(product.createdAt).toLocaleString('es-ES')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Actualizado:</span>
                  <p className="text-gray-900">
                    {new Date(product.updatedAt).toLocaleString('es-ES')}
                  </p>
                </div>
                {product.lockedByAdmin && product.locker && (
                  <div>
                    <span className="text-gray-500">Bloqueado por:</span>
                    <p className="text-gray-900">
                      {product.locker.firstName} {product.locker.lastName} ({product.locker.email})
                    </p>
                    {product.lockedAt && (
                      <p className="text-gray-600 text-xs mt-1">
                        {new Date(product.lockedAt).toLocaleString('es-ES')}
                      </p>
                    )}
                  </div>
                )}
                {product.priceFormulaType && (
                  <div>
                    <span className="text-gray-500">Fórmula de precio:</span>
                    <div className="mt-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded mr-2">
                        {product.priceFormulaType}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {getFormulaDescription(product.priceFormulaType, product.priceFormulaValue)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Información de Ranking */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ranking y Posicionamiento</h2>
              {product.rankingInfo ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">Global Score</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {product.rankingInfo.globalScore.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Fórmula: (Órdenes × 8) + (Wishlist × 4) + (Comentarios × 3) + (Likes × 1)
                    </p>
                    <div className="mt-2 text-xs text-blue-600">
                      <p>En ranking desde: {new Date(product.rankingInfo.createdAt).toLocaleString('es-ES')}</p>
                      <p>Última actualización: {new Date(product.rankingInfo.updatedAt).toLocaleString('es-ES')}</p>
                    </div>
                  </div>

                  {product.metrics && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Órdenes</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {product.metrics.ordersCount}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          × 8 = {(product.metrics.ordersCount * 8).toFixed(0)} pts
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Wishlist</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {product.metrics.wishlistCount}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          × 4 = {(product.metrics.wishlistCount * 4).toFixed(0)} pts
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Comentarios</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {product.metrics.commentsCount}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          × 3 = {(product.metrics.commentsCount * 3).toFixed(0)} pts
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Likes</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {product.metrics.likesCount}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          × 1 = {product.metrics.likesCount.toFixed(0)} pts
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                    {product.metrics && (
                      <p>Última actualización de métricas: {new Date(product.metrics.updatedAt).toLocaleString('es-ES')}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Este producto no está en el ranking global</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Para aparecer en el feed, el producto debe cumplir los requisitos mínimos
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
    </AdminPageShell>
  )
}

