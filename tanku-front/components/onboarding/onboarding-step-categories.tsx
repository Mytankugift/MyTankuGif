/**
 * Paso 2: Selección de categorías de interés
 */

'use client'

import clsx from 'clsx'
import { HoneycombGrid } from './honeycomb-grid'
import { ONBOARDING_CATEGORIES } from '@/lib/constants/onboarding'

interface OnboardingStepCategoriesProps {
  selectedCategorySlugs: string[]
  onToggleCategory: (slug: string) => void
  /** Flujo “Modificar preferencias”: menos altura mínima y tipografía más compacta en móvil */
  compact?: boolean
}

export function OnboardingStepCategories({
  selectedCategorySlugs,
  onToggleCategory,
  compact = false,
}: OnboardingStepCategoriesProps) {
  return (
    <div
      className={clsx('space-y-4', compact && 'max-md:space-y-2 max-md:min-h-0')}
      style={compact ? undefined : { minHeight: '450px' }}
    >
      <div className={clsx('pt-4', compact && 'max-md:pt-1')}>
        <h2
          className={clsx(
            'text-xl font-semibold mb-4',
            compact && 'max-md:text-lg max-md:mb-2'
          )}
          style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
        >
          ¿Cuáles son tus gustos?
        </h2>
        <p
          className={clsx('text-base', compact && 'max-md:text-sm max-md:leading-snug')}
          style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}
        >
          Queremos conocer tus gustos para conectarte con tus productos favoritos.
        </p>
      </div>

      <HoneycombGrid
        items={ONBOARDING_CATEGORIES.map((cat) => ({
          slug: cat.slug,
          label: cat.label,
        }))}
        selectedSlugs={selectedCategorySlugs}
        onToggle={onToggleCategory}
        minSelection={1}
        showEmoji={false}
        compact={compact}
      />
    </div>
  )
}

