"use client"

import { useState } from "react"
import SelectableUsersList, { SelectableUser } from "../components/SelectableUsersList"

interface ForTankuUserViewProps {
  onBack: () => void
}

export default function ForTankuUserView({ onBack }: ForTankuUserViewProps) {
  const [selectedUser, setSelectedUser] = useState<SelectableUser | null>(null)

  const handleUserSelect = (user: SelectableUser) => {
    setSelectedUser(user)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-[#66DEDB] hover:text-[#5FE085] transition-colors duration-300"
        >
          <span className="mr-2">←</span> Volver a opciones
        </button>
      </div>

      <div className="bg-gradient-to-r from-[#66DEDB]/10 to-[#5FE085]/10 border border-[#66DEDB]/30 rounded-2xl p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#66DEDB] mb-2">
            🎁 Regalo Para Usuario Tanku
          </h2>
          <p className="text-gray-300">
            Selecciona un usuario registrado en Tanku para enviarle un regalo anónimo
          </p>
        </div>
    
        <SelectableUsersList 
          onUserSelect={handleUserSelect}
          selectedUserId={selectedUser?.id}
        />

        {/* Información del usuario seleccionado */}
        {selectedUser && (
          <div className="mt-6 bg-[#262626]/30 rounded-xl p-4 border border-[#66DEDB]/20">
            <div className="flex items-center space-x-4">
              <div className="relative w-12 h-12">
                <img
                  src="/feed/avatar.png"
                  alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                  className="w-full h-full rounded-full object-cover border-2 border-[#66DEDB]"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h3>
                <p className="text-gray-400 text-sm">{selectedUser.email}</p>
                <p className="text-[#66DEDB] text-xs">ID: {selectedUser.id.slice(-8)}</p>
              </div>
              <div className="ml-auto">
                <div className="text-[#5FE085] flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Seleccionado</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de desarrollo */}
        <div className="mt-8 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <span className="text-3xl mr-3">🚧</span>
            <h3 className="text-xl font-bold text-yellow-400">Módulo en Desarrollo</h3>
          </div>
          
        </div>
      </div>
    </div>
  )
}
