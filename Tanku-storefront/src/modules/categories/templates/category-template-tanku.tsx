"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ChevronDown, ChevronRight, SquaresPlus } from "@medusajs/icons"

interface CategoryTemplateTankuProps {
  category: HttpTypes.StoreProductCategory
}

const CategoryTemplateTanku: React.FC<CategoryTemplateTankuProps> = ({ category }) => {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showSubcategories, setShowSubcategories] = useState(true)

  // Filter products based on selected subcategory
  const filteredProducts = selectedSubcategory 
    ? category.products?.filter(product => 
        // This would need to be implemented based on how products are linked to subcategories
        // For now, showing all products
        true
      ) || []
    : category.products || []

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#1A485C] to-[#73FFA2] p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">{category.name}</h1>
          <p className="text-lg opacity-90">{category.description}</p>
          <div className="mt-4 text-sm opacity-75">
            {category.products?.length || 0} productos disponibles
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Subcategories */}
          {category.category_children && category.category_children.length > 0 && (
            <div className="lg:w-1/4">
              <div className="bg-[#2A2A2A] rounded-lg p-6">
                <button
                  onClick={() => setShowSubcategories(!showSubcategories)}
                  className="flex items-center justify-between w-full mb-4 text-lg font-semibold"
                >
                  <span>Subcategorías</span>
                  {showSubcategories ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
                
                {showSubcategories && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedSubcategory(null)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedSubcategory === null
                          ? 'bg-[#73FFA2] text-black font-medium'
                          : 'hover:bg-[#3A3A3A]'
                      }`}
                    >
                      Todos los productos
                    </button>
                    {category.category_children.map((subcategory) => (
                      <button
                        key={subcategory.id}
                        onClick={() => setSelectedSubcategory(subcategory.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedSubcategory === subcategory.id
                            ? 'bg-[#73FFA2] text-black font-medium'
                            : 'hover:bg-[#3A3A3A]'
                        }`}
                      >
                        {subcategory.name}
                      </button>
                    ))}
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
                  ? category.category_children?.find(sub => sub.id === selectedSubcategory)?.name
                  : 'Todos los productos'
                }
                <span className="text-sm text-gray-400 ml-2">
                  ({filteredProducts.length} productos)
                </span>
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