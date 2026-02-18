'use client'

import { useState } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isValidConfirmation =
    confirmationText.toUpperCase() === 'ELIMINAR' ||
    confirmationText.toUpperCase() === 'ELIMINAR CUENTA'

  const handleDelete = async () => {
    if (!isValidConfirmation) return

    setIsDeleting(true)
    setError(null)

    try {
      await onConfirm()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la cuenta')
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (isDeleting) return
    setConfirmationText('')
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border-2 border-red-500/50 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold text-white">Eliminar Cuenta</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Warning */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm font-medium mb-2">
            ⚠️ Esta acción es permanente e irreversible
          </p>
          <p className="text-gray-300 text-sm">
            Una vez eliminada tu cuenta, no podrás recuperarla.
          </p>
        </div>

        {/* What will be deleted */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white mb-2">
            Se eliminará permanentemente:
          </h3>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Tu perfil y toda tu información personal</li>
            <li>Tus posts, posters y stories</li>
            <li>Tus wishlists y productos guardados</li>
            <li>Tus grupos de Red Tanku</li>
            <li>Tus imágenes y archivos en S3</li>
            <li>Tu historial de actividad</li>
          </ul>
        </div>

        {/* What will be kept */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white mb-2">
            Se mantendrá (anonimizado):
          </h3>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Órdenes (para razones legales y financieras)</li>
            <li>Conversaciones (para otros participantes)</li>
            <li>StalkerGifts enviados/recibidos (para otros participantes)</li>
          </ul>
        </div>

        {/* Confirmation input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-white mb-2">
            Para confirmar, escribe <span className="text-red-400">ELIMINAR</span> o{' '}
            <span className="text-red-400">ELIMINAR CUENTA</span>:
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            disabled={isDeleting}
            placeholder="Escribe aquí..."
            className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 disabled:opacity-50"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={!isValidConfirmation || isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Eliminando...
              </span>
            ) : (
              'Eliminar Cuenta'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

