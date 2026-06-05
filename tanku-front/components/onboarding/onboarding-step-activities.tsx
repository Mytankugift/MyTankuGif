/**
 * Paso 3: Selección de actividades/hobbies
 */

'use client'

import clsx from 'clsx'
import { HoneycombGrid } from './honeycomb-grid'
import { ONBOARDING_ACTIVITIES } from '@/lib/constants/onboarding'

interface OnboardingStepActivitiesProps {
  selectedActivitySlugs: string[]
  onToggleActivity: (slug: string) => void
  compact?: boolean
}

export function OnboardingStepActivities({
  selectedActivitySlugs,
  onToggleActivity,
  compact = false,
}: OnboardingStepActivitiesProps) {
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
          ¿Qué disfrutas hacer en tu tiempo libre?
        </h2>
        <p
          className={clsx('text-base', compact && 'max-md:text-sm max-md:leading-snug')}
          style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}
        >
          Queremos mostrarte contenido que vaya contigo.
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
        compact={compact}
      />
    </div>
  )
}

