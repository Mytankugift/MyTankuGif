'use client'

import { useState, useEffect, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, Cog6ToothIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import { UserIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import { PersonalInfoSection } from './personal-info-section'
import { SocialLinksSection } from './social-links-section'
import { PrivacySection } from './privacy-section'
import { AddressesSection } from './addresses-section'
import { SettingsProfileSidebar, SettingsModalLogoutButton } from './settings-profile-sidebar'
import { useProfileNavigation } from '@/lib/context/profile-navigation-context'
import { clsx } from 'clsx'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
  /** Al abrir (p. ej. vuelta desde términos con ?settings=privacy) */
  initialTab?: SettingsModalTab | null
}

export type SettingsModalTab = 'PERFIL' | 'PRIVACIDAD' | 'DIRECCIONES'
type Tab = SettingsModalTab

const tabMeta: { key: Tab; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { key: 'PERFIL', label: 'Perfil', Icon: UserIcon },
  { key: 'PRIVACIDAD', label: 'Privacidad', Icon: ShieldCheckIcon },
  { key: 'DIRECCIONES', label: 'Mis direcciones', Icon: MapPinIcon },
]

/** Panel centrado. Móvil: un solo scroll (foto + completa perfil + formularios + cerrar sesión en Perfil). md+: columna fija + scroll a la derecha. */
export function SettingsModal({ isOpen, onClose, onUpdate, initialTab }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('PERFIL')
  const { setActiveTab: setProfilePageTab } = useProfileNavigation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div
      className={clsx(
        'pointer-events-none flex',
        /* Móvil: como chat en /messages — encima del BaseNav, sin tapar el bottom nav */
        'max-md:fixed max-md:left-0 max-md:right-0 max-md:top-0 max-md:z-[60]',
        'max-md:bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
        'max-md:flex-col max-md:items-stretch max-md:justify-stretch max-md:p-0',
        'max-md:pt-[env(safe-area-inset-top,0px)]',
        /* Escritorio: overlay modal centrado */
        'md:fixed md:inset-0 md:z-[2000000] md:items-center md:justify-center md:p-6',
      )}
      role="presentation"
    >
      {/* Clic en el aire: cerrar; solo el panel recibe clics (en móvil a pantalla completa casi no hay «aire») */}
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-0 cursor-default md:bg-black/60"
        onClick={onClose}
        aria-label="Cerrar configuración"
      />

      <div
        className={clsx(
          'pointer-events-auto relative z-10 flex w-full min-h-0 max-w-4xl flex-1 flex-col overflow-hidden',
          'border border-[#73FFA2]/50 bg-[#121212]',
          'min-h-[16rem]',
          /* Móvil: ocupa todo el hueco bajo safe areas y sobre el nav inferior */
          'max-md:max-h-none max-md:min-h-0 max-md:flex-1 max-md:rounded-none max-md:border-x-0 max-md:border-t-0 max-md:shadow-none',
          /* Escritorio: tarjeta modal */
          'md:rounded-[25px] md:shadow-2xl md:h-[min(44rem,min(92dvh,90vh))] md:min-h-[20rem] md:flex-none',
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header: móvil = volver (cierra modal, vuelve al perfil); escritorio = X */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 px-2 sm:h-12 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#D7D7D7] transition-colors hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Volver al perfil"
            >
              <ChevronLeftIcon className="h-6 w-6 shrink-0" />
            </button>
            <Cog6ToothIcon className="hidden h-5 w-5 shrink-0 text-[#73FFA2] md:block" aria-hidden />
            <h2 id="settings-modal-title" className="truncate text-sm font-bold text-[#73FFA2] md:text-base">
              Configuración
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hidden shrink-0 rounded-[25px] p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white md:inline-flex"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="h-11 shrink-0 px-2 pt-1.5 sm:h-12 sm:px-3 sm:pt-2">
          <div className="flex h-9 min-h-0 max-h-9 w-full items-stretch gap-0.5 overflow-x-auto rounded-[25px] border border-[#73FFA2]/50 bg-[#0d0d0d] p-0.5 scrollbar-hide sm:max-h-10">
            {tabMeta.map(({ key, label, Icon }) => {
              const isActive = activeTab === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={clsx(
                    'flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[25px] px-1.5 py-1 text-[10px] font-medium transition sm:gap-1.5 sm:px-2 sm:text-xs',
                    isActive
                      ? 'bg-[#73FFA2]/15 text-[#73FFA2]'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 pt-0 sm:px-3 sm:pb-3">
          <div
            className={clsx(
              'flex min-h-0 flex-1 flex-col gap-2',
              // Móvil: scroll a nivel de esta caja (foto, completa perfil, formularios y cerrar sesión van en la misma correa)
              'max-md:overflow-y-auto max-md:overflow-x-hidden max-md:pr-0.5 max-md:variant-selector-scrollbar',
              'md:flex-row md:items-stretch md:gap-3 md:overflow-hidden',
            )}
          >
            {activeTab === 'PERFIL' && (
              <SettingsProfileSidebar
                onViewMisTankus={() => {
                  setProfilePageTab('MIS TANKUS')
                  onClose()
                }}
              />
            )}

            <div
              className={clsx(
                'flex min-w-0 flex-1 flex-col',
                'max-md:flex-none',
                'md:min-h-0 md:overflow-y-auto md:overflow-x-hidden md:pr-0.5 md:variant-selector-scrollbar',
              )}
            >
              {activeTab === 'PERFIL' && (
                <div className="space-y-3 sm:space-y-4">
                  <PersonalInfoSection onUpdate={onUpdate} design="settings" />
                  <SocialLinksSection onUpdate={onUpdate} design="settings" />
                  <div className="md:hidden">
                    <SettingsModalLogoutButton />
                  </div>
                </div>
              )}

              {activeTab === 'PRIVACIDAD' && <PrivacySection onUpdate={onUpdate} design="settings" />}

              {activeTab === 'DIRECCIONES' && <AddressesSection onUpdate={onUpdate} design="settings" />}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
