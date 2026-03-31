/**
 * Edad en años cumplidos (alineado con backend: menor estricto hasta el día del cumpleaños 18).
 */
export function getAgeInYearsFromParts(
  year: number,
  month: number,
  day: number
): number {
  const birth = new Date(year, month - 1, day)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const md = today.getMonth() - birth.getMonth()
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

export function isAdultFromBirthParts(
  year: number | null,
  month: number | null,
  day: number | null
): boolean {
  if (year == null || month == null || day == null) return false
  return getAgeInYearsFromParts(year, month, day) >= 18
}
