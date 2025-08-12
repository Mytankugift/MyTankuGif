"use client"

import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { useActionState, useEffect } from "react"
import Image from "next/image"
import { usePersonalInfoActions } from "@lib/context"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const LoginWithContext = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)
  const { onLoginSuccess } = usePersonalInfoActions()

  // Handle successful login - check message state changes
  useEffect(() => {
    // If login was successful (no error message), refresh personal info
    // We check if message is specifically undefined (successful) vs null (initial state)
    if (message === undefined) {
      console.log('🔄 Login successful detected, refreshing personal info...')
      const refreshData = async () => {
        try {
          await onLoginSuccess()
          console.log('✅ Personal info refreshed after successful login')
        } catch (error) {
          console.error('❌ Error refreshing personal info after login:', error)
        }
      }
      
      // Use a small delay to ensure the auth token is properly set
      const timer = setTimeout(refreshData, 1000)
      return () => clearTimeout(timer)
    } else if (typeof message === 'string' && message.length > 0) {
      console.log('❌ Login failed with message:', message)
    }
  }, [message, onLoginSuccess])

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
          <div className="relative w-80 h-[600px]">
            <Image
              src="/login/smartphone.png"
              alt="Smartphone Frame"
              fill
              className="object-contain"
            />
            
            {/* Content inside smartphone screen */}
            <div className="absolute inset-0 flex flex-col items-center justify-start pt-16 px-8">
              {/* TANKU Logo */}
              <div className="mb-8">
                <Image
                  src="/logoTanku.png"
                  alt="TANKU Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>

              {/* Login Form */}
              <div className="w-full max-w-xs" data-testid="login-page">
                <form className="w-full" action={formAction}>
                  <div className="flex flex-col w-full gap-y-4 rounded-lg p-4 bg-black/20 backdrop-blur-sm">
                    {/* Email Input */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                        <Image
                          src="/login/Profile.png"
                          alt="Profile Icon"
                          width={20}
                          height={20}
                          className="object-contain"
                        />
                      </div>
                      <input
                        name="email"
                        type="email"
                        placeholder="Email o Usuario"
                        title="Enter a valid email address."
                        autoComplete="email"
                        required
                        data-testid="email-input"
                        className="w-full pl-12 pr-4 py-3 bg-transparent border border-[#73FFA2] rounded-lg text-white placeholder-gray-400 focus:border-[#73FFA2] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Password Input */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                        <Image
                          src="/login/Lock.svg"
                          alt="Lock Icon"
                          width={20}
                          height={20}
                          className="object-contain"
                        />
                      </div>
                      <input
                        name="password"
                        type="password"
                        placeholder="Contraseña"
                        autoComplete="current-password"
                        required
                        data-testid="password-input"
                        className="w-full pl-12 pr-4 py-3 bg-transparent border border-[#73FFA2] rounded-lg text-white placeholder-gray-400 focus:border-[#73FFA2] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <ErrorMessage error={message} data-testid="login-error-message" />
                  
                  {/* Login Button with gradient */}
                  <button
                    type="submit"
                    data-testid="sign-in-button"
                    className="w-full mt-4 py-3 bg-gradient-to-r from-transparent to-[#73FFA2] text-white font-semibold rounded-lg hover:from-[#73FFA2]/20 hover:to-[#73FFA2] transition-all duration-300"
                  >
                    Iniciar Sesión
                  </button>
                </form>

                {/* Forgot Password */}
                <div className="text-center mt-4">
                  <button className="text-white text-sm underline hover:text-[#73FFA2] transition-colors">
                    ¿Olvidaste tu Contraseña?
                  </button>
                </div>

                {/* Social Media Icons */}
                <div className="flex justify-center mt-6">
                  <Image
                    src="/login/IconsRedes.png"
                    alt="Social Media Icons"
                    width={150}
                    height={40}
                    className="object-contain"
                  />
                </div>

                {/* Register Link */}
                <div className="text-center mt-4">
                  <span className="text-white text-sm">
                    ¿No tienes una cuenta?{" "}
                    <button
                      onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
                      className="text-[#73FFA2] underline hover:text-[#66DEDB] transition-colors"
                      data-testid="register-button"
                    >
                      Regístrate
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

export default LoginWithContext
