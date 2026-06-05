/** Texto de likes en cards y detalle de producto */
export function productHappinessLabel(likesCount: number): string {
  const count = Math.max(0, likesCount)
  if (count === 0) {
    return 'Sé la primera persona en ser feliz con este producto'
  }
  if (count === 1) {
    return '1 persona es feliz con este producto'
  }
  return `${count} personas son felices con este producto`
}
