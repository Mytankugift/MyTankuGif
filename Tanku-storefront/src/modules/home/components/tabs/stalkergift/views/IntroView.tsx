"use client"

interface IntroViewProps {
  onSelectOption: (option: 'for-me' | 'for-tanku-user' | 'for-external-user') => void
}

export default function IntroView({ onSelectOption }: IntroViewProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header con gradiente */}
      <div className="text-center mb-8">
        <div className="inline-block bg-gradient-to-r from-[#66DEDB] to-[#66DEDB]/70 rounded-full px-6 py-2 mb-4">
          <h2 className="text-3xl font-bold text-white">#StalkerGift</h2>
        </div>
        <p className="text-gray-300 text-lg mb-6">
          Sorprende a esa persona con un regalo anónimo y crea una nueva conexión
        </p>
        <div className="bg-[#66DEDB]/20 border border-[#66DEDB]/50 rounded-2xl p-6 mb-8">
          <p className="text-[#66DEDB] font-semibold text-lg mb-2">
            🎁 ¿Qué es StalkerGift?
          </p>
          <p className="text-gray-300 leading-relaxed">
            Tu identidad permanecerá en secreto hasta que decidas compartirla. 
            Envía regalos de forma anónima y crea conexiones únicas con otros usuarios.
          </p>
        </div>
      </div>

      {/* Opciones de StalkerGift */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Opción 3: Para usuario externo */}
        <div 
          onClick={() => onSelectOption('for-external-user')}
          className="group bg-gradient-to-br from-[#262626] to-[#66DEDB]/10 border-2 border-[#66DEDB]/30 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-[#66DEDB] hover:shadow-lg hover:shadow-[#66DEDB]/20 hover:scale-105"
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] rounded-full flex items-center justify-center group-hover:animate-pulse">
              <span className="text-2xl">📮</span>
            </div>
            <h3 className="text-xl font-bold text-[#66DEDB] mb-2">Regalo Para Usuario Externo</h3>
            <p className="text-gray-400 text-sm">
              Invita a alguien nuevo a Tanku con un regalo sorpresa
            </p>
          </div>
        </div>

        {/* Opción 1: Para mí */}
        <div 
          onClick={() => onSelectOption('for-me')}
          className="group bg-gradient-to-br from-[#262626] to-[#66DEDB]/10 border-2 border-[#66DEDB]/30 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-[#66DEDB] hover:shadow-lg hover:shadow-[#66DEDB]/20 hover:scale-105"
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] rounded-full flex items-center justify-center group-hover:animate-pulse">
              <span className="text-2xl">🛍️</span>
            </div>
            <h3 className="text-xl font-bold text-[#66DEDB] mb-2">Un Producto Para Mí</h3>
            <p className="text-gray-400 text-sm">
              Compra productos para ti mismo de forma privada
            </p>
          </div>
        </div>

        {/* Opción 2: Para usuario de Tanku */}
        <div 
          onClick={() => onSelectOption('for-tanku-user')}
          className="group bg-gradient-to-br from-[#262626] to-[#66DEDB]/10 border-2 border-[#66DEDB]/30 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-[#66DEDB] hover:shadow-lg hover:shadow-[#66DEDB]/20 hover:scale-105"
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] rounded-full flex items-center justify-center group-hover:animate-pulse">
              <span className="text-2xl">🎁</span>
            </div>
            <h3 className="text-xl font-bold text-[#66DEDB] mb-2">Regalo Para Usuario Tanku</h3>
            <p className="text-gray-400 text-sm">
              Envía un regalo anónimo a alguien registrado en Tanku
            </p>
          </div>
        </div>
      </div>

      {/* Mensaje de confianza */}
      <div className="mt-8 text-center">
        <p className="text-[#66DEDB]/80 text-sm font-medium">
          ✨ Tu identidad permanecerá en secreto hasta que decidas compartirla ✨
        </p>
      </div>
    </div>
  )
}
