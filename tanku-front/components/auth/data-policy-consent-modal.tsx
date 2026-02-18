'use client'

import { useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

interface DataPolicyConsentModalProps {
  isOpen: boolean
}

export function DataPolicyConsentModal({ isOpen }: DataPolicyConsentModalProps) {
  const [accepted, setAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { checkAuth } = useAuthStore()

  if (!isOpen) return null

  const handleAccept = async () => {
    if (!accepted) return

    setIsSubmitting(true)
    try {
      await apiClient.post(API_ENDPOINTS.CONSENT.SAVE, {
        consentType: 'DATA_TREATMENT',
        policyVersion: '1.0', // Debe coincidir con el backend
      })

      // Recargar datos del usuario
      await checkAuth()
    } catch (error) {
      console.error('Error guardando consentimiento:', error)
      // Mostrar error pero no permitir cerrar el modal
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      style={{ pointerEvents: 'all' }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        // Bloquear ESC y otras teclas
        if (e.key === 'Escape' || e.key === 'F12') {
          e.preventDefault()
        }
      }}
    >
      <div 
        className="bg-[#1E1E1E] border-2 border-[#73FFA2] rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 
          className="text-2xl font-semibold text-[#73FFA2] mb-4"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Tratamiento de Datos Personales
        </h2>
        
        <div 
          className="text-gray-300 text-sm mb-6 space-y-3 max-h-[400px] overflow-y-auto"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          <p>
            Para continuar utilizando Tanku, necesitamos tu consentimiento expreso para el tratamiento de tus datos personales.
          </p>
          
          <p className="font-semibold text-[#66DEDB]">
            ¿Qué datos recopilamos?
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Información de tu cuenta (nombre, email, foto de perfil)</li>
            <li>Datos de navegación y uso de la plataforma</li>
            <li>Información de compras y transacciones</li>
            <li>Contenido que publiques en la plataforma</li>
          </ul>

          <p className="font-semibold text-[#66DEDB]">
            ¿Para qué los utilizamos?
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Proporcionar y mejorar nuestros servicios</li>
            <li>Gestionar tu cuenta y perfil</li>
            <li>Procesar tus compras y pedidos</li>
            <li>Enviar comunicaciones relacionadas con el servicio</li>
            <li>Personalizar tu experiencia en la plataforma</li>
          </ul>

          <p className="text-xs text-gray-400 mt-4">
            Puedes consultar nuestra política completa de privacidad y términos y condiciones en cualquier momento.
          </p>
        </div>

        <div className="flex items-start gap-3 mb-6">
          <input
            type="checkbox"
            id="accept-data-policy"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-2 border-[#73FFA2] bg-transparent checked:bg-[#73FFA2] focus:ring-2 focus:ring-[#73FFA2] focus:ring-offset-2 focus:ring-offset-[#1E1E1E] cursor-pointer flex-shrink-0"
          />
          <label
            htmlFor="accept-data-policy"
            className="text-sm text-gray-300 cursor-pointer flex-1"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Acepto el tratamiento de mis datos personales según la{' '}
            <Link 
              href="/terms" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#73FFA2] hover:text-[#66DEDB] underline"
              onClick={(e) => {
                e.stopPropagation()
                // Forzar apertura en nueva pestaña
                window.open('/terms', '_blank', 'noopener,noreferrer')
                e.preventDefault()
              }}
            >
              política de privacidad
            </Link>
            {' '}de Tanku (Versión 1.0)
          </label>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleAccept}
            disabled={!accepted || isSubmitting}
            className="font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-6"
            style={{
              height: '40px',
              backgroundColor: accepted && !isSubmitting ? '#73FFA2' : '#4A4A4A',
              color: accepted && !isSubmitting ? '#262626' : '#666',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            {isSubmitting ? 'Guardando...' : 'Aceptar y Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}

