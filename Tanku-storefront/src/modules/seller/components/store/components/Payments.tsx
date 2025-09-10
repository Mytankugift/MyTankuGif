"use client"
import React from "react"

const Payments = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Pagos</h2>
      <div className="bg-gray-700 p-4 rounded-lg">
        <p className="text-gray-300 mb-4">Gestiona tus pagos y comisiones</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-600 p-4 rounded">
            <h3 className="text-white font-semibold mb-2">Balance Disponible</h3>
            <p className="text-3xl text-[#73FFA2] font-bold">$1,847.50</p>
          </div>
          <div className="bg-gray-600 p-4 rounded">
            <h3 className="text-white font-semibold mb-2">Pendiente de Pago</h3>
            <p className="text-3xl text-yellow-400 font-bold">$325.00</p>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-white font-semibold">Historial de Pagos</h3>
          <div className="bg-gray-600 p-3 rounded">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white">Pago #PAY001</p>
                <p className="text-gray-400 text-sm">05/09/2025</p>
              </div>
              <span className="text-[#73FFA2] font-bold">+$450.00</span>
            </div>
          </div>
          <div className="bg-gray-600 p-3 rounded">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white">Pago #PAY002</p>
                <p className="text-gray-400 text-sm">01/09/2025</p>
              </div>
              <span className="text-[#73FFA2] font-bold">+$275.50</span>
            </div>
          </div>
        </div>
        <button className="mt-4 px-4 py-2 bg-[#66DEDB] text-gray-900 rounded hover:bg-[#5bc5c1] transition-colors">
          Solicitar Retiro
        </button>
      </div>
    </div>
  )
}

export default Payments
