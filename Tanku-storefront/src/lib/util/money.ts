import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  // Asegurar que amount sea un número
  const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0
  
  if (!currency_code || isEmpty(currency_code)) {
    return numAmount.toString()
  }

  // Para COP (Peso Colombiano), formatear con separadores de miles (puntos) y símbolo $
  // Comparación case-insensitive para mayor robustez
  const normalizedCurrency = String(currency_code).toUpperCase().trim()
  if (normalizedCurrency === 'COP') {
    const formattedAmount = numAmount.toLocaleString('es-CO', {
      minimumFractionDigits: minimumFractionDigits ?? 0,
      maximumFractionDigits: maximumFractionDigits ?? 0,
    })
    return `$${formattedAmount}`
  }

  // Para otras monedas, usar el formato estándar
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: minimumFractionDigits ?? 0,
    maximumFractionDigits: maximumFractionDigits ?? 0,
  }).format(numAmount)
}
