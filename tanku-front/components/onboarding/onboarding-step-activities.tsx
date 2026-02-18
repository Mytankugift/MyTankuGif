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
    <div className="space-y-4" style={{ minHeight: '450px' }}>
      <div className="pt-4">
        <h2 className="text-xl font-semibold mb-4" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
          ¿Qué disfrutas hacer en tu tiempo libre?
        </h2>
        <p className="text-base" style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}>
          Queremos mostrarte contenido que vaya contigo y conectarte con personas con las que puedas compartir
        </p>
      </div>

      <HoneycombGrid
        items={ONBOARDING_ACTIVITIES.map((act) => ({
          slug: act.slug,
          label: act.label,
        }))}
        selectedSlugs={selectedActivitySlugs}
        onToggle={onToggleActivity}
        minSelection={1}
        showEmoji={false}
      />
    </div>
  )
}

