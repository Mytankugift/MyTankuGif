'use client'

import { clsx } from 'clsx'
import {
  COLOMBIA_PHONE_PREFIX,
  clampNationalPhoneInput,
  nationalDigitsFromStored,
  normalizeColombiaPhone,
} from '@/lib/utils/colombia-phone'

interface ColombiaPhoneInputProps {
  value: string
  onChange: (normalizedOrEmpty: string) => void
  disabled?: boolean
  id?: string
  className?: string
  inputClassName?: string
  'aria-labelledby'?: string
}

export function ColombiaPhoneInput({
  value,
  onChange,
  disabled,
  id,
  className,
  inputClassName,
  'aria-labelledby': ariaLabelledBy,
}: ColombiaPhoneInputProps) {
  const national = nationalDigitsFromStored(value)

  const handleChange = (raw: string) => {
    const clamped = clampNationalPhoneInput(raw)
    if (!clamped) {
      onChange('')
      return
    }
    const normalized = normalizeColombiaPhone(clamped)
    // Mientras escribe (incompleto), guardar borrador +57… para no borrar el input
    onChange(normalized ?? `${COLOMBIA_PHONE_PREFIX}${clamped}`)
  }

  return (
    <div className={clsx('flex min-w-0 items-stretch', className)}>
      <span
        className={clsx(
          'flex shrink-0 items-center rounded-l-xl border border-r-0 border-[#414141] bg-[#0f1218] px-3 text-sm font-medium text-[#73FFA2]',
          disabled && 'opacity-50'
        )}
      >
        {COLOMBIA_PHONE_PREFIX}
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        disabled={disabled}
        aria-labelledby={ariaLabelledBy}
        value={national}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="300 123 4567"
        className={clsx(
          'min-w-0 flex-1 rounded-r-xl border border-[#414141] bg-[#1e2429] px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-[#66DEDB]/50 focus:outline-none',
          disabled && 'opacity-50',
          inputClassName
        )}
      />
    </div>
  )
}
