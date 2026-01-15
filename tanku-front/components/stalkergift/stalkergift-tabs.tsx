'use client'

interface StalkerGiftTabsProps {
  activeTab: 'received' | 'sent' | 'chats'
  onTabChange: (tab: 'received' | 'sent' | 'chats') => void
}

export function StalkerGiftTabs({ activeTab, onTabChange }: StalkerGiftTabsProps) {
  const tabs = [
    { id: 'chats' as const, label: 'Chats', icon: '💬' },
    { id: 'received' as const, label: 'Recibidos', icon: '📥' },
    { id: 'sent' as const, label: 'Enviados', icon: '📤' },
  ]

  return (
    <div className="flex gap-2 border-b border-gray-700 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
            ${
              activeTab === tab.id
                ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
                : 'text-[#66DEDB] hover:text-[#73FFA2]'
            }
          `}
        >
          <span className="mr-2">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

