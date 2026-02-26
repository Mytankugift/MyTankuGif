'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  LockClosedIcon,
  LockOpenIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface ProductListItem {
  id: string
  title: string
  handle: string
  category: {
    id: string
    name: string
  } | null
  price: number | null
  suggestedPrice: number | null
  tankuPrice: number | null
  stock: number
  hasVariants: boolean
  variantsCount: number
  active: boolean
  lockedByAdmin: boolean
  lockedAt: string | null
  lockedBy: string | null
  inRanking: boolean
  createdAt: string
  updatedAt: string
}

interface ProductsResponse {
  products: ProductListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '50', 10),
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    categoryId: searchParams.get('categoryId') || '',
    active: searchParams.get('active') || '',
    lockedByAdmin: searchParams.get('lockedByAdmin') || '',
    inRanking: searchParams.get('inRanking') || '',
  })
  const [selectedStates, setSelectedStates] = useState<{
    active: boolean | null
    locked: boolean | null
    front: boolean | null
  }>({
    active: searchParams.get('active') === 'true' ? true : searchParams.get('active') === 'false' ? false : null,
    locked: searchParams.get('lockedByAdmin') === 'true' ? true : searchParams.get('lockedByAdmin') === 'false' ? false : null,
    front: searchParams.get('inRanking') === 'true' ? true : searchParams.get('inRanking') === 'false' ? false : null,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [categories, setCategories] = useState<Array<{ id: string; name: string; handle: string; blocked?: boolean }>>([])
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>('')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('')
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string; handle: string; blocked?: boolean }>>([])
  const [allCategoriesMap, setAllCategoriesMap] = useState<Map<string, { blocked: boolean }>>(new Map())
  const [openDropdown, setOpenDropdown] = useState<'categories' | 'subcategories' | 'states' | 'limit' | 'sort' | null>(null)
  const [sortBy, setSortBy] = useState<'default' | 'ranking'>(() => {
    const sortParam = searchParams.get('sortBy')
    return sortParam === 'ranking' ? 'ranking' : 'default'
  })
  const isInitializingFromUrl = useRef(true)
  
  // Estados para edición masiva
  const [isBulkEditMode, setIsBulkEditMode] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 })
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false)
  const [showBulkFormulaModal, setShowBulkFormulaModal] = useState(false)
  const [showBulkActiveModal, setShowBulkActiveModal] = useState(false)
  const [bulkOperationResult, setBulkOperationResult] = useState<any>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [priceFormulas, setPriceFormulas] = useState<Array<{ id: string; name: string; type: string }>>([])
  const [allCategoriesForModal, setAllCategoriesForModal] = useState<Array<{ id: string; name: string; parentId: string | null; parentName?: string }>>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('null')
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>('')

  // Función para actualizar la URL con los filtros y paginación actuales
  const updateURL = useCallback((newFilters: typeof filters, newPagination: typeof pagination, sortOrder?: string) => {
    const params = new URLSearchParams()
    if (newPagination.page > 1) params.set('page', newPagination.page.toString())
    if (newPagination.limit !== 50) params.set('limit', newPagination.limit.toString())
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.categoryId) params.set('categoryId', newFilters.categoryId)
    if (newFilters.active) params.set('active', newFilters.active)
    if (newFilters.lockedByAdmin) params.set('lockedByAdmin', newFilters.lockedByAdmin)
    if (newFilters.inRanking) params.set('inRanking', newFilters.inRanking)
    // Guardar sortBy siempre, incluso si es 'default', para mantener la persistencia
    if (sortOrder) {
      params.set('sortBy', sortOrder)
    } else if (sortBy) {
      params.set('sortBy', sortBy)
    }
    
    const newURL = params.toString() ? `/products?${params.toString()}` : '/products'
    router.replace(newURL, { scroll: false })
  }, [router, sortBy])

  // Cargar categorías al montar
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    loadCategories()
    loadAllCategoriesForModal()
    loadPriceFormulas()
  }, [hasHydrated, isAuthenticated])

  const loadAllCategoriesForModal = async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: any[] }>(
        API_ENDPOINTS.ADMIN.CATEGORIES.LIST
      )
      if (response.data.success && Array.isArray(response.data.data)) {
        // Crear mapa de categorías por ID para buscar nombres de padres
        const categoryMap = new Map<string, { id: string; name: string; parentId: string | null }>()
        
        const flattenCategories = (nodes: any[], parentName?: string): any[] => {
          const result: any[] = []
          const traverse = (nodes: any[], parentName?: string) => {
            for (const node of nodes) {
              categoryMap.set(node.id, { id: node.id, name: node.name, parentId: node.parentId })
              const displayName = parentName ? `${parentName} > ${node.name}` : node.name
              result.push({ 
                id: node.id, 
                name: node.name, 
                parentId: node.parentId,
                displayName: displayName
              })
              if (node.children && node.children.length > 0) {
                traverse(node.children, displayName)
              }
            }
          }
          traverse(nodes, parentName)
          return result
        }
        setAllCategoriesForModal(flattenCategories(response.data.data))
      }
    } catch (err: any) {
      console.error('Error cargando categorías para modal:', err)
    }
  }

  const loadPriceFormulas = async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: any[] }>(
        API_ENDPOINTS.ADMIN.PRICE_FORMULAS.LIST
      )
      if (response.data.success && Array.isArray(response.data.data)) {
        setPriceFormulas(response.data.data)
      }
    } catch (err: any) {
      console.error('Error cargando fórmulas:', err)
    }
  }

  // Sincronizar selectedStates con searchParams
  useEffect(() => {
    const activeParam = searchParams.get('active')
    const lockedParam = searchParams.get('lockedByAdmin')
    const frontParam = searchParams.get('inRanking')
    setSelectedStates({
      active: activeParam === 'true' ? true : activeParam === 'false' ? false : null,
      locked: lockedParam === 'true' ? true : lockedParam === 'false' ? false : null,
      front: frontParam === 'true' ? true : frontParam === 'false' ? false : null,
    })
  }, [searchParams])

  // Sincronizar sortBy con searchParams
  useEffect(() => {
    const sortByParam = searchParams.get('sortBy')
    if (sortByParam === 'ranking' || sortByParam === 'default') {
      setSortBy(sortByParam)
    } else if (!sortByParam) {
      setSortBy('default')
    }
  }, [searchParams])

  // Sincronizar filters con searchParams cuando cambian (solo al montar o cuando searchParams cambia externamente)
  useEffect(() => {
    // Evitar sincronización durante la inicialización desde URL para evitar loops
    if (isInitializingFromUrl.current) return
    
    const searchParam = searchParams.get('search') || ''
    const categoryIdParam = searchParams.get('categoryId') || ''
    const activeParam = searchParams.get('active') || ''
    const lockedByAdminParam = searchParams.get('lockedByAdmin') || ''
    const inRankingParam = searchParams.get('inRanking') || ''
    
    // Usar función de actualización para comparar con el estado actual sin incluirlo en dependencias
    setFilters(prevFilters => {
      // Solo actualizar si los valores son diferentes para evitar loops infinitos
      if (
        prevFilters.search !== searchParam ||
        prevFilters.categoryId !== categoryIdParam ||
        prevFilters.active !== activeParam ||
        prevFilters.lockedByAdmin !== lockedByAdminParam ||
        prevFilters.inRanking !== inRankingParam
      ) {
        isInitializingFromUrl.current = true
        setTimeout(() => {
          isInitializingFromUrl.current = false
        }, 100)
        return {
          search: searchParam,
          categoryId: categoryIdParam,
          active: activeParam,
          lockedByAdmin: lockedByAdminParam,
          inRanking: inRankingParam,
        }
      }
      return prevFilters
    })
  }, [searchParams])

  // Cargar todas las categorías al inicio para construir el mapa de bloqueadas
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    
    const loadAllCategoriesForMap = async () => {
      try {
        const response = await apiClient.get<{ success: boolean; data: any[] }>(
          API_ENDPOINTS.ADMIN.CATEGORIES.LIST
        )
        if (response.data.success && Array.isArray(response.data.data)) {
          // Construir mapa de todas las categorías bloqueadas
          const buildBlockedMap = (nodes: any[]): Map<string, { blocked: boolean }> => {
            const map = new Map<string, { blocked: boolean }>()
            const traverse = (nodes: any[]) => {
              for (const node of nodes) {
                if (node.blocked) {
                  map.set(node.id, { blocked: true })
                }
                if (node.children && node.children.length > 0) {
                  traverse(node.children)
                }
              }
            }
            traverse(nodes)
            return map
          }
          setAllCategoriesMap(buildBlockedMap(response.data.data))
        }
      } catch (err: any) {
        console.error('Error cargando todas las categorías para el mapa:', err)
      }
    }
    
    loadAllCategoriesForMap()
  }, [hasHydrated, isAuthenticated])

  // Inicializar categorías padre y subcategorías desde URL
  useEffect(() => {
    if (categories.length === 0) return // Esperar a que se carguen las categorías
    
    const categoryIdFromUrl = searchParams.get('categoryId')
    if (categoryIdFromUrl && categoryIdFromUrl !== 'null') {
      isInitializingFromUrl.current = true
      // Determinar si es categoría padre o subcategoría
      const category = categories.find(c => c.id === categoryIdFromUrl)
      if (category) {
        // Es categoría padre
        setSelectedParentCategory(categoryIdFromUrl)
        setSelectedSubcategory('')
        // Las subcategorías se cargarán automáticamente por el useEffect de selectedParentCategory
      } else {
        // Podría ser una subcategoría, necesitamos cargar todas para verificar
        loadAllCategoriesToCheck(categoryIdFromUrl)
      }
      setTimeout(() => {
        isInitializingFromUrl.current = false
      }, 500)
    } else if (!categoryIdFromUrl || categoryIdFromUrl === 'null') {
      setSelectedParentCategory('')
      setSelectedSubcategory('')
      setSubcategories([])
      isInitializingFromUrl.current = false
    }
  }, [searchParams, categories])

  // Cargar productos cuando cambian filtros o paginación
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    // Evitar actualizar URL si estamos sincronizando desde la URL para evitar loops infinitos
    if (isInitializingFromUrl.current) {
      // Solo cargar productos sin actualizar URL
      loadProducts()
    } else {
      loadProducts()
      updateURL(filters, pagination, sortBy)
    }
  }, [hasHydrated, isAuthenticated, pagination.page, pagination.limit, filters, sortBy])

  const loadCategories = async () => {
    try {
      // Cargar solo categorías principales (sin padre)
      const response = await apiClient.get<{ success: boolean; data: Array<{ id: string; name: string; handle: string; blocked?: boolean }> }>(
        `${API_ENDPOINTS.ADMIN.CATEGORIES.LIST}?parentId=null`
      )
      if (response.data.success) {
        setCategories(response.data.data)
        // Actualizar mapa de categorías bloqueadas
        const newMap = new Map(allCategoriesMap)
        response.data.data.forEach(cat => {
          if (cat.blocked) {
            newMap.set(cat.id, { blocked: true })
          }
        })
        setAllCategoriesMap(newMap)
      }
    } catch (err: any) {
      console.error('Error cargando categorías:', err)
    }
  }

  const loadSubcategories = async (parentId: string) => {
    try {
      const response = await apiClient.get<{ success: boolean; data: Array<{ id: string; name: string; handle: string; blocked?: boolean }> }>(
        `${API_ENDPOINTS.ADMIN.CATEGORIES.LIST}?parentId=${parentId}`
      )
      if (response.data.success && Array.isArray(response.data.data)) {
        setSubcategories(response.data.data)
        // Actualizar mapa de categorías bloqueadas
        const newMap = new Map(allCategoriesMap)
        response.data.data.forEach(cat => {
          if (cat.blocked) {
            newMap.set(cat.id, { blocked: true })
          }
        })
        setAllCategoriesMap(newMap)
        return response.data.data
      } else {
        setSubcategories([])
        return []
      }
    } catch (err: any) {
      console.error('Error cargando subcategorías:', err)
      setSubcategories([])
      return []
    }
  }

  const loadAllCategoriesToCheck = async (categoryId: string) => {
    try {
      const response = await apiClient.get<{ success: boolean; data: any[] }>(
        API_ENDPOINTS.ADMIN.CATEGORIES.LIST
      )
      if (response.data.success && Array.isArray(response.data.data)) {
        // Construir mapa de todas las categorías bloqueadas
        const buildBlockedMap = (nodes: any[]): Map<string, { blocked: boolean }> => {
          const map = new Map<string, { blocked: boolean }>()
          const traverse = (nodes: any[]) => {
            for (const node of nodes) {
              if (node.blocked) {
                map.set(node.id, { blocked: true })
              }
              if (node.children && node.children.length > 0) {
                traverse(node.children)
              }
            }
          }
          traverse(nodes)
          return map
        }
        setAllCategoriesMap(buildBlockedMap(response.data.data))
        
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
        
        const categoryNode = findCategory(response.data.data, categoryId)
        if (categoryNode) {
          if (categoryNode.parentId) {
            // Es subcategoría
            setSelectedParentCategory(categoryNode.parentId)
            setSelectedSubcategory(categoryNode.id)
            // Cargar subcategorías del padre
            const subcatsResponse = await apiClient.get<{ success: boolean; data: Array<{ id: string; name: string; handle: string; blocked?: boolean }> }>(
              `${API_ENDPOINTS.ADMIN.CATEGORIES.LIST}?parentId=${categoryNode.parentId}`
            )
            if (subcatsResponse.data.success && Array.isArray(subcatsResponse.data.data)) {
              setSubcategories(subcatsResponse.data.data)
              // Actualizar mapa de categorías bloqueadas
              const newMap = new Map(allCategoriesMap)
              subcatsResponse.data.data.forEach(cat => {
                if (cat.blocked) {
                  newMap.set(cat.id, { blocked: true })
                }
              })
              setAllCategoriesMap(newMap)
            }
          } else {
            // Es categoría padre
            setSelectedParentCategory(categoryNode.id)
            setSelectedSubcategory('')
            loadSubcategories(categoryNode.id)
          }
        }
      }
    } catch (err: any) {
      console.error('Error cargando todas las categorías:', err)
    }
  }

  // Efecto para cargar subcategorías cuando cambia la categoría padre seleccionada
  useEffect(() => {
    if (selectedParentCategory) {
      loadSubcategories(selectedParentCategory).then((subcats) => {
        // Después de cargar, verificar si el categoryId de la URL es una subcategoría
        const categoryIdFromUrl = searchParams.get('categoryId')
        if (categoryIdFromUrl && categoryIdFromUrl !== selectedParentCategory) {
          const isSubcategory = subcats.some((s: any) => s.id === categoryIdFromUrl)
          if (isSubcategory) {
            setSelectedSubcategory(categoryIdFromUrl)
            return // No resetear ni actualizar si viene de la URL
          }
        }
        
        // Solo resetear si no viene de la URL o si es la misma categoría padre
        if (!categoryIdFromUrl || categoryIdFromUrl === selectedParentCategory) {
          setSelectedSubcategory('')
        }
      })
      
      // Actualizar filtro solo si el cambio viene del usuario (no de la URL)
      if (!isInitializingFromUrl.current) {
        const categoryIdFromUrl = searchParams.get('categoryId')
        if (categoryIdFromUrl !== selectedParentCategory && filters.categoryId !== selectedParentCategory) {
          handleFilterChange('categoryId', selectedParentCategory)
        }
      }
    } else {
      setSubcategories([])
      setSelectedSubcategory('')
    }
  }, [selectedParentCategory])

  // Efecto para actualizar filtro cuando cambia la subcategoría (solo si no viene de URL)
  useEffect(() => {
    if (isInitializingFromUrl.current) return // No actualizar si viene de la URL
    
    if (selectedSubcategory && selectedParentCategory) {
      // Solo actualizar si es diferente
      if (filters.categoryId !== selectedSubcategory) {
        handleFilterChange('categoryId', selectedSubcategory)
      }
    } else if (selectedParentCategory && !selectedSubcategory) {
      // Solo actualizar si es diferente
      if (filters.categoryId !== selectedParentCategory) {
        handleFilterChange('categoryId', selectedParentCategory)
      }
    }
  }, [selectedSubcategory, selectedParentCategory])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())
      if (filters.search) params.append('search', filters.search)
      // categoryId puede ser 'null' para filtrar sin categoría
      if (filters.categoryId !== '') {
        if (filters.categoryId === 'null') {
          params.append('categoryId', 'null')
        } else if (filters.categoryId) {
          params.append('categoryId', filters.categoryId)
        }
      }
      if (filters.active) params.append('active', filters.active)
      if (filters.lockedByAdmin) params.append('lockedByAdmin', filters.lockedByAdmin)
      if (filters.inRanking) params.append('inRanking', filters.inRanking)
      if (sortBy && sortBy !== 'default') params.append('sortBy', sortBy)

      const response = await apiClient.get<{ success: boolean; data: ProductsResponse }>(
        `${API_ENDPOINTS.ADMIN.PRODUCTS.LIST}?${params.toString()}`
      )
      if (response.data.success) {
        setProducts(response.data.data.products)
        setPagination((prev) => ({
          ...prev,
          total: response.data.data.pagination.total,
          totalPages: response.data.data.pagination.totalPages,
        }))
      }
    } catch (err: any) {
      console.error('Error cargando productos:', err)
      setError(err.response?.data?.error?.message || 'Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  // Funciones para operaciones masivas
  const handleBulkUpdateCategory = async (categoryId: string | null) => {
    if (selectedProductIds.size === 0) return

    setIsProcessing(true)
    setProcessingProgress({ current: 0, total: selectedProductIds.size })

    try {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        API_ENDPOINTS.ADMIN.PRODUCTS.BULK_UPDATE_CATEGORY,
        {
          productIds: Array.from(selectedProductIds),
          categoryId,
        }
      )

      if (response.data.success) {
        setBulkOperationResult(response.data.data)
        setShowResultModal(true)
        setSelectedProductIds(new Set())
        await loadProducts()
      }
    } catch (err: any) {
      console.error('Error actualizando categorías:', err)
      setBulkOperationResult({
        updated: 0,
        errors: selectedProductIds.size,
        details: Array.from(selectedProductIds).map(id => ({
          productId: id,
          success: false,
          error: err.response?.data?.error?.message || 'Error desconocido',
        })),
      })
      setShowResultModal(true)
    } finally {
      setIsProcessing(false)
      setProcessingProgress({ current: 0, total: 0 })
      setShowBulkCategoryModal(false)
    }
  }

  const handleBulkApplyPriceFormula = async (formulaId: string) => {
    if (selectedProductIds.size === 0) return

    setIsProcessing(true)
    setProcessingProgress({ current: 0, total: selectedProductIds.size })

    const productIdsArray = Array.from(selectedProductIds)
    console.log('[BULK FORMULA] Product IDs:', productIdsArray)
    console.log('[BULK FORMULA] Formula ID:', formulaId)

    try {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        API_ENDPOINTS.ADMIN.PRODUCTS.BULK_APPLY_PRICE_FORMULA,
        {
          productIds: productIdsArray,
          formulaId,
        }
      )

      if (response.data.success) {
        setBulkOperationResult(response.data.data)
        setShowResultModal(true)
        setSelectedProductIds(new Set())
        await loadProducts()
      }
    } catch (err: any) {
      console.error('Error aplicando fórmulas:', err)
      setBulkOperationResult({
        updated: 0,
        errors: selectedProductIds.size,
        details: Array.from(selectedProductIds).map(id => ({
          productId: id,
          success: false,
          error: err.response?.data?.error?.message || 'Error desconocido',
        })),
      })
      setShowResultModal(true)
    } finally {
      setIsProcessing(false)
      setProcessingProgress({ current: 0, total: 0 })
      setShowBulkFormulaModal(false)
    }
  }

  const handleBulkToggleActive = async (active: boolean) => {
    if (selectedProductIds.size === 0) return

    setIsProcessing(true)
    setProcessingProgress({ current: 0, total: selectedProductIds.size })

    try {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        API_ENDPOINTS.ADMIN.PRODUCTS.BULK_TOGGLE_ACTIVE,
        {
          productIds: Array.from(selectedProductIds),
          active,
        }
      )

      if (response.data.success) {
        setBulkOperationResult(response.data.data)
        setShowResultModal(true)
        setSelectedProductIds(new Set())
        await loadProducts()
      }
    } catch (err: any) {
      console.error('Error cambiando estado:', err)
      setBulkOperationResult({
        updated: 0,
        errors: selectedProductIds.size,
        rankingUpdated: 0,
        details: Array.from(selectedProductIds).map(id => ({
          productId: id,
          success: false,
          error: err.response?.data?.error?.message || 'Error desconocido',
        })),
      })
      setShowResultModal(true)
    } finally {
      setIsProcessing(false)
      setProcessingProgress({ current: 0, total: 0 })
      setShowBulkActiveModal(false)
    }
  }


  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    const newPagination = { ...pagination, page: 1 } // Reset a página 1
    setFilters(newFilters)
    setPagination(newPagination)
    updateURL(newFilters, newPagination)
  }

  const handleStateChange = (stateType: 'active' | 'locked' | 'front', value: boolean | null) => {
    const newStates = { ...selectedStates, [stateType]: value }
    setSelectedStates(newStates)
    
    const newFilters = {
      ...filters,
      active: newStates.active === null ? '' : newStates.active.toString(),
      lockedByAdmin: newStates.locked === null ? '' : newStates.locked.toString(),
      inRanking: newStates.front === null ? '' : newStates.front.toString(),
    }
    const newPagination = { ...pagination, page: 1 }
    setFilters(newFilters)
    setPagination(newPagination)
    updateURL(newFilters, newPagination, sortBy)
  }

  const formatPrice = (price: number | null) => {
    if (!price) return '-'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Calcular contadores para el modal de activar/desactivar usando useMemo
  const modalCounts = useMemo(() => {
    if (!showBulkActiveModal) {
      return { activeCount: 0, inactiveCount: 0 }
    }
    const selectedProducts = products.filter(p => selectedProductIds.has(p.id))
    return {
      activeCount: selectedProducts.filter(p => p.active).length,
      inactiveCount: selectedProducts.filter(p => !p.active).length,
    }
  }, [showBulkActiveModal, products, selectedProductIds])

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
                    placeholder="Buscar productos..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Filtros agrupados a la derecha */}
              <div className="flex items-center gap-2">
                {/* Categories Dropdown con subcategorías integradas */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'categories' ? null : 'categories')}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 min-w-[120px] justify-between"
                  >
                    <span className="truncate">
                      {selectedParentCategory === ''
                        ? 'Categoría'
                        : categories.find(c => c.id === selectedParentCategory)?.name || 'Categoría'}
                    </span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform flex-shrink-0 ${openDropdown === 'categories' ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === 'categories' && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setOpenDropdown(null)}
                      />
                      <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4 min-w-[600px] max-w-[800px]">
                        <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Categorías</label>
                          <div className="grid grid-cols-5 gap-2 p-3 border border-gray-200 rounded-lg">
                            <button
                              onClick={() => {
                                setSelectedParentCategory('')
                                setSelectedSubcategory('')
                                setSubcategories([])
                                handleFilterChange('categoryId', '')
                                setOpenDropdown(null)
                              }}
                              className={`px-3 py-2 text-xs rounded-lg transition-colors text-center truncate ${
                                filters.categoryId === '' && selectedParentCategory === ''
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Todas
                            </button>
                            <button
                              onClick={() => {
                                setSelectedParentCategory('')
                                setSelectedSubcategory('')
                                setSubcategories([])
                                handleFilterChange('categoryId', 'null')
                                setOpenDropdown(null)
                              }}
                              className={`px-3 py-2 text-xs rounded-lg transition-colors text-center truncate ${
                                filters.categoryId === 'null'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Sin categoría
                            </button>
                            {categories.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => {
                                  setSelectedParentCategory(cat.id)
                                  // No cerrar el dropdown para permitir seleccionar subcategoría
                                }}
                                className={`px-3 py-2 text-xs rounded-lg transition-colors text-center truncate flex items-center justify-center gap-1 ${
                                  selectedParentCategory === cat.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title={cat.blocked ? `${cat.name} (Bloqueada)` : cat.name}
                              >
                                {cat.blocked && (
                                  <XCircleIcon className="w-3 h-3 text-red-500 flex-shrink-0" />
                                )}
                                <span className="truncate">{cat.name}</span>
                              </button>
                            ))}
                          </div>
                          
                          {/* Subcategorías integradas dentro del mismo dropdown */}
                          {selectedParentCategory && subcategories.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <label className="block text-xs font-medium text-gray-600 mb-2">Subcategorías</label>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedSubcategory('')
                                    setOpenDropdown(null)
                                  }}
                                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                    selectedSubcategory === ''
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  Todas
                                </button>
                                {subcategories.map((subcat) => (
                                  <button
                                    key={subcat.id}
                                    onClick={() => {
                                      setSelectedSubcategory(subcat.id)
                                      setOpenDropdown(null)
                                    }}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
                                      selectedSubcategory === subcat.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                    title={subcat.blocked ? `${subcat.name} (Bloqueada)` : subcat.name}
                                  >
                                    {subcat.blocked && (
                                      <XCircleIcon className="w-3 h-3 text-red-500 flex-shrink-0" />
                                    )}
                                    <span className="truncate">{subcat.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                    </div>
                  </>
                )}
              </div>

              {/* States and Locks Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'states' ? null : 'states')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 min-w-[150px] justify-between"
                >
                  <span>
                    {selectedStates.active === null && selectedStates.locked === null && selectedStates.front === null
                      ? 'Filtros'
                      : [
                          selectedStates.active !== null ? (selectedStates.active ? 'Activo' : 'Inactivo') : '',
                          selectedStates.locked !== null ? (selectedStates.locked ? 'Bloqueado' : 'No bloqueado') : '',
                          selectedStates.front !== null ? (selectedStates.front ? '✓ Front' : '✗ Front') : ''
                        ].filter(Boolean).join(' / ')}
                  </span>
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${openDropdown === 'states' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'states' && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setOpenDropdown(null)}
                    />
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4 min-w-[300px]">
                      <div className="flex items-center gap-2 mb-3">
                        <label className="block text-sm font-medium text-gray-700">Filtros</label>
                        <div className="relative group">
                          <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                          <div className="absolute left-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <div className="space-y-2">
                              <div>
                                <strong>Activo:</strong> Producto visible y disponible en el frontend
                              </div>
                              <div>
                                <strong>Inactivo:</strong> Producto oculto del frontend
                              </div>
                              <div>
                                <strong>Bloqueado:</strong> Los workers no modificarán información básica ni precios
                              </div>
                              <div>
                                <strong>No bloqueado:</strong> Los workers pueden actualizar información y precios
                              </div>
                              <div>
                                <strong>Front:</strong> Producto visible en el feed público
                              </div>
                              <div>
                                <strong>No front:</strong> Producto no visible en el feed público
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {/* Estado Activo/Inactivo */}
                        <div>
                          <span className="text-sm text-gray-700 font-medium block mb-2">Estado:</span>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedStates.active === true}
                                onChange={(e) => handleStateChange('active', e.target.checked ? true : null)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">Activo</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedStates.active === false}
                                onChange={(e) => handleStateChange('active', e.target.checked ? false : null)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">Inactivo</span>
                            </label>
                          </div>
                        </div>
                        {/* Bloqueo */}
                        <div>
                          <span className="text-sm text-gray-700 font-medium block mb-2">Bloqueo:</span>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedStates.locked === true}
                                onChange={(e) => handleStateChange('locked', e.target.checked ? true : null)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">Bloqueado</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedStates.locked === false}
                                onChange={(e) => handleStateChange('locked', e.target.checked ? false : null)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">No bloqueado</span>
                            </label>
                          </div>
                        </div>
                        {/* Front */}
                        <div>
                          <span className="text-sm text-gray-700 font-medium block mb-2">Front:</span>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedStates.front === true}
                                onChange={(e) => handleStateChange('front', e.target.checked ? true : null)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">Front</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedStates.front === false}
                                onChange={(e) => handleStateChange('front', e.target.checked ? false : null)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">No front</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sort By Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 min-w-[140px] justify-between"
                >
                  <span>
                    {sortBy === 'ranking' ? 'Ordenar: Ranking' : 'Ordenar: Por defecto'}
                  </span>
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'sort' && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setOpenDropdown(null)}
                    />
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                      <button
                        onClick={() => {
                          setSortBy('default')
                          setOpenDropdown(null)
                          updateURL(filters, pagination, 'default')
                        }}
                        className={`w-full px-4 py-2 text-sm text-left transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          sortBy === 'default'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Por defecto
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('ranking')
                          setOpenDropdown(null)
                          updateURL(filters, pagination, 'ranking')
                        }}
                        className={`w-full px-4 py-2 text-sm text-left transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          sortBy === 'ranking'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Por ranking (puntos)
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Limit Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'limit' ? null : 'limit')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 min-w-[120px] justify-between"
                >
                  <span>Mostrar: {pagination.limit}</span>
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${openDropdown === 'limit' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'limit' && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setOpenDropdown(null)}
                    />
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                      {[20, 50, 100, 200, 500].map((limit) => (
                        <button
                          key={limit}
                          onClick={() => {
                            const newPagination = { ...pagination, limit, page: 1 }
                            setPagination(newPagination)
                            updateURL(filters, newPagination)
                            setOpenDropdown(null)
                          }}
                          className={`w-full px-4 py-2 text-sm text-left transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            pagination.limit === limit
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {limit}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Botón de edición masiva */}
              <button
                onClick={() => {
                  setIsBulkEditMode(!isBulkEditMode)
                  setSelectedProductIds(new Set())
                }}
                className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:bg-gray-100"
                title={isBulkEditMode ? 'Cancelar edición masiva' : 'Editar en masa'}
              >
                {isBulkEditMode ? (
                  <XMarkIcon className="w-5 h-5 text-red-600" />
                ) : (
                  <PencilIcon className="w-5 h-5 text-blue-600" />
                )}
              </button>
            </div>
          </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

        </div>
      </div>

      {/* Table Container con scroll */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="h-full max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-gray-500 mt-3">Cargando productos...</p>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500">No se encontraron productos</p>
            </div>
          ) : (
            <>
              {/* Tabla con scroll */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      {isBulkEditMode && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.size === products.length && products.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds(new Set(products.map(p => p.id)))
                              } else {
                                setSelectedProductIds(new Set())
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precios
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variantes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product, index) => {
                      // Calcular número basado en paginación
                      const productNumber = (pagination.page - 1) * pagination.limit + index + 1
                      return (
                        <tr key={product.id} className={`hover:bg-gray-50 ${selectedProductIds.has(product.id) ? 'bg-blue-50' : ''}`}>
                        {isBulkEditMode && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.has(product.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedProductIds)
                                if (e.target.checked) {
                                  newSet.add(product.id)
                                } else {
                                  newSet.delete(product.id)
                                }
                                setSelectedProductIds(newSet)
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {productNumber}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.lockedByAdmin && (
                              <LockClosedIcon className="w-5 h-5 text-amber-500" title="Bloqueado" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.title}</div>
                              <div className="text-xs text-gray-500">{product.handle}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.category ? (
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-gray-900">{product.category.name}</span>
                              {allCategoriesMap.has(product.category.id) && (
                                <ExclamationTriangleIcon 
                                  className="w-4 h-4 text-red-500 flex-shrink-0" 
                                  title="Categoría bloqueada"
                                />
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Sin categoría</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="text-gray-600">
                              <span className="text-gray-500">Sugerido:</span> {formatPrice(product.suggestedPrice)}
                            </div>
                            <div className="text-blue-600 font-medium">
                              <span className="text-gray-500">Tanku:</span> {formatPrice(product.tankuPrice)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-medium ${
                              product.stock > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.hasVariants ? (
                            <span className="text-sm text-gray-900 font-medium">
                              {product.variantsCount} variante{product.variantsCount !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Sin variantes</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                                product.active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {product.active ? 'Activo' : 'Inactivo'}
                            </span>
                            {product.lockedByAdmin && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium w-fit bg-amber-100 text-amber-700">
                                Bloqueado
                              </span>
                            )}
                            {product.inRanking ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium w-fit bg-green-100 text-green-700" title="Visible en Frontend">
                                ✓ Frontend
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium w-fit bg-gray-100 text-gray-600" title="No visible en Frontend">
                                ✗ Frontend
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/products/${product.id}?${new URLSearchParams({
                              ...(pagination.page > 1 && { page: pagination.page.toString() }),
                              ...(pagination.limit !== 50 && { limit: pagination.limit.toString() }),
                              ...(filters.search && { search: filters.search }),
                              ...(filters.categoryId && { categoryId: filters.categoryId }),
                              ...(filters.active && { active: filters.active }),
                              ...(filters.lockedByAdmin && { lockedByAdmin: filters.lockedByAdmin }),
                              ...(filters.inRanking && { inRanking: filters.inRanking }),
                              ...(sortBy && sortBy !== 'default' && { sortBy: sortBy }),
                            }).toString()}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                            Ver
                          </Link>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination - Siempre visible en la parte inferior */}
              <div className="flex-shrink-0 px-6 py-2 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3 bg-white">
                <div className="text-xs text-gray-600">
                  {pagination.total > 0 ? (
                    <>
                      Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} productos
                    </>
                  ) : (
                    <>No hay productos</>
                  )}
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    {pagination.page > 3 && pagination.totalPages > 5 && (
                      <>
                        <button
                          onClick={() => {
                            const newPagination = { ...pagination, page: 1 }
                            setPagination(newPagination)
                            updateURL(filters, newPagination)
                          }}
                          className="px-2 py-1 text-xs text-gray-700 hover:text-gray-900 transition-colors"
                        >
                          1
                        </button>
                        {pagination.page > 4 && (
                          <span className="px-1 text-xs text-gray-400">...</span>
                        )}
                      </>
                    )}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i
                      } else {
                        pageNum = pagination.page - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            const newPagination = { ...pagination, page: pageNum }
                            setPagination(newPagination)
                            updateURL(filters, newPagination)
                          }}
                          className={`px-2 py-1 text-xs text-gray-700 hover:text-gray-900 transition-colors ${
                            pagination.page === pageNum
                              ? 'underline decoration-2 underline-offset-2 font-medium'
                              : ''
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    {pagination.page < pagination.totalPages - 2 && pagination.totalPages > 5 && (
                      <>
                        {pagination.page < pagination.totalPages - 3 && (
                          <span className="px-1 text-xs text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => {
                            const newPagination = { ...pagination, page: pagination.totalPages }
                            setPagination(newPagination)
                            updateURL(filters, newPagination)
                          }}
                          className="px-2 py-1 text-xs text-gray-700 hover:text-gray-900 transition-colors"
                        >
                          {pagination.totalPages}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Barra flotante de acciones masivas */}
      {isBulkEditMode && selectedProductIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-2xl border-2 border-blue-500 z-50 p-3 min-w-[500px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-900">
                {selectedProductIds.size} producto{selectedProductIds.size !== 1 ? 's' : ''} seleccionado{selectedProductIds.size !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setSelectedProductIds(new Set())}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                loadAllCategoriesForModal()
                setShowBulkCategoryModal(true)
              }}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              Cambiar categoría
            </button>
            <button
              onClick={() => {
                loadPriceFormulas()
                setShowBulkFormulaModal(true)
              }}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              Aplicar fórmula
            </button>
            <button
              onClick={() => setShowBulkActiveModal(true)}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              Activar/Desactivar
            </button>
          </div>
        </div>
      )}

      {/* Overlay de procesamiento */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Procesando productos...</h3>
              <p className="text-sm text-gray-600">
                {processingProgress.current} de {processingProgress.total} productos procesados
              </p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${processingProgress.total > 0 ? (processingProgress.current / processingProgress.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cambiar categoría */}
      {showBulkCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Cambiar categoría</h3>
                <button onClick={() => {
                  setShowBulkCategoryModal(false)
                  setSelectedCategoryId('null')
                }} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                size={8}
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                <option value="null">Sin categoría</option>
                {allCategoriesForModal.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {(cat as any).displayName || cat.name}
                  </option>
                ))}
              </select>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    const categoryId = selectedCategoryId === 'null' ? null : selectedCategoryId
                    handleBulkUpdateCategory(categoryId)
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aplicar
                </button>
                <button
                  onClick={() => {
                    setShowBulkCategoryModal(false)
                    setSelectedCategoryId('null')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Aplicar fórmula */}
      {showBulkFormulaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Aplicar fórmula de precio</h3>
                <button onClick={() => {
                  setShowBulkFormulaModal(false)
                  setSelectedFormulaId('')
                }} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Fórmula</label>
              <select
                value={selectedFormulaId}
                onChange={(e) => setSelectedFormulaId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar fórmula...</option>
                {priceFormulas.map((formula) => (
                  <option key={formula.id} value={formula.id}>
                    {formula.name} ({formula.type})
                  </option>
                ))}
              </select>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    if (selectedFormulaId) {
                      handleBulkApplyPriceFormula(selectedFormulaId)
                    }
                  }}
                  disabled={isProcessing || !selectedFormulaId}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aplicar
                </button>
                <button
                  onClick={() => {
                    setShowBulkFormulaModal(false)
                    setSelectedFormulaId('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Activar/Desactivar */}
      {showBulkActiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Activar/Desactivar productos</h3>
                <button onClick={() => setShowBulkActiveModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>{selectedProductIds.size}</strong> producto{selectedProductIds.size !== 1 ? 's' : ''} seleccionado{selectedProductIds.size !== 1 ? 's' : ''}:
                </p>
                {modalCounts.activeCount > 0 && (
                  <p className="text-sm text-gray-600">
                    • <strong>{modalCounts.activeCount}</strong> activo{modalCounts.activeCount !== 1 ? 's' : ''} → se desactivarán
                  </p>
                )}
                {modalCounts.inactiveCount > 0 && (
                  <p className="text-sm text-gray-600">
                    • <strong>{modalCounts.inactiveCount}</strong> inactivo{modalCounts.inactiveCount !== 1 ? 's' : ''} → se activarán
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (modalCounts.inactiveCount > 0) {
                      handleBulkToggleActive(true)
                    }
                  }}
                  disabled={isProcessing || modalCounts.inactiveCount === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Activar ({modalCounts.inactiveCount})
                </button>
                <button
                  onClick={() => {
                    if (modalCounts.activeCount > 0) {
                      handleBulkToggleActive(false)
                    }
                  }}
                  disabled={isProcessing || modalCounts.activeCount === 0}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Desactivar ({modalCounts.activeCount})
                </button>
              </div>
              <button
                onClick={() => setShowBulkActiveModal(false)}
                className="w-full mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resultado de operación */}
      {showResultModal && bulkOperationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Resultado de la operación</h3>
                <button onClick={() => setShowResultModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{bulkOperationResult.updated || 0}</div>
                    <div className="text-sm text-gray-600">Actualizados</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">{bulkOperationResult.errors || 0}</div>
                    <div className="text-sm text-gray-600">Errores</div>
                  </div>
                  {bulkOperationResult.rankingUpdated !== undefined && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">{bulkOperationResult.rankingUpdated || 0}</div>
                      <div className="text-sm text-gray-600">En ranking</div>
                    </div>
                  )}
                </div>
                {bulkOperationResult.details && bulkOperationResult.details.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Detalles:</h4>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {bulkOperationResult.details
                        .filter((d: any) => !d.success || d.reason)
                        .slice(0, 20)
                        .map((detail: any, idx: number) => (
                          <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                            <span className="font-medium">{detail.productId.substring(0, 8)}...</span>
                            {detail.error && <span className="text-red-600 ml-2">Error: {detail.error}</span>}
                            {detail.reason && <span className="text-amber-600 ml-2">Razón: {detail.reason}</span>}
                          </div>
                        ))}
                      {bulkOperationResult.details.filter((d: any) => !d.success || d.reason).length > 20 && (
                        <div className="text-xs text-gray-500 p-2">
                          ... y {bulkOperationResult.details.filter((d: any) => !d.success || d.reason).length - 20} más
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

