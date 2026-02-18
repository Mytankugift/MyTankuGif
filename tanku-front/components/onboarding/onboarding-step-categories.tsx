/**
 * Paso 2: Selección de categorías de interés
 */

'use client'

import { HoneycombGrid } from './honeycomb-grid'
import { ONBOARDING_CATEGORIES } from '@/lib/constants/onboarding'

interface OnboardingStepCategoriesProps {
  selectedCategorySlugs: string[]
  onToggleCategory: (slug: string) => void
}

export function OnboardingStepCategories({
  selectedCategorySlugs,
  onToggleCategory,
}: OnboardingStepCategoriesProps) {
  return (
    <div className="space-y-4" style={{ minHeight: '450px' }}>
      <div className="pt-4">
        <h2 className="text-xl font-semibold mb-4" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
          ¿Cuáles son tus gustos?
        </h2>
        <p className="text-base" style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}>
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
      />
    </div>
  )
}

