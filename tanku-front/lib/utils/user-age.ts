/**
 * Coincide con la regla backend: menor **confirmado** si hay fecha de nacimiento y edad &lt; 18.
 * Sin fecha → no se considera menor confirmado en este filtro de UI.
 */
export function getAgeInYearsFromDate(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }
  return age
}

export function isConfirmedMinorFromBirthIso(iso: string | null | undefined): boolean {
  if (!iso?.trim()) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return getAgeInYearsFromDate(d) < 18
}
