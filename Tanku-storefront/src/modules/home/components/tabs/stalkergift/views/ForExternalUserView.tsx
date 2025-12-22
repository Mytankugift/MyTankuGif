"use client"

import Image from "next/image"
import { 
  useStalkerGift, 
  getContactMethodLabel, 
  getContactMethodIcon, 
  getContactMethodPlaceholder,
  ContactMethod
} from "../../../../../../lib/context"

interface ForExternalUserViewProps {
  onBack: () => void
  onSubmit: () => Promise<void>
}

export default function ForExternalUserView({ onBack, onSubmit }: ForExternalUserViewProps) {
  const { 
    stalkerGiftData, 
    isFormValid, 
    setAlias, 
    setRecipientName, 
    updateContactMethod: handleContactMethodChange, 
    setMessage,
    validateForm,
    getFilledContactMethods
  } = useStalkerGift()

  const filledMethods = getFilledContactMethods()

  const handleSubmit = async () => {
    if (validateForm()) {
      await onSubmit()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-[#66DEDB] hover:text-[#5FE085] transition-colors duration-300"
        >
          <span className="mr-2">←</span> Volver a opciones
        </button>
      </div>
      
      <div className="bg-gradient-to-r from-[#66DEDB]/10 to-[#5FE085]/10 border border-[#66DEDB]/30 rounded-2xl p-6 mb-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] rounded-full flex items-center justify-center">
            <Image
              src="/stalker/StallkerGift.png"
              alt="Stalker Gift"
              width={64}
              height={64}
              className="w-10 h-10 object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-[#66DEDB] mb-2">Regalo Para Usuario Externo</h2>
          <p className="text-gray-300">
            Invita a alguien nuevo a descubrir Tanku con un regalo sorpresa
          </p>
        </div>

        {/* Formulario */}
        <div className="space-y-6">
          {/* Sección 1: Tu Alias (Modo Incógnito) */}
          <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
            <h3 className="text-lg font-semibold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">🎭</span> Tu Alias (Modo Incógnito)
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Elige un alias para mantener tu identidad en secreto
            </p>
            <input
              type="text"
              value={stalkerGiftData.alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej: Admirador Secreto, Amigo Anónimo..."
              className="w-full bg-[#262626] border border-[#66DEDB]/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#66DEDB] focus:outline-none transition-colors"
            />
          </div>

          {/* Sección 2: Datos de la Persona */}
          <div className="bg-[#262626]/30 rounded-xl p-6 border border-[#66DEDB]/20">
            <h3 className="text-lg font-semibold text-[#66DEDB] mb-4 flex items-center">
              <span className="mr-2">👤</span> Datos de la Persona
            </h3>
            
            {/* Nombre */}
            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={stalkerGiftData.recipient.name}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nombre de la persona"
                className="w-full bg-[#262626] border border-[#66DEDB]/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#66DEDB] focus:outline-none transition-colors"
              />
            </div>

            {/* Métodos de Contacto */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Métodos de Contacto * 
                <span className="text-[#5FE085] text-xs ml-2">
                  (Mínimo 1 requerido)
                </span>
              </label>
              <div className="bg-[#66DEDB]/10 border border-[#66DEDB]/20 rounded-lg p-3 mb-4">
                <p className="text-[#5FE085] text-xs font-medium flex items-center">
                  <span className="mr-2">💡</span>
                  Entre más datos de contacto proporciones, mayor será la posibilidad de que la persona reciba tu regalo
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {stalkerGiftData.recipient.contactMethods.map((method) => (
                  <div key={method.type} className="space-y-2">
                    <label className="flex items-center text-gray-300 text-sm font-medium mb-2">
                      <span className="mr-2">{getContactMethodIcon(method.type)}</span>
                      {getContactMethodLabel(method.type)}
                    </label>
                    <input
                      type="text"
                      value={method.value}
                      onChange={(e) => handleContactMethodChange(method.type, e.target.value)}
                      placeholder={getContactMethodPlaceholder(method.type)}
                      className="w-full bg-[#262626] border border-[#66DEDB]/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-[#66DEDB] focus:outline-none transition-colors text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Estado del Formulario */}
          <div className="bg-[#262626]/30 rounded-xl p-4 border border-[#66DEDB]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-400">
                  Métodos completados: 
                  <span className={`ml-1 font-semibold ${filledMethods.length >= 1 ? 'text-[#5FE085]' : 'text-[#E73230]'}`}>
                    {filledMethods.length}/5 
                    <span className="text-xs ml-1">
                      ({filledMethods.length >= 1 ? 'Válido' : 'Mín. 1'})
                    </span>
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  Formulario: 
                  <span className={`ml-1 font-semibold ${isFormValid ? 'text-[#5FE085]' : 'text-[#E73230]'}`}>
                    {isFormValid ? 'Completo' : 'Incompleto'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={!isFormValid}
                className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                  isFormValid
                    ? 'bg-gradient-to-r from-[#3B9BC3] to-[#5FE085] text-white hover:scale-105 hover:shadow-lg hover:shadow-[#3B9BC3]/30'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continuar
              </button>
            </div>
          </div>

          {/* Mensaje motivacional adicional */}
          {filledMethods.length > 0 && filledMethods.length < 3 && (
            <div className="bg-gradient-to-r from-[#5FE085]/10 to-[#5FE085]/10 border border-[#5FE085]/30 rounded-xl p-4 mt-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🎯</span>
                <div>
                  <p className="text-[#5FE085] font-semibold text-sm">
                    ¡Aumenta tus posibilidades de éxito!
                  </p>
                  <p className="text-gray-300 text-xs mt-1">
                    Agregando más métodos de contacto, será más fácil localizar a la persona y entregar tu regalo sorpresa
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mensaje de Confianza */}
      <div className="text-center">
        <p className="text-[#66DEDB]/80 text-sm font-medium">
          🔒 Toda la información se mantendrá privada y segura
        </p>
      </div>
    </div>
  )
}
