'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { PersonalInfoSection } from './personal-info-section'
import { SocialLinksSection } from './social-links-section'
import { PrivacySection } from './privacy-section'
import { OnboardingSection } from './onboarding-section'
import { AddressesSection } from './addresses-section'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

type Tab = 'PERFIL' | 'PRIVACIDAD' | 'PREFERENCIAS' | 'DIRECCIONES'

export function SettingsModal({ isOpen, onClose, onUpdate }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('PERFIL')

  if (!isOpen) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'PERFIL', label: 'PERFIL' },
    { key: 'PRIVACIDAD', label: 'PRIVACIDAD' },
    { key: 'PREFERENCIAS', label: 'PREFERENCIAS' },
    { key: 'DIRECCIONES', label: 'MIS DIRECCIONES' }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Modal */}
      <div className="relative w-full max-w-4xl h-[85vh] bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-700 bg-gray-900">
          <h2 className="text-xl font-bold text-[#73FFA2]">Configuración</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex items-center gap-1 px-6 pt-4 border-b border-gray-700 overflow-x-auto scrollbar-hide bg-gray-900">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content - Tamaño fijo con scroll */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-900">
          {activeTab === 'PERFIL' && (
            <div className="space-y-6">
              <PersonalInfoSection onUpdate={onUpdate} />
              <SocialLinksSection onUpdate={onUpdate} />
            </div>
          )}

          {activeTab === 'PRIVACIDAD' && (
            <PrivacySection onUpdate={onUpdate} />
          )}

          {activeTab === 'PREFERENCIAS' && (
            <OnboardingSection onUpdate={onUpdate} />
          )}

          {activeTab === 'DIRECCIONES' && (
            <AddressesSection onUpdate={onUpdate} />
          )}
        </div>
      </div>

      {/* Overlay para cerrar al hacer clic fuera */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  )
}

