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
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-[#66DEDB]">
          🛍️ ¿Qué te gustaría ver primero?
        </h2>
        <p className="text-sm text-gray-400">Elige las categorías que más te llaman la atención.</p>
      </div>

      <HoneycombGrid
        items={ONBOARDING_CATEGORIES.map((cat) => ({
          slug: cat.slug,
          label: cat.label,
        }))}
        selectedSlugs={selectedCategorySlugs}
        onToggle={onToggleCategory}
        minSelection={1}
      />

    </div>
  )
}

