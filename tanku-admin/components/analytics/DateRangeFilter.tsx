'use client'

import type { Granularity } from '@/lib/types/analytics'

export type RangePreset = '7d' | '30d' | '90d' | 'year' | 'custom'

export interface RangeState {
  preset: RangePreset
  from: string
  to: string
  granularity: Granularity
}

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: '90d', label: '90 días' },
  { id: 'year', label: '1 año' },
  { id: 'custom', label: 'Personalizado' },
]

const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
]

/** Devuelve from/to (ISO date) para un preset relativo a hoy. */
export function presetToRange(preset: Exclude<RangePreset, 'custom'>): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  switch (preset) {
    case '7d':
      from.setDate(from.getDate() - 7)
      break
    case '30d':
      from.setDate(from.getDate() - 30)
      break
    case '90d':
      from.setDate(from.getDate() - 90)
      break
    case 'year':
      from.setFullYear(from.getFullYear() - 1)
      break
  }
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

interface DateRangeFilterProps {
  value: RangeState
  onChange: (next: RangeState) => void
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const selectPreset = (preset: RangePreset) => {
    if (preset === 'custom') {
      onChange({ ...value, preset })
      return
    }
    const { from, to } = presetToRange(preset)
    onChange({ ...value, preset, from, to })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPreset(p.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              value.preset === p.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {value.preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.from}
            max={value.to}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={value.to}
            min={value.from}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
          />
        </div>
      )}

      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 ml-auto">
        {GRANULARITIES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onChange({ ...value, granularity: g.id })}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              value.granularity === g.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  )
}
