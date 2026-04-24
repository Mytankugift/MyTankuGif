import { Suspense } from 'react'
import MessagesClient from './messages-client'

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div
        className="flex h-screen items-center justify-center"
        style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66DEDB] mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando mensajes...</p>
        </div>
      </div>
    }>
      <MessagesClient />
    </Suspense>
  )
}
