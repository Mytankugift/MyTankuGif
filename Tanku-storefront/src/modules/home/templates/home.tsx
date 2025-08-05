import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1E1E1E] to-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#66DEDB] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#73FFA2] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#66DEDB] rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <div className="relative rounded-full p-4">
              <Image
                src="/logoTanku.png"
                alt="TANKU Logo"
                width={120}
                height={120}
                className="w-30 h-30 object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Welcome message */}
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
            Bienvenido a{" "}
            <span className="bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] bg-clip-text text-transparent">
              TANKU
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
            La primera red social de{" "}
            <span className="text-[#73FFA2] font-semibold">comercio social</span>{" "}
            donde conectas, compartes y compras
          </p>
          
          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            Descubre productos únicos, comparte tus historias, conecta con amigos y 
            vive una experiencia de compra completamente nueva. En TANKU, cada compra 
            es una aventura social.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-[#66DEDB]/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="w-12 h-12 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-[#73FFA2] font-semibold text-lg mb-2">Red Social</h3>
            <p className="text-gray-400 text-sm">Conecta con amigos, comparte historias y descubre contenido increíble</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-[#66DEDB]/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="w-12 h-12 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-[#73FFA2] font-semibold text-lg mb-2">E-commerce</h3>
            <p className="text-gray-400 text-sm">Compra productos únicos de vendedores verificados en todo el mundo</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-[#66DEDB]/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="w-12 h-12 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-[#73FFA2] font-semibold text-lg mb-2">Experiencia Única</h3>
            <p className="text-gray-400 text-sm">Vive el futuro del comercio social con tecnología de vanguardia</p>
          </div>
        </div>

        {/* Call to action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <LocalizedClientLink
            href="/account"
            className="bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-black font-semibold px-8 py-4 rounded-full hover:shadow-lg hover:shadow-[#66DEDB]/25 transition-all duration-300 hover:transform hover:scale-105 min-w-[200px]"
          >
            Comenzar Ahora
          </LocalizedClientLink>
          
          <LocalizedClientLink
            href="/store"
            className="border-2 border-[#66DEDB] text-[#66DEDB] font-semibold px-8 py-4 rounded-full hover:bg-[#66DEDB] hover:text-black transition-all duration-300 hover:transform hover:scale-105 min-w-[200px]"
          >
            Explorar Tienda
          </LocalizedClientLink>
        </div>
      </div>

      {/* Bottom decorative element */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#66DEDB] via-[#73FFA2] to-[#66DEDB] opacity-50"></div>
    </div>
  )
}

export default HomePage