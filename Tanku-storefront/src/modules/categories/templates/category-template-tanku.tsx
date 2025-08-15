"use client"

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ChevronDown, ChevronRight, SquaresPlus } from "@medusajs/icons"

type ExtendedStoreProductCategory = Omit<HttpTypes.StoreProductCategory, 'category_children'> & {
  products?: HttpTypes.StoreProduct[]
  category_children?: ExtendedStoreProductCategory[]
}

interface CategoryTemplateTankuProps {
  category: ExtendedStoreProductCategory
}

const CategoryTemplateTanku: React.FC<CategoryTemplateTankuProps> = ({ category }) => {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showSubcategories, setShowSubcategories] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Función recursiva para extraer todos los productos de categorías hijas
  const getAllProductsFromCategory = (cat: ExtendedStoreProductCategory): HttpTypes.StoreProduct[] => {
    let allProducts: HttpTypes.StoreProduct[] = cat.products || []
    
    if (cat.category_children && cat.category_children.length > 0) {
      cat.category_children.forEach((childCategory: ExtendedStoreProductCategory) => {
        allProducts = [...allProducts, ...getAllProductsFromCategory(childCategory)]
      })
    }
    
    return allProducts
  }

  // Función recursiva para obtener todas las categorías anidadas
  const getAllCategories = (cat: ExtendedStoreProductCategory): ExtendedStoreProductCategory[] => {
    let allCategories: ExtendedStoreProductCategory[] = []
    
    if (cat.category_children && cat.category_children.length > 0) {
      cat.category_children.forEach((childCategory: ExtendedStoreProductCategory) => {
        allCategories.push(childCategory)
        allCategories = [...allCategories, ...getAllCategories(childCategory)]
      })
    }
    
    return allCategories
  }

  // Función para obtener productos de una categoría específica (incluyendo productos de categorías hijas)
  const getProductsFromSpecificCategory = (categoryId: string): HttpTypes.StoreProduct[] => {
    const allCategories = getAllCategories(category)
    const targetCategory = allCategories.find(cat => cat.id === categoryId)
    
    if (!targetCategory) {
      return []
    }
    
    // Obtener todos los productos de la categoría y sus hijas recursivamente
    return getAllProductsFromCategory(targetCategory)
  }

  // Función para contar productos recursivamente (categoría + todas sus hijas)
  const getTotalProductsCount = (cat: ExtendedStoreProductCategory): number => {
    let totalCount = cat.products?.length || 0
    
    if (cat.category_children && cat.category_children.length > 0) {
      cat.category_children.forEach((childCategory: ExtendedStoreProductCategory) => {
        totalCount += getTotalProductsCount(childCategory)
      })
    }
    
    return totalCount
  }

  // Memoizar todos los productos disponibles
  const allAvailableProducts = useMemo(() => {
    const categoryProducts = category.products || []
    const childrenProducts = getAllProductsFromCategory(category)
    
    // Eliminar duplicados basados en el ID del producto
    const uniqueProducts = new Map<string, HttpTypes.StoreProduct>()
    
    const allProducts = [...categoryProducts, ...childrenProducts]
    allProducts.forEach((product: HttpTypes.StoreProduct) => {
      if (product.id && !uniqueProducts.has(product.id)) {
        uniqueProducts.set(product.id, product)
      }
    })
    
    return Array.from(uniqueProducts.values())
  }, [category])

  // Memoizar todas las categorías disponibles para el filtro
  const allCategories = useMemo(() => {
    return getAllCategories(category)
  }, [category])

  // Filtrar productos basado en la subcategoría seleccionada
  const filteredProducts = useMemo(() => {
    if (!selectedSubcategory) {
      return allAvailableProducts
    }
    
    return getProductsFromSpecificCategory(selectedSubcategory)
  }, [selectedSubcategory, allAvailableProducts, getProductsFromSpecificCategory])

  // Función para alternar expansión de categorías
  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  // Componente recursivo para renderizar categorías jerárquicas
  const renderCategoryTree = (categories: ExtendedStoreProductCategory[], level: number = 0): React.ReactElement[] => {
    return categories.map((cat) => {
      const hasChildren = cat.category_children && cat.category_children.length > 0
      const isExpanded = expandedCategories.has(cat.id)
      const totalProductsCount = getTotalProductsCount(cat)
      const indentClass = `ml-${level * 4}`
      
      return (
        <div key={cat.id} className="space-y-1">
          <div className={`flex items-center ${indentClass}`}>
            {hasChildren && (
              <button
                onClick={() => toggleCategoryExpansion(cat.id)}
                className="mr-2 p-1 hover:bg-[#3A3A3A] rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6 mr-2" />}
            
            <button
              onClick={() => setSelectedSubcategory(cat.id)}
              className={`flex-1 text-left p-2 rounded-lg transition-colors ${
                selectedSubcategory === cat.id
                  ? 'bg-[#73FFA2] text-black font-medium'
                  : 'hover:bg-[#3A3A3A]'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm">{cat.name}</span>
                <span className="text-xs opacity-75">({totalProductsCount})</span>
              </div>
            </button>
          </div>
          
          {hasChildren && isExpanded && cat.category_children && (
            <div className="space-y-1">
              {renderCategoryTree(cat.category_children, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#1A485C] to-[#73FFA2] p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">{category.name}</h1>
          <p className="text-lg opacity-90">{category.description}</p>
          <div className="mt-4 text-sm opacity-75">
            {allAvailableProducts.length} productos disponibles
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Hierarchical Categories */}
          {(category.category_children && category.category_children.length > 0) && (
            <div className="lg:w-1/4">
              <div className="bg-[#2A2A2A] rounded-lg p-6">
                <button
                  onClick={() => setShowSubcategories(!showSubcategories)}
                  className="flex items-center justify-between w-full mb-4 text-lg font-semibold"
                >
                  <span>Categorías</span>
                  {showSubcategories ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
                
                {showSubcategories && (
                  <div className="space-y-2">
                    {/* Opción para mostrar todos los productos */}
                    <button
                      onClick={() => setSelectedSubcategory(null)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedSubcategory === null
                          ? 'bg-[#73FFA2] text-black font-medium'
                          : 'hover:bg-[#3A3A3A]'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Todos los productos</span>
                        <span className="text-xs opacity-75">({allAvailableProducts.length})</span>
                      </div>
                    </button>
                    
                    {/* Árbol jerárquico de categorías */}
                    <div className="space-y-1">
                      {renderCategoryTree(category.category_children)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1">
            {/* Controls */}
            <div className="flex justify-between items-center mb-6">
              <div className="text-lg font-medium">
                {selectedSubcategory 
                  ? allCategories.find(sub => sub.id === selectedSubcategory)?.name
                  : 'Todos los productos'
                }
                <span className="text-sm text-gray-400 ml-2">({filteredProducts.length} productos)</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex bg-[#2A2A2A] rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-[#73FFA2] text-black'
                        : 'hover:bg-[#3A3A3A]'
                    }`}
                  >
                    <SquaresPlus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-[#73FFA2] text-black'
                        : 'hover:bg-[#3A3A3A]'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid/List */}
            {filteredProducts.length > 0 ? (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4'
              }>
                {filteredProducts.map((product) => (
                  <LocalizedClientLink
                    key={product.id}
                    href={`/products/${product.handle}`}
                    className="group"
                  >
                    {viewMode === 'grid' ? (
                      // Grid View
                      <div className="bg-[#2A2A2A] rounded-lg overflow-hidden hover:bg-[#3A3A3A] transition-all duration-300 group-hover:scale-105">
                        <div className="aspect-square relative overflow-hidden">
                          <Image
                            src={product.thumbnail || '/placeholder-product.png'}
                            alt={product.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-2 group-hover:text-[#73FFA2] transition-colors">
                            {product.title}
                          </h3>
                          <p className="text-gray-400 text-sm line-clamp-2">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    ) : (
                      // List View
                      <div className="bg-[#2A2A2A] rounded-lg p-4 flex gap-4 hover:bg-[#3A3A3A] transition-colors">
                        <div className="w-24 h-24 relative overflow-hidden rounded-lg flex-shrink-0">
                          <Image
                            src={product.thumbnail || '/placeholder-product.png'}
                            alt={product.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2 group-hover:text-[#73FFA2] transition-colors">
                            {product.title}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    )}
                  </LocalizedClientLink>
                ))}
              </div>
            ) : (
              // Empty State
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-[#2A2A2A] rounded-full flex items-center justify-center">
                  <SquaresPlus className="w-5 h-5 text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No hay productos disponibles</h3>
                <p className="text-gray-400">
                  {selectedSubcategory 
                    ? 'No se encontraron productos en esta subcategoría.'
                    : 'Esta categoría no tiene productos disponibles en este momento.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryTemplateTanku