/**
 * Paso 1: Selector de fecha de nacimiento (año, mes y día)
 */

'use client'

import { MONTHS, DAYS } from '@/lib/constants/onboarding'

interface OnboardingStepBirthdayProps {
  year: number | null
  month: number | null
  day: number | null
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
  onDayChange: (day: number) => void
}

export function OnboardingStepBirthday({
  year,
  month,
  day,
  onYearChange,
  onMonthChange,
  onDayChange,
}: OnboardingStepBirthdayProps) {
  // Generar años (desde 1950 hasta el año actual)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i)

  // Calcular días válidos según el mes y año seleccionados
  const getValidDays = () => {
    if (!month || !year) return DAYS

    const daysInMonth = new Date(year, month, 0).getDate()
    return DAYS.slice(0, daysInMonth)
  }

  const validDays = getValidDays()

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-[#66DEDB]">
          🎉 ¿Cuándo celebramos contigo?
        </h2>
        <p className="text-sm text-gray-400">Queremos sorprenderte en tu día especial.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        {/* Selector de Año */}
        <div className="w-full sm:w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1 text-center">
            Año
          </label>
          <select
            value={year || ''}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-[#73FFA2] focus:border-[#66DEDB] focus:outline-none text-center text-sm"
          >
            <option value="">Selecciona año</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Mes */}
        <div className="w-full sm:w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1 text-center">
            Mes
          </label>
          <select
            value={month || ''}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            disabled={!year}
            className={`
              w-full px-3 py-2 bg-gray-800 text-white rounded-lg border focus:outline-none text-center text-sm
              ${year ? 'border-[#73FFA2] focus:border-[#66DEDB]' : 'border-gray-600 opacity-50 cursor-not-allowed'}
            `}
          >
            <option value="">Selecciona mes</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Día */}
        <div className="w-full sm:w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1 text-center">
            Día
          </label>
          <select
            value={day || ''}
            onChange={(e) => onDayChange(Number(e.target.value))}
            disabled={!month || !year}
            className={`
              w-full px-3 py-2 bg-gray-800 text-white rounded-lg border focus:outline-none text-center text-sm
              ${month && year ? 'border-[#73FFA2] focus:border-[#66DEDB]' : 'border-gray-600 opacity-50 cursor-not-allowed'}
            `}
          >
            <option value="">Selecciona día</option>
            {validDays.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

    </div>
  )
}

