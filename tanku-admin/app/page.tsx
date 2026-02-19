'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAdminAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    } else {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )
}
