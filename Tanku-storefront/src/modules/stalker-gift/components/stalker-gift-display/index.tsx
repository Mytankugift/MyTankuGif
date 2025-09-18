"use client"

import Image from "next/image"
import { StalkerGiftData } from "../../actions/get-stalker-gift"

interface StalkerGiftDisplayProps {
  stalkerGift: StalkerGiftData
}

export default function StalkerGiftDisplay({ stalkerGift }: StalkerGiftDisplayProps) {
  const recipientName = stalkerGift.recipient_name
  const alias = stalkerGift.alias
  const message = stalkerGift.message
  const products = stalkerGift.products || []

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header principal */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎁</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            HOLA <span className="text-[#5FE085]">@{recipientName.toUpperCase()}</span>, ERES MUY AFORTUNAD@
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Acabas de recibir un <span className="text-[#66DEDB] font-bold">#StalkerGift TANKU</span> 😊
          </p>
          <p className="text-lg text-gray-400">
            (Un regalo incógnito de un admirador/@ secret@): <span className="text-[#5FE085] font-semibold">@{alias}</span>
          </p>
        </div>

        {/* Productos */}
        <div className="bg-gradient-to-r from-[#66DEDB]/10 to-[#5FE085]/10 border border-[#66DEDB]/30 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#66DEDB] mb-6 text-center">
            🎁 TUS REGALOS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((product: any, index: number) => (
              <div key={index} className="bg-[#262626]/50 rounded-xl p-6 border border-[#66DEDB]/20">
                {/* Nombre del producto */}
                <h3 className="text-xl font-bold text-white mb-4 text-center">
                  {product.title || "PRODUCTO SORPRESA"}
                </h3>
                
                {/* Foto del producto */}
                <div className="relative w-full h-64 mb-4 rounded-lg overflow-hidden">
                  <Image
                    src={product.thumbnail || '/placeholder.png'}
                    alt={product.title || "Producto"}
                    fill
                    className="object-cover"
                  />
                </div>
                
                {/* Precio */}
                {product.variants?.[0]?.inventory?.price && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#5FE085]">
                      ${product.variants[0].inventory.price.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mensaje personalizado */}
        {message && (
          <div className="bg-gradient-to-r from-[#5FE085]/10 to-[#5FE085]/10 border border-[#5FE085]/30 rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold text-[#5FE085] mb-4 text-center">
              💌 Y @{alias} te quiere decir:
            </h3>
            <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#5FE085]/20">
              <p className="text-lg text-white leading-relaxed text-center italic">
                "{message}"
              </p>
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-gradient-to-r from-[#66DEDB]/10 to-[#5FE085]/10 border border-[#66DEDB]/30 rounded-2xl p-8 mb-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-[#66DEDB] mb-4">
              ⏰ ¡TIENES 3 DÍAS PARA HACER EFECTIVO TU REGALO!
            </h3>
          </div>
          
          <div className="space-y-4 text-gray-300 leading-relaxed">
            <p>
              Ahora <span className="text-[#5FE085] font-semibold">@{recipientName}</span> tienes <span className="text-[#E73230] font-bold">3 días</span> para hacer efectivo tu REGALO con la total tranquilidad que una vez crees tu cuenta en TANKU <span className="text-[#5FE085] font-semibold">@{alias}</span> NO recibirá ninguno de tus datos personales que serán tratados con la política de datos TANKU.
            </p>
            
            <p>
              Como es un regalo <span className="text-[#5FE085] font-bold">no tendrá ningún costo para ti</span>, así que regístrate en TANKU ahora, para que podamos enviarte tu regalo y comiences a disfrutarlo cuanto antes.
            </p>
            
            <p className="text-[#66DEDB] font-semibold">
              Una vez termines tu registro se habilitará la comunicación con <span className="text-[#5FE085]">@{alias}</span> para que la vida te siga regalando lo mejor <span className="text-[#5FE085]">@{recipientName}</span>.
            </p>
          </div>
        </div>

        {/* Formulario de registro */}
        <div className="bg-gradient-to-r from-[#66DEDB]/10 to-[#5FE085]/10 border border-[#66DEDB]/30 rounded-2xl p-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-[#66DEDB] mb-2">
              📋 COMPLETA TU REGISTRO
            </h3>
            <p className="text-gray-300 text-sm">
              Para recibir tu regalo de <span className="text-[#5FE085] font-semibold">@{alias}</span>
            </p>
          </div>

          {/* Formulario basado en el componente de registro existente */}
          <form className="max-w-md mx-auto">
            <div className="flex flex-col gap-y-4 border-2 border-[#5FE085] rounded-lg p-6 bg-black/20 backdrop-blur-sm">
              
              {/* Nombre */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  name="first_name"
                  type="text"
                  placeholder="Nombre"
                  autoComplete="given-name"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#5FE085] focus:outline-none transition-colors text-sm"
                />
              </div>

              {/* Apellido */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  name="last_name"
                  type="text"
                  placeholder="Apellido"
                  autoComplete="family-name"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#5FE085] focus:outline-none transition-colors text-sm"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  name="email"
                  type="email"
                  placeholder="Correo Electrónico"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#5FE085] focus:outline-none transition-colors text-sm"
                />
              </div>

              {/* Teléfono */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  name="phone"
                  type="tel"
                  placeholder="Teléfono"
                  autoComplete="tel"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#5FE085] focus:outline-none transition-colors text-sm"
                />
              </div>

              {/* Dirección */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input
                  name="address"
                  type="text"
                  placeholder="Dirección de envío"
                  autoComplete="street-address"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#5FE085] focus:outline-none transition-colors text-sm"
                />
              </div>

              {/* Contraseña */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  name="password"
                  type="password"
                  placeholder="Contraseña"
                  autoComplete="new-password"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#5FE085] focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>

            {/* Términos y Privacidad */}
            <div className="text-center mt-4 mb-4">
              <span className="text-white text-xs">
                Al crear una cuenta, aceptas los{" "}
                <span className="text-[#5FE085] underline hover:text-[#66DEDB] transition-colors cursor-pointer">
                  Términos
                </span>{" "}
                y{" "}
                <span className="text-[#5FE085] underline hover:text-[#66DEDB] transition-colors cursor-pointer">
                  Privacidad
                </span>
              </span>
            </div>
            
            {/* Botón de registro */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] text-white font-semibold rounded-lg hover:scale-105 hover:shadow-lg transition-all duration-300 text-sm"
            >
              🎁 CREAR CUENTA Y RECIBIR REGALO 🎁
            </button>
          </form>

          <p className="text-gray-400 text-xs mt-4 text-center">
            🔒 Tus datos están protegidos por la política de privacidad de TANKU
          </p>
        </div>

        {/* Footer motivacional */}
        <div className="text-center mt-12 p-6 bg-gradient-to-r from-[#5FE085]/10 to-[#5FE085]/10 rounded-2xl border border-[#5FE085]/30">
          <p className="text-[#5FE085] font-semibold text-lg">
            ✨ Los mejores regalos llegan cuando menos los esperas ✨
          </p>
          <p className="text-gray-300 text-sm mt-2">
            MyTanku - Conectando corazones a través de regalos
          </p>
        </div>
      </div>
    </div>
  )
}
