'use client'

import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import Link from 'next/link'
import {
  CalculatorIcon,
  ClockIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const settingsOptions = [
    {
      id: 'price-formulas',
      name: 'Fórmulas de Precio',
      description: 'Gestionar plantillas de fórmulas para calcular precios de productos',
      icon: CalculatorIcon,
      href: '/settings/price-formulas',
    },
    {
      id: 'cron',
      name: 'Cron y sincronización',
      description: 'Sync stock Dropi (programación), recordatorios de eventos y notificaciones',
      icon: ClockIcon,
      href: '/settings/cron',
    },
    {
      id: 'email-test',
      name: 'Email de prueba',
      description:
        'Correo simple SMTP y plantilla HTML de regalo con datos demo (tu cuenta / www.mytanku.com)',
      icon: EnvelopeIcon,
      href: '/settings/email-test',
    },
  ]

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 pb-10">
        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {settingsOptions.map((option) => {
            const Icon = option.icon
            return (
              <Link
                key={option.id}
                href={option.href}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {option.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {option.description}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

