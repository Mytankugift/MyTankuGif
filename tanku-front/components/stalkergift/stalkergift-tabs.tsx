'use client'

import { clsx } from 'clsx'
import { GiftIcon } from '@heroicons/react/24/solid'

export type StalkerGiftMainTab = 'received' | 'sent' | 'chats' | 'orders'

interface StalkerGiftTabsProps {
  activeTab: StalkerGiftMainTab
  onTabChange: (tab: StalkerGiftMainTab) => void
  onSendTanku?: () => void
}

export function StalkerGiftTabs({ activeTab, onTabChange, onSendTanku }: StalkerGiftTabsProps) {
  const tabs: { id: StalkerGiftMainTab; label: string; icon: string }[] = [
    { id: 'chats', label: 'Chats', icon: '💬' },
    { id: 'received', label: 'Recibidos', icon: '📥' },
    { id: 'sent', label: 'Enviados', icon: '📤' },
    { id: 'orders', label: 'Órdenes', icon: '📦' },
  ]

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto border-b border-white/[0.08] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'relative shrink-0 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors sm:px-4',
              activeTab === tab.id
                ? 'border-b-2 border-[#73FFA2] text-[#73FFA2]'
                : 'border-b-2 border-transparent text-[#66DEDB] hover:text-[#73FFA2]',
            )}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      {onSendTanku ? (
        <button
          type="button"
          onClick={onSendTanku}
          className="flex shrink-0 items-center justify-center gap-2 self-stretch rounded-xl border border-[#1a3d2e] bg-[#73FFA2] px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-[#66DEDB] sm:self-center"
        >
          <GiftIcon className="h-5 w-5 shrink-0 text-gray-900" aria-hidden />
          Enviar Tanku
        </button>
      ) : null}
    </div>
  )
}

