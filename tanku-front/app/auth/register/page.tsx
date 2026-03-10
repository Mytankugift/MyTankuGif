'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/stores/auth-store'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register, isAuthenticated, isLoading } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/feed'
      router.push(redirect)
    }
  }, [isAuthenticated, router, searchParams])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    // Validar longitud mínima de contraseña
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    
    try {
      await register({ email, password, firstName, lastName })
      const redirect = searchParams.get('redirect') || '/feed'
      router.push(redirect)
    } catch (err: any) {
      setError(err.message || 'Error al registrarse')
    }
  }

  const handleGoogleLogin = () => {
    const redirect = searchParams.get('redirect')
    const returnUrl = redirect 
      ? encodeURIComponent(redirect)
      : encodeURIComponent('/feed')
    
    // Redirección directa en la misma ventana
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/v1/auth/google?return_url=${returnUrl}`
  }

  if (isAuthenticated) {
    return null // Ya se está redirigiendo
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Sección izquierda - Register Form */}
      <div 
        className="flex-1 lg:flex-[0.4] flex items-center justify-center p-8 overflow-y-auto"
        style={{ backgroundColor: '#B8E6D9' }}
      >
        <div className="w-full max-w-md py-4">
          <motion.div 
            key="register-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="bg-white rounded-2xl shadow-2xl p-6"
          >
            {/* Logo TANKU */}
            <div className="flex flex-col items-center mb-6">
              <Image
                src="/feed/logo-tanku.svg"
                alt="TANKU"
                width={100}
                height={100}
                className="object-contain mb-3"
                unoptimized
              />
              <h1 
                className="text-2xl font-bold text-center"
                style={{ 
                  color: '#1A485C',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                Crear Cuenta
              </h1>
            </div>

            {/* Formulario */}
            <form onSubmit={handleRegister} className="space-y-3">
              {/* Nombre y Apellido en fila */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nombre"
                  required
                  className="w-full px-3 py-2.5 border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#73FFA2] transition-colors text-sm"
                  style={{ borderRadius: '50px', fontFamily: 'Poppins, sans-serif' }}
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Apellido"
                  required
                  className="w-full px-3 py-2.5 border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#73FFA2] transition-colors text-sm"
                  style={{ borderRadius: '50px', fontFamily: 'Poppins, sans-serif' }}
                />
              </div>

              {/* Email */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full px-3 py-2.5 border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#73FFA2] transition-colors text-sm"
                  style={{ borderRadius: '50px', fontFamily: 'Poppins, sans-serif' }}
                />
              </div>

              {/* Password y Confirm Password en fila */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#73FFA2] transition-colors pr-10 text-sm"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#73FFA2] transition-colors pr-10 text-sm"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-2 rounded-lg bg-red-100 text-red-700 text-xs">
                  {error}
                </div>
              )}

              {/* Botón Register */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-2.5 rounded-[25px] font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm border-2 border-transparent"
                  style={{ 
                    background: 'linear-gradient(135deg, #66DEDB 0%, #73FFA2 100%)',
                    color: '#000',
                    fontFamily: 'Poppins, sans-serif',
                    borderColor: 'transparent'
                  }}
                >
                  {isLoading ? 'Creando cuenta...' : 'Registrarse'}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="px-3 text-gray-500 text-xs">O continua con:</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              {/* Google Login */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-gray-300 hover:border-[#73FFA2] transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </button>
              </div>

              {/* Login */}
              <div className="text-center text-xs text-gray-600 mt-4">
                <span>¿Ya tienes una cuenta? </span>
                <Link 
                  href="/auth/login"
                  className="text-[#73FFA2] hover:text-[#66DEDB] font-semibold"
                >
                  Inicia Sesión
                </Link>
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Sección derecha - Branding (Desktop) */}
      <div 
        className="hidden lg:flex flex-[0.6] flex-col items-center justify-center p-12 relative"
        style={{ backgroundColor: '#2D3A3A' }}
      >
        <div className="text-center space-y-6">
          <h2 
            className="text-6xl font-bold"
            style={{ 
              background: 'linear-gradient(135deg, #66DEDB 0%, #73FFA2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'Poppins, sans-serif'
            }}
          >
            We're TANKU
          </h2>
          <p 
            className="text-2xl"
            style={{ 
              color: '#66DEDB',
              fontFamily: 'Poppins, sans-serif'
            }}
          >
            We Create Good Emotions ❤️
          </p>
        </div>
        
        {/* Personaje Tanku - Agrandado */}
        <div className="mt-12">
          <Image
            src="/icons_tanku/onboarding_personaje_tanku.png"
            alt="Tanku Character"
            width={350}
            height={350}
            className="object-contain"
            unoptimized
          />
        </div>
      </div>

      {/* Texto abajo en móvil */}
      <div 
        className="lg:hidden w-full py-6 px-4 text-center"
        style={{ backgroundColor: '#2D3A3A' }}
      >
        <h2 
          className="text-3xl font-bold mb-2"
          style={{ 
            background: 'linear-gradient(135deg, #66DEDB 0%, #73FFA2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: 'Poppins, sans-serif'
          }}
        >
          We're TANKU
        </h2>
        <p 
          className="text-lg"
          style={{ 
            color: '#66DEDB',
            fontFamily: 'Poppins, sans-serif'
          }}
        >
          We Create Good Emotions ❤️
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}

