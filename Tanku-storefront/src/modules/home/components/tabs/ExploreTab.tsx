"use client"

export default function ExploreTab() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#73FFA2] mb-4">#Explore</h2>
        <p className="text-gray-300 text-lg">
          Explora nuevas funcionalidades y contenido
        </p>
      </div>

      {/* Construction Notice */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-12 text-center">
        <div className="text-6xl mb-6">🚧</div>
        <h3 className="text-2xl font-bold text-blue-400 mb-4">
          Página en Construcción
        </h3>
        <p className="text-gray-300 text-lg mb-6">
          Esta sección está siendo desarrollada para ofrecerte la mejor experiencia.
        </p>
        <div className="flex justify-center space-x-2">
          <div className="w-3 h-3 bg-[#73FFA2] rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-[#66DEDB] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-3 h-3 bg-[#73FFA2] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
        </div>
        <p className="text-gray-400 text-sm mt-6">
          ¡Vuelve pronto para descubrir las nuevas funcionalidades!
        </p>
      </div>
    </div>
  )
}
