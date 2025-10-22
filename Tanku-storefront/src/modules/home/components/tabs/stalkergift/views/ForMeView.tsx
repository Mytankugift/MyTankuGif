"use client"

interface ForMeViewProps {
  onBack: () => void
}

export default function ForMeView({ onBack }: ForMeViewProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-[#66DEDB] hover:text-[#5FE085] transition-colors duration-300"
        >
          <span className="mr-2">←</span> Volver a opciones
        </button>
      </div>
      
      <div className="bg-gradient-to-r from-[#66DEDB]/20 to-[#5FE085]/20 border border-[#66DEDB]/50 rounded-2xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] rounded-full flex items-center justify-center">
          <span className="text-3xl">🛍️</span>
        </div>
        <h2 className="text-2xl font-bold text-[#66DEDB] mb-4">Un Producto Para Mí</h2>
        <p className="text-gray-300 text-lg mb-6">
          Aquí podrás comprar productos para ti mismo de forma completamente privada.
        </p>
        <div className="bg-[#262626]/50 rounded-xl p-6">
          <p className="text-gray-400">
            [MÓDULO EN DESARROLLO] - Esta sección permitirá navegar el catálogo de productos 
            y realizar compras privadas sin revelar tu identidad en el historial público.
          </p>
        </div>
      </div>
    </div>
  )
}
