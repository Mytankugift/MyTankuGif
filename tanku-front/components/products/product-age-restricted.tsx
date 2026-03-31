'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

const btnPrimary =
  'inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#73FFA2] text-gray-900 font-semibold text-sm hover:bg-[#60D489] transition-all shadow-lg shadow-[#73FFA2]/35 hover:shadow-xl hover:shadow-[#73FFA2]/40'

const btnOutline =
  'inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-gray-500 text-gray-100 text-sm font-medium hover:bg-gray-800/80 transition-all shadow-md shadow-black/30 hover:shadow-lg'

const btnGhost =
  'inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-gray-400 text-sm hover:text-white transition-all'

/** Solo el modal de texto y CTAs (sobre la página real o fallback). */
export function ProductAgeRestrictedModal({
  isAuthenticated,
  onClose,
}: {
  isAuthenticated: boolean
  onClose?: () => void
}) {
  return (
    <div
      className="w-full max-w-md rounded-2xl border border-[#73FFA2]/45 bg-[#1a1a1a]/95 p-6 text-center shadow-2xl shadow-black/50 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-200/90">
        Solo mayores de edad
      </p>
      <h2 className="mb-3 text-xl font-bold text-white">
        {isAuthenticated ? 'Contenido restringido (+18)' : 'Producto para mayores de 18 años'}
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-gray-400">
        {isAuthenticated ? (
          <>
            Este contenido no está disponible para tu cuenta: edad o datos de perfil incompletos.
            Completa tu fecha de nacimiento en el perfil si aún no lo has hecho.
          </>
        ) : (
          <>
            Este producto forma parte del catálogo reservado a mayores de edad. Para acceder necesitas
            una cuenta e indicar que cumples los 18 años.
          </>
        )}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        {isAuthenticated ? (
          <>
            <Link href="/profile" className={btnPrimary}>
              Ir al perfil
            </Link>
            {onClose && (
              <button type="button" onClick={onClose} className={btnGhost}>
                Cerrar
              </button>
            )}
          </>
        ) : (
          <>
            <Link href="/auth/login" className={btnPrimary}>
              Iniciar sesión
            </Link>
            <Link href="/auth/register" className={btnOutline}>
              Crear cuenta
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

function BlurredProductMock({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`pointer-events-none select-none w-full h-full flex items-center justify-center ${compact ? 'p-3' : 'p-6 md:p-10'}`}
      aria-hidden
    >
      <div
        className={`grid w-full max-w-5xl gap-6 ${compact ? 'grid-cols-1 max-h-[220px]' : 'md:grid-cols-2 md:gap-10 md:max-h-[min(42vh,360px)]'}`}
      >
        <div
          className={`rounded-2xl bg-gradient-to-br from-gray-600/90 via-gray-800/90 to-gray-900/90 w-full ${
            compact ? 'aspect-[16/10] max-h-36' : 'aspect-square max-h-[min(42vh,360px)] mx-auto md:mx-0'
          }`}
        />
        <div className={`space-y-2.5 ${compact ? 'hidden sm:block' : ''} min-w-0`}>
          <div className={`h-7 rounded-lg bg-gray-700/85 ${compact ? 'w-4/5' : 'w-3/4'}`} />
          <div className="h-5 w-1/3 rounded-lg bg-gray-700/75" />
          <div className="h-3.5 w-full rounded bg-gray-700/55" />
          <div className="h-3.5 w-5/6 rounded bg-gray-700/50" />
          <div className="h-3.5 w-2/3 rounded bg-gray-700/45" />
          <div className="mt-5 flex gap-2">
            <div className="h-11 w-24 rounded-xl bg-gray-700/65" />
            <div className="h-11 w-24 rounded-xl bg-gray-700/50" />
          </div>
        </div>
      </div>
    </div>
  )
}

type Props = {
  isAuthenticated: boolean
  onClose?: () => void
  variant?: 'page' | 'embedded'
  onBack?: () => void
}

/**
 * Fallback cuando la API no envía teaser (solo error). Pantalla fija sin scroll.
 */
export function ProductAgeRestricted({ isAuthenticated, onClose, variant = 'page', onBack }: Props) {
  const isEmbedded = variant === 'embedded'

  if (isEmbedded) {
    return (
      <div className="relative flex h-[min(420px,52vh)] max-h-[min(420px,52vh)] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-800/80 bg-gray-900/40">
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-[115%] w-[115%] -translate-x-[2%] -translate-y-[2%] opacity-[0.92] blur-[2px] sm:blur-[3px]">
              <BlurredProductMock compact />
            </div>
          </div>
          <div className="absolute inset-0 bg-gray-900/35" />
        </div>
        <div className="relative z-10 flex flex-1 min-h-0 items-center justify-center overflow-hidden p-3 sm:p-4">
          <ProductAgeRestrictedModal isAuthenticated={isAuthenticated} onClose={onClose} />
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden overscroll-none bg-gray-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-[108%] w-[108%] -translate-x-[2%] -translate-y-[2%] opacity-90 blur-[2px] sm:blur-[3px]">
            <BlurredProductMock />
          </div>
        </div>
        <div className="absolute inset-0 bg-gray-900/25" />
      </div>

      <header className="relative z-20 flex-shrink-0 border-b border-gray-800/90 bg-gray-900/88 backdrop-blur-[6px]">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button
            type="button"
            onClick={onBack ?? (() => { if (typeof window !== 'undefined') window.history.back() })}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Volver"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
        </div>
      </header>

      <div className="relative z-20 flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
        <ProductAgeRestrictedModal isAuthenticated={isAuthenticated} onClose={onClose} />
      </div>
    </div>
  )
}
