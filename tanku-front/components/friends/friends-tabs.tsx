/**
 * Componente de tabs para la página de amigos
 */

'use client'

interface FriendsTabsProps {
  activeTab: 'friends' | 'requests' | 'sent' | 'suggestions' | 'blocked'
  onTabChange: (tab: 'friends' | 'requests' | 'sent' | 'suggestions' | 'blocked') => void
  requestsCount?: number
}

export function FriendsTabs({ activeTab, onTabChange, requestsCount = 0 }: FriendsTabsProps) {
  const tabs = [
    { id: 'friends' as const, label: 'Amigos', icon: '👥' },
    {
      id: 'requests' as const,
      label: 'Solicitudes',
      icon: '📨',
      badge: requestsCount > 0 ? requestsCount : undefined,
    },
    { id: 'sent' as const, label: 'Enviadas', icon: '📤' },
    { id: 'suggestions' as const, label: 'Sugerencias', icon: '✨' },
    { id: 'blocked' as const, label: 'Bloqueados', icon: '🚫' },
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
          {tab.badge && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-[#73FFA2] text-gray-900 rounded-full">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

