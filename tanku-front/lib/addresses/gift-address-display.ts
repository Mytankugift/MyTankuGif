/**
 * Indica si una dirección debe mostrarse como "Dirección de regalos" en listados.
 * Alineado con gift.service: useMainAddressForGifts → solo la predeterminada;
 * si no, solo la que tiene isGiftAddress en BD.
 */
export function showsGiftAddressBadge(
  address: { isGiftAddress?: boolean; isDefaultShipping?: boolean },
  useMainAddressForGifts: boolean
): boolean {
  if (useMainAddressForGifts) {
    return Boolean(address.isDefaultShipping)
  }
  return Boolean(address.isGiftAddress)
}
