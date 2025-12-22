"use client"

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import { useState, useEffect } from "react"
import { login } from "@lib/data/customer"
import { useActionState } from "react"
import { usePersonalInfoActions } from "@lib/context"
import { useRouter } from "next/navigation"
import Image from "next/image"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: () => void
}

const LoginModal = ({ isOpen, onClose, onLoginSuccess }: LoginModalProps) => {
  const [message, formAction] = useActionState(login, null)
  const { onLoginSuccess: onLoginSuccessContext } = usePersonalInfoActions()
  const router = useRouter()

  useEffect(() => {
    if (message === undefined) {
      console.log('🔄 Login successful detected, refreshing personal info...')
      const refreshData = async () => {
        try {
          await onLoginSuccessContext()
          console.log('✅ Personal info refreshed after successful login')
          
          // Cerrar el modal
          onClose()
          
          // Llamar callback si existe
          if (onLoginSuccess) {
            onLoginSuccess()
          }
          
          // Refrescar la página para actualizar el checkout
          router.refresh()
        } catch (error) {
          console.error('❌ Error refreshing personal info after login:', error)
        }
      }
      
      const timer = setTimeout(refreshData, 1000)
      return () => clearTimeout(timer)
    } else if (typeof message === 'string' && message.length > 0) {
      console.log('❌ Login failed with message:', message)
    }
  }, [message, onLoginSuccessContext, onClose, onLoginSuccess, router])

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md bg-[#1E1E1E] rounded-2xl shadow-xl border border-[#66DEDB]/30 overflow-hidden">
          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <DialogTitle className="text-xl font-semibold text-[#66DEDB]">
                Iniciar sesión
              </DialogTitle>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMark className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6 text-center">
                <Image
                  src="/logoTanku.png"
                  alt="TANKU Logo"
                  width={80}
                  height={80}
                  className="mx-auto mb-4"
                />
                <p className="text-gray-300 text-sm">
                  Inicia sesión para continuar con tu compra
                </p>
              </div>

              <form action={formAction} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email o Usuario
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66DEDB] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66DEDB] focus:border-transparent transition-all"
                  />
                </div>

                {message && typeof message === 'string' && (
                  <ErrorMessage error={message} />
                )}

                <SubmitButton className="w-full bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] hover:from-[#5accc9] hover:to-[#66e68f] text-black font-semibold py-3 rounded-lg transition-all duration-300 hover:scale-105">
                  Iniciar sesión
                </SubmitButton>
              </form>

              {/* Divider */}
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-600"></div>
                <span className="px-3 text-gray-400 text-sm">o</span>
                <div className="flex-1 border-t border-gray-600"></div>
              </div>

              {/* Google Login Button */}
              <button
                type="button"
                onClick={() => {
                  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
                  // Guardar la URL actual para redirigir después del login
                  localStorage.setItem('tanku_redirect_after_login', '/checkout')
                  window.location.href = `${backendUrl}/auth/google`
                }}
                className="w-full py-3 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center gap-2"
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

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  ¿No tienes cuenta?{" "}
                  <a href="/account" className="text-[#66DEDB] hover:text-[#73FFA2] transition-colors">
                    Regístrate aquí
                  </a>
                </p>
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default LoginModal

