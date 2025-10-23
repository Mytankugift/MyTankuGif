"use client"

import { useState, useEffect } from "react"
import { InformationCircleSolid } from "@medusajs/icons"

interface StepAliasProps {
  onContinue: (alias: string, revealIdentity: boolean) => void
  onBack: () => void
  initialAlias?: string
  initialRevealIdentity?: boolean
  recipientName?: string
}

export default function StepAlias({
  onContinue,
  onBack,
  initialAlias = "",
  initialRevealIdentity = false,
  recipientName = "el destinatario",
}: StepAliasProps) {
  const [alias, setAlias] = useState(initialAlias)
  const [revealIdentity, setRevealIdentity] = useState(initialRevealIdentity)
  const [error, setError] = useState("")
  const [touched, setTouched] = useState(false)

  // Validar alias en tiempo real
  useEffect(() => {
    if (touched && alias.trim().length > 0) {
      if (alias.trim().length < 3) {
        setError("El seudónimo debe tener al menos 3 caracteres")
      } else if (alias.trim().length > 20) {
        setError("El seudónimo no puede tener más de 20 caracteres")
      } else if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(alias)) {
        setError("Solo se permiten letras, números y espacios")
      } else {
        setError("")
      }
    }
  }, [alias, touched])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)

    const trimmedAlias = alias.trim()

    if (trimmedAlias.length === 0) {
      setError("El seudónimo es obligatorio")
      return
    }

    if (trimmedAlias.length < 3) {
      setError("El seudónimo debe tener al menos 3 caracteres")
      return
    }

    if (trimmedAlias.length > 20) {
      setError("El seudónimo no puede tener más de 20 caracteres")
      return
    }

    if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(trimmedAlias)) {
      setError("Solo se permiten letras, números y espacios")
      return
    }

    setError("")
    onContinue(trimmedAlias, revealIdentity)
  }

  const handleAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlias(e.target.value)
    if (!touched) setTouched(true)
  }

  const suggestedAliases = [
    "Un admirador secreto",
    "Alguien especial",
    "Tu amigo invisible",
    "Un ángel guardián",
    "Sorpresa misteriosa",
  ]

  const handleSuggestionClick = (suggestion: string) => {
    setAlias(suggestion)
    setTouched(true)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-[#66DEDB] hover:text-[#66DEDB]/80 transition-colors mb-4 flex items-center space-x-2"
        >
          <span>←</span>
          <span>Volver</span>
        </button>

        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-r from-[#66DEDB] to-[#66DEDB]/70 rounded-full px-6 py-2 mb-4">
            <h2 className="text-2xl font-bold text-white">¿Cómo te llamarás?</h2>
          </div>
          <p className="text-gray-300">
            Elige un seudónimo para enviar tu regalo de forma anónima
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Input de seudónimo */}
        <div>
          <label htmlFor="alias" className="block text-white font-semibold mb-3">
            Tu Seudónimo
          </label>
          <input
            id="alias"
            type="text"
            value={alias}
            onChange={handleAliasChange}
            placeholder='Ej: "Un admirador secreto"'
            maxLength={20}
            className={`
              w-full bg-[#262626] border-2 rounded-xl px-4 py-4 text-white text-lg
              placeholder-gray-500 focus:outline-none transition-all
              ${
                error
                  ? "border-red-500 focus:border-red-500"
                  : "border-[#66DEDB]/30 focus:border-[#66DEDB]"
              }
            `}
          />

          {/* Contador de caracteres */}
          <div className="flex justify-between items-center mt-2">
            <div>
              {error && touched && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              {alias.length}/20 caracteres
            </p>
          </div>
        </div>

        {/* Sugerencias */}
        <div>
          <p className="text-gray-300 text-sm mb-3">
            💡 Sugerencias de seudónimos:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedAliases.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 bg-[#262626] border border-[#66DEDB]/30 rounded-full text-sm text-gray-300 hover:bg-[#66DEDB]/10 hover:border-[#66DEDB] hover:text-white transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Opción de revelar identidad */}
        <div className="bg-gradient-to-br from-[#262626] to-[#66DEDB]/5 border-2 border-[#66DEDB]/30 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 mt-1">
              <input
                id="reveal-identity"
                type="checkbox"
                checked={revealIdentity}
                onChange={(e) => setRevealIdentity(e.target.checked)}
                className="w-5 h-5 rounded border-[#66DEDB]/50 bg-[#262626] text-[#66DEDB] focus:ring-[#66DEDB] focus:ring-offset-0 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="reveal-identity"
                className="text-white font-semibold cursor-pointer block mb-2"
              >
                Permitir revelar mi identidad más tarde
              </label>
              <p className="text-gray-400 text-sm">
                Si activas esta opción, {recipientName} podrá pedirte que reveles
                tu identidad durante el chat. Tú decides si aceptas o no.
              </p>
            </div>
          </div>
        </div>

        {/* Info adicional */}
        <div className="bg-[#66DEDB]/10 border border-[#66DEDB]/30 rounded-xl p-4 flex items-start space-x-3">
          <InformationCircleSolid className="w-5 h-5 text-[#66DEDB] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[#66DEDB] text-sm">
              <strong>Recuerda:</strong> Este seudónimo se usará para firmar tu
              mensaje y para identificarte en el chat anónimo. Elige algo que te
              represente pero que no revele tu identidad.
            </p>
          </div>
        </div>

        {/* Vista previa */}
        {alias.trim().length > 0 && !error && (
          <div className="bg-gradient-to-br from-[#262626] to-[#5FE085]/10 border-2 border-[#5FE085]/30 rounded-xl p-6 animate-fadeIn">
            <p className="text-gray-400 text-sm mb-2">Vista previa:</p>
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#5FE085]/20">
              <p className="text-white italic">
                "Tu regalo ha sido enviado por: <span className="font-bold text-[#5FE085]">{alias}</span>"
              </p>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-6 py-4 bg-[#262626] border-2 border-[#66DEDB]/30 rounded-xl text-white font-semibold hover:bg-[#66DEDB]/10 hover:border-[#66DEDB] transition-all"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={alias.trim().length === 0 || !!error}
            className={`
              flex-1 px-6 py-4 rounded-xl font-bold text-white transition-all
              ${
                alias.trim().length === 0 || !!error
                  ? "bg-gray-600 cursor-not-allowed opacity-50"
                  : "bg-gradient-to-r from-[#66DEDB] to-[#5FE085] hover:shadow-lg hover:shadow-[#66DEDB]/30 hover:scale-[1.02]"
              }
            `}
          >
            Continuar
          </button>
        </div>
      </form>

      {/* Decoración */}
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">
          🎭 El misterio es parte de la magia
        </p>
      </div>
    </div>
  )
}