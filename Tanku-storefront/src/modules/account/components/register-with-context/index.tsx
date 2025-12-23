"use client"

import { useEffect } from "react"
import { useFormState as useActionState } from "react-dom"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"
import Image from "next/image"
import { usePersonalInfoActions } from "@lib/context"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const RegisterWithContext = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)
  const { onRegistrationSuccess } = usePersonalInfoActions()

  // Handle successful registration - check message state changes
  useEffect(() => {
    // If registration was successful, the signup function returns the created customer object
    // If there's an error, it returns a string error message
    if (message && typeof message === 'object' && 'id' in message) {
      console.log('🔄 Registration successful detected, refreshing personal info...')
      const refreshData = async () => {
        try {
          await onRegistrationSuccess()
          console.log('✅ Personal info refreshed after successful registration')
        } catch (error) {
          console.error('❌ Error refreshing personal info after registration:', error)
        }
      }
      
      // Use a delay to ensure the auth token is properly set
      const timer = setTimeout(refreshData, 1000)
      return () => clearTimeout(timer)
    } else if (typeof message === 'string' && message.length > 0) {
      console.log('❌ Registration failed with message:', message)
    }
  }, [message, onRegistrationSuccess])

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Full screen background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/login/Tanku2 1.png"
          alt="TANKU Background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Main content container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {/* Smartphone container */}
        <div className="relative">
          {/* Smartphone background image */}
          <div className="relative w-80 h-[700px]">
            <Image
              src="/login/smartphone.png"
              alt="Smartphone Frame"
              fill
              className="object-contain"
            />
            
            {/* Content inside smartphone screen */}
            <div className="absolute inset-0 flex flex-col items-center justify-start pt-12 px-6 overflow-y-auto">
              {/* TANKU Logo */}
              <div className="mb-6">
                <Image
                  src="/logoTanku.png"
                  alt="TANKU Logo"
                  width={60}
                  height={60}
                  className="object-contain"
                />
              </div>

              {/* Welcome Text */}
              <div className="text-center mb-6">
                <h1 className="text-white text-lg font-bold mb-2">
                  Únete a TANKU
                </h1>
                <p className="text-gray-300 text-sm">
                  Crea tu perfil y accede a una experiencia de compra social única
                </p>
              </div>

              {/* Register Form */}
              <div className="w-full max-w-xs" data-testid="register-page">
                <form className="w-full" action={formAction}>
                  <div className="flex flex-col w-full gap-y-3 border-2 border-[#73FFA2] rounded-lg p-4 bg-black/20 backdrop-blur-sm">
                    {/* First Name Input */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                        <Image
                          src="/login/Profile.png"
                          alt="Profile Icon"
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                      </div>
                      <input
                        name="first_name"
                        type="text"
                        placeholder="Nombre"
                        autoComplete="given-name"
                        required
                        data-testid="first-name-input"
                        className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#73FFA2] focus:outline-none transition-colors text-sm"
                      />
                    </div>

                    {/* Last Name Input */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                        <Image
                          src="/login/Profile.png"
                          alt="Profile Icon"
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                      </div>
                      <input
                        name="last_name"
                        type="text"
                        placeholder="Apellido"
                        autoComplete="family-name"
                        required
                        data-testid="last-name-input"
                        className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#73FFA2] focus:outline-none transition-colors text-sm"
                      />
                    </div>

                    {/* Email Input */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#73FFA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="22,6 12,13 2,6" stroke="#73FFA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <input
                        name="email"
                        type="email"
                        placeholder="Correo Electrónico"
                        autoComplete="email"
                        required
                        data-testid="email-input"
                        className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#73FFA2] focus:outline-none transition-colors text-sm"
                      />
                    </div>

                    {/* Phone Input */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 16.92V19.92C22 20.52 21.52 21 20.92 21C10.93 21 3 13.07 3 3.08C3 2.48 3.48 2 4.08 2H7.09C7.69 2 8.09 2.48 8.09 3.08C8.09 4.58 8.34 6.03 8.81 7.39C8.94 7.75 8.83 8.15 8.55 8.43L6.84 10.14C8.87 14.06 11.94 17.13 15.86 19.16L17.57 17.45C17.85 17.17 18.25 17.06 18.61 17.19C19.97 17.66 21.42 17.91 22.92 17.91C23.52 17.91 24 18.39 24 18.99V21.99Z" stroke="#73FFA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <input
                        name="phone"
                        type="tel"
                        placeholder="Teléfono (Opcional)"
                        autoComplete="tel"
                        data-testid="phone-input"
                        className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#73FFA2] focus:outline-none transition-colors text-sm"
                      />
                    </div>

                    {/* Password Input */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                        <Image
                          src="/login/Lock.svg"
                          alt="Lock Icon"
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                      </div>
                      <input
                        name="password"
                        type="password"
                        placeholder="Contraseña"
                        autoComplete="new-password"
                        required
                        data-testid="password-input"
                        className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#73FFA2] focus:outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <ErrorMessage error={message} data-testid="register-error" />
                  
                  {/* Terms and Privacy */}
                  <div className="text-center mt-3 mb-4">
                    <span className="text-white text-xs">
                      Al crear una cuenta, aceptas los{" "}
                      <LocalizedClientLink
                        href="/content/terms-of-use"
                        className="text-[#73FFA2] underline hover:text-[#66DEDB] transition-colors"
                      >
                        Términos
                      </LocalizedClientLink>{" "}
                      y{" "}
                      <LocalizedClientLink
                        href="/content/privacy-policy"
                        className="text-[#73FFA2] underline hover:text-[#66DEDB] transition-colors"
                      >
                        Privacidad
                      </LocalizedClientLink>
                    </span>
                  </div>
                  
                  {/* Register Button with gradient */}
                  <button
                    type="submit"
                    data-testid="register-button"
                    className="w-full py-2.5 bg-gradient-to-r from-transparent to-[#73FFA2] text-white font-semibold rounded-lg hover:from-[#73FFA2]/20 hover:to-[#73FFA2] transition-all duration-300 text-sm"
                  >
                    Crear Cuenta
                  </button>
                </form>

                {/* Social Media Icons */}
                <div className="flex justify-center mt-4">
                  <Image
                    src="/login/IconsRedes.png"
                    alt="Social Media Icons"
                    width={120}
                    height={30}
                    className="object-contain"
                  />
                </div>

                {/* Login Link */}
                <div className="text-center mt-3">
                  <span className="text-white text-sm">
                    ¿Ya tienes una cuenta?{" "}
                    <button
                      onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
                      className="text-[#73FFA2] underline hover:text-[#66DEDB] transition-colors"
                    >
                      Iniciar Sesión
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterWithContext
