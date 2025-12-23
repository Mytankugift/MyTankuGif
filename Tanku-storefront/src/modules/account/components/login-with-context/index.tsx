"use client"

import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { useState, useEffect, useTransition } from "react"
import Image from "next/image"
import { usePersonalInfoActions } from "@lib/context"
import { useRouter } from "next/navigation"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const LoginWithContext = ({ setCurrentView }: Props) => {
  const [message, setMessage] = useState<string | null | undefined>(null)
  const [isPending, startTransition] = useTransition()
  
  const formAction = async (formData: FormData) => {
    setMessage(null) // Limpiar mensaje anterior
    startTransition(async () => {
      try {
        const result = await login(null, formData)
        // Si login retorna un string, es un error
        if (typeof result === 'string') {
          setMessage(result)
        } else {
          // Si no retorna nada o retorna undefined, fue exitoso
          // El redirect se maneja en el useEffect cuando message es undefined
          setMessage(undefined) // Usar undefined para indicar éxito
        }
      } catch (error: any) {
        setMessage(error?.toString() || 'Error al iniciar sesión')
      }
    })
  }
  const { onLoginSuccess } = usePersonalInfoActions()
  const router = useRouter()

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
          
          // Verificar si hay una URL guardada para redirigir después del login
          const redirectUrl = localStorage.getItem('tanku_redirect_after_login')
          
          if (redirectUrl) {
            // Limpiar la URL guardada
            localStorage.removeItem('tanku_redirect_after_login')
            // Redirigir a la URL guardada
            router.push(redirectUrl)
          } else {
            // Si no hay URL guardada, redirigir al home
            router.push('/')
          }
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
  }, [message, onLoginSuccess, router])

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
                    disabled={isPending}
                    className="w-full mt-4 py-3 bg-gradient-to-r from-transparent to-[#73FFA2] text-white font-semibold rounded-lg hover:from-[#73FFA2]/20 hover:to-[#73FFA2] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center my-4">
                  <div className="flex-1 border-t border-gray-400"></div>
                  <span className="px-3 text-white text-sm">o</span>
                  <div className="flex-1 border-t border-gray-400"></div>
                </div>

                {/* Google Login Button */}
                <button
                  type="button"
                  onClick={() => {
                    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
                    window.location.href = `${backendUrl}/auth/google`
                  }}
                  className="w-full mt-2 py-3 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center gap-2"
                  data-testid="google-login-button"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continuar con Google
                </button>

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
