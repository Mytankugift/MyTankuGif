'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

interface CategoryLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: () => void
}

export function CategoryLoginModal({ isOpen, onClose, onLogin }: CategoryLoginModalProps) {
  // Cerrar con ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Renderizar el modal usando un portal directamente en el body
  const modalContent = (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        overflow: 'auto',
      }}
    >
      <div
        className="bg-[#262626] border border-[#73FFA2]"
        style={{
          width: '400px',
          maxWidth: '90vw',
          height: '250px',
          padding: '24px',
          gap: '12px',
          borderRadius: '25px',
          borderWidth: '1px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          margin: 'auto',
          zIndex: 10000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Título */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '10px',
          }}
        >
          <h2
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontStyle: 'normal',
              fontSize: '24px',
              lineHeight: '32px',
              letterSpacing: '0%',
              textAlign: 'center',
              verticalAlign: 'middle',
              color: '#73FFA2',
            }}
          >
            Inicia Sesión Para Continuar
          </h2>
        </div>

        {/* Descripción */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <p
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: '13px',
              color: '#FFFFFF',
              lineHeight: '1.5',
              textAlign: 'center',
              maxWidth: '350px',
            }}
          >
            Para comprar, regalar o interactuar en TANKU necesitas una cuenta.
          </p>
        </div>

        {/* Botón Únete a Tanku */}
        <div className="flex items-center justify-center">
          <Link
            href="/auth/login"
            onClick={onLogin}
            className="text-black font-semibold px-4 py-2 rounded-full hover:shadow-lg transition-all duration-300 hover:transform hover:scale-105 inline-block text-center whitespace-nowrap"
            style={{ 
              fontFamily: 'Poppins, sans-serif', 
              fontSize: '13px',
              backgroundColor: '#73FFA2',
              boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25) inset'
            }}
          >
            Únete a TANKU
          </Link>
        </div>
      </div>
    </div>
  )

  // Usar portal para renderizar fuera del árbol DOM del navbar
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  
  return null
}

