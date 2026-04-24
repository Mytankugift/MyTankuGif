/**
 * Mini modal: confirmación de edad (+18) tras indicar fecha.
 */

'use client'

interface OnboardingAdultConfirmMiniModalProps {
  open: boolean
  onConfirm: () => void
  onCorrectDate: () => void
  /** Por encima del modal de ajustes u otros overlays (por defecto 60, como en onboarding) */
  overlayZIndex?: number
}

export function OnboardingAdultConfirmMiniModal({
  open,
  onConfirm,
  onCorrectDate,
  overlayZIndex = 60,
}: OnboardingAdultConfirmMiniModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
      style={{ zIndex: overlayZIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="adult-confirm-title"
      onClick={onCorrectDate}
    >
      <div
        className="w-full max-w-[min(92vw,340px)] rounded-2xl border border-[#73FFA2]/50 bg-[#1a1a1a] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="adult-confirm-title"
          className="text-base font-semibold tracking-tight mb-3 text-center"
          style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
        >
          Confirmación de edad
        </h3>
        <p
          className="text-sm leading-relaxed mb-6 text-center text-gray-300"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Verifica que tu fecha de nacimiento es correcta
          <br />
          y que eres mayor de 18 años.
        </p>

        <button
          type="button"
          onClick={onConfirm}
          className="w-full py-3 rounded-full text-sm font-semibold transition-colors hover:opacity-95 active:scale-[0.99]"
          style={{
            backgroundColor: '#73FFA2',
            color: '#1a1a1a',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          Confirmar y continuar
        </button>

        <button
          type="button"
          onClick={onCorrectDate}
          className="w-full mt-4 text-sm text-center text-gray-400 hover:text-[#66DEDB] underline underline-offset-4 transition-colors bg-transparent border-0 cursor-pointer"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Corregir fecha
        </button>
      </div>
    </div>
  )
}
