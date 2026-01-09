// Forzar renderizado dinámico para evitar prerenderizado
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function CheckoutSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

