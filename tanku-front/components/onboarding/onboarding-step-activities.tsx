/**
 * Paso 3: Selección de actividades/hobbies
 */

'use client'

import { HoneycombGrid } from './honeycomb-grid'
import { ONBOARDING_ACTIVITIES } from '@/lib/constants/onboarding'

interface OnboardingStepActivitiesProps {
  selectedActivitySlugs: string[]
  onToggleActivity: (slug: string) => void
}

export function OnboardingStepActivities({
  selectedActivitySlugs,
  onToggleActivity,
}: OnboardingStepActivitiesProps) {
  return (
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-[#66DEDB]">
          💡 ¿Qué disfrutas hacer en tu tiempo libre?
        </h2>
        <p className="text-sm text-gray-400">Queremos mostrarte contenido que vaya contigo.</p>
      </div>

      <HoneycombGrid
        items={ONBOARDING_ACTIVITIES.map((act) => ({
          slug: act.slug,
          label: act.label,
          emoji: act.emoji,
        }))}
        selectedSlugs={selectedActivitySlugs}
        onToggle={onToggleActivity}
        minSelection={1}
      />

    </div>
  )
}

