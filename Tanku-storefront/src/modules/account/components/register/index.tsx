"use client"

import { useActionState } from "react"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"
import Image from "next/image"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)

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
                        data-testid="email-input"
                        className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-[#73FFA2] focus:outline-none transition-colors text-sm"
                      />
                    </div>

                    {/* Phone Input */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
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

export default Register
