"use client"

import { useRouter } from 'next/navigation'
import { useProfileNavigation } from '@lib/context/profile-navigation-context'

export function useNavigateToOrders() {
  const router = useRouter()
  const { navigateToTab } = useProfileNavigation()

  const navigateToOrders = () => {
    // Primero establecer la pestaña activa
    navigateToTab('MIS COMPRAS')
    // Luego navegar al perfil
    router.push('/profile')
  }

  return { navigateToOrders }
}