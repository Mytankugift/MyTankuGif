"use client"
import React from "react"

const MyStore = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Mi Tienda</h2>
      <div className="bg-gray-700 p-4 rounded-lg">
        <p className="text-gray-300 mb-2">Bienvenido a tu panel de tienda</p>
        <p className="text-gray-400">Aquí podrás gestionar toda tu información de vendedor.</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-600 p-3 rounded">
            <h3 className="text-white font-semibold">Productos Totales</h3>
            <p className="text-2xl text-[#73FFA2]">24</p>
          </div>
          <div className="bg-gray-600 p-3 rounded">
            <h3 className="text-white font-semibold">Órdenes Pendientes</h3>
            <p className="text-2xl text-[#66DEDB]">8</p>
          </div>
          <div className="bg-gray-600 p-3 rounded">
            <h3 className="text-white font-semibold">Ventas del Mes</h3>
            <p className="text-2xl text-yellow-400">$1,250</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyStore
