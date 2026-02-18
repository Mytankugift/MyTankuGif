/**
 * Paso 1: Selector de fecha de nacimiento (año, mes y día)
 */

'use client'

import { MONTHS, DAYS } from '@/lib/constants/onboarding'

// Estilos para el desplegable redondeado
const selectStyles = `
  select[style*="borderRadius"] {
    border-radius: 25px !important;
  }
  select[style*="borderRadius"] option {
    background-color: #4A4A4A !important;
    color: #ffffff !important;
    padding: 8px !important;
  }
  select[style*="borderRadius"] option:hover,
  select[style*="borderRadius"] option:focus,
  select[style*="borderRadius"] option:checked,
  select[style*="borderRadius"] option:active {
    background-color: #73FFA2 !important;
    color: #262626 !important;
  }
  select[style*="borderRadius"]:focus {
    background-color: rgba(217, 217, 217, 0.2) !important;
    outline: none !important;
  }
  /* Estilos para el dropdown nativo */
  select[style*="borderRadius"]::-ms-expand {
    display: none;
  }
`

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
    <>
      <style>{selectStyles}</style>
      <div className="space-y-6">
        <div className="pt-4">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
            ¿Cuándo es tu cumpleaños?
          </h2>
          <p className="text-base" style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}>
            Queremos celebrarlo contigo y sorprenderte en tu día especial.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-8">
        {/* Selector de Año */}
        <div className="w-full sm:w-32">
          <label className="block text-sm font-medium mb-1 text-center" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
            Año
          </label>
          <select
            value={year || ''}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="w-full px-4 py-3 text-white focus:outline-none text-center text-sm"
            style={{
              backgroundColor: 'rgba(217, 217, 217, 0.2)',
              borderRadius: '25px',
              border: '1px solid #4A4A4A',
              fontFamily: 'Poppins, sans-serif',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
            }}
          >
            <option value="" style={{ backgroundColor: '#4A4A4A', color: '#ffffff' }}></option>
            {years.map((y) => (
              <option key={y} value={y} style={{ backgroundColor: '#4A4A4A', color: '#ffffff' }}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Mes */}
        <div className="w-full sm:w-40">
          <label className="block text-sm font-medium mb-1 text-center" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
            Mes
          </label>
          <select
            value={month || ''}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            disabled={!year}
            className="w-full px-4 py-3 text-white focus:outline-none text-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'rgba(217, 217, 217, 0.2)',
              borderRadius: '25px',
              border: '1px solid #4A4A4A',
              fontFamily: 'Poppins, sans-serif',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
            }}
          >
            <option value="" style={{ backgroundColor: '#4A4A4A', color: '#ffffff' }}></option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value} style={{ backgroundColor: '#4A4A4A', color: '#ffffff' }}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Día */}
        <div className="w-full sm:w-32">
          <label className="block text-sm font-medium mb-1 text-center" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
            Día
          </label>
          <select
            value={day || ''}
            onChange={(e) => onDayChange(Number(e.target.value))}
            disabled={!month || !year}
            className="w-full px-4 py-3 text-white focus:outline-none text-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'rgba(217, 217, 217, 0.2)',
              borderRadius: '25px',
              border: '1px solid #4A4A4A',
              fontFamily: 'Poppins, sans-serif',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
            }}
          >
            <option value="" style={{ backgroundColor: '#4A4A4A', color: '#ffffff' }}></option>
            {validDays.map((d) => (
              <option key={d} value={d} style={{ backgroundColor: '#4A4A4A', color: '#ffffff' }}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

        {/* Logo */}
        <div className="flex justify-center pt-6">
          <img
            src="/icons_tanku/onboarding_logo_tanku.png"
            alt="Logo Tanku"
            className="w-32 h-32 object-contain"
          />
        </div>
      </div>
    </>
  )
}

