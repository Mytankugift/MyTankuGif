import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tanku Admin - Dashboard Dropi',
  description: 'Panel de administración para procesos Dropi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

