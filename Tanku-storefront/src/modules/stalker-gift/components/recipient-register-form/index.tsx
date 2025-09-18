"use client"

import { StalkerGiftData } from "../../actions/get-stalker-gift"
import Image from "next/image"

interface RecipientRegistrationFormProps {
  stalkerGift: StalkerGiftData
  onBack: () => void
}

const RecipientRegistrationForm = ({ stalkerGift, onBack }: RecipientRegistrationFormProps) => {
  const handleRegister = () => {
    // Redirect to main registration page
    window.location.href = '/account?view=register'
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1E1E1E] via-[#262626] to-[#1E1E1E]">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[url('/login/Tanku2 1.png')] bg-cover bg-center"></div>
        </div>
      </div>

      {/* Main content container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {/* Smartphone container */}
        <div className="relative">
          <div className="relative w-80 h-[700px]">
            <Image
              src="/login/smartphone.png"
              alt="Smartphone Frame"
              fill
              className="object-contain"
            />
            
            {/* Content inside smartphone screen */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
              {/* Back Button */}
              <div className="absolute top-8 left-6">
                <button
                  onClick={onBack}
                  className="flex items-center text-[#73FFA2] hover:text-[#66DEDB] transition-colors"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm">Volver</span>
                </button>
              </div>

              {/* Content */}
              <div className="text-center">
                {/* TANKU Logo */}
                <div className="mb-6">
                  <Image
                    src="/logoTanku.png"
                    alt="TANKU Logo"
                    width={60}
                    height={60}
                    className="object-contain mx-auto"
                  />
                </div>

                {/* Gift Icon */}
                <div className="text-6xl mb-4">🎁</div>

                {/* Title */}
                <h1 className="text-white text-xl font-bold mb-4">
                  ¡Tienes un regalo!
                </h1>

                {/* Sender info */}
                <p className="text-gray-300 text-sm mb-2">
                  De: <span className="text-[#73FFA2] font-semibold">{stalkerGift.first_name}</span>
                </p>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto">
                  Para reclamar tu regalo sorpresa, necesitas crear una cuenta en TANKU
                </p>

                {/* Register Button */}
                <button
                  onClick={handleRegister}
                  className="w-full max-w-xs py-3 bg-gradient-to-r from-[#73FFA2] to-[#66DEDB] text-black font-semibold rounded-lg hover:scale-105 transition-all duration-300 shadow-lg"
                >
                  Regístrate Aquí
                </button>

                {/* Additional info */}
                <p className="text-gray-500 text-xs mt-4 max-w-xs mx-auto">
                  Es gratis y solo toma unos minutos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecipientRegistrationForm