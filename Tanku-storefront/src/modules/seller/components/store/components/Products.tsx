"use client"
import React from "react"

const Products = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Productos</h2>
      <div className="bg-gray-700 p-4 rounded-lg">
        <p className="text-gray-300 mb-4">Gestiona tu inventario de productos</p>
        <div className="space-y-3">
          <div className="bg-gray-600 p-3 rounded flex justify-between items-center">
            <div>
              <h3 className="text-white font-semibold">Producto Ejemplo 1</h3>
              <p className="text-gray-400">SKU: PRD001 - Stock: 15</p>
            </div>
            <span className="text-[#73FFA2] font-bold">$29.99</span>
          </div>
          <div className="bg-gray-600 p-3 rounded flex justify-between items-center">
            <div>
              <h3 className="text-white font-semibold">Producto Ejemplo 2</h3>
              <p className="text-gray-400">SKU: PRD002 - Stock: 8</p>
            </div>
            <span className="text-[#73FFA2] font-bold">$45.50</span>
          </div>
          <div className="bg-gray-600 p-3 rounded flex justify-between items-center">
            <div>
              <h3 className="text-white font-semibold">Producto Ejemplo 3</h3>
              <p className="text-gray-400">SKU: PRD003 - Stock: 22</p>
            </div>
            <span className="text-[#73FFA2] font-bold">$19.99</span>
          </div>
        </div>
        <button className="mt-4 px-4 py-2 bg-[#73FFA2] text-gray-900 rounded hover:bg-[#66e891] transition-colors">
          Agregar Producto
        </button>
      </div>
    </div>
  )
}

export default Products
