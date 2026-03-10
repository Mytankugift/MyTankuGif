'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { useEffect, useRef } from 'react'

interface NotificationsButtonProps {
  // ✅ Props opcionales desde feedInit para evitar llamadas duplicadas
  initialNotifications?: any[]
  initialUnreadCount?: number
}

export function NotificationsButton({ initialNotifications, initialUnreadCount }: NotificationsButtonProps = {}) {
  const { unreadCount, items, isOpen, isLoading, setIsOpen, fetchList, markAllAsRead } = useNotifications({
    initialData: initialNotifications || initialUnreadCount !== undefined
      ? {
          items: initialNotifications,
          unreadCount: initialUnreadCount,
        }
      : undefined,
  })
  const router = useRouter()
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      // No cerrar si el click es dentro del botón o del dropdown
      if (
        btnRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return
      }
      setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', onClickOutside)
    }
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isOpen, setIsOpen])

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await markAllAsRead()
    await fetchList()
  }

  const handleVerTodas = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    router.push('/notifications')
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchList()
        }}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Notificaciones"
      >
        <Image
          src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
          alt="Notificaciones"
          width={30}
          height={30}
          className="object-contain"
          style={{ width: '30px', height: '30px' }}
          unoptimized
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-gray-900 border border-[#73FFA2]/40 rounded-xl shadow-xl w-[320px] max-h-[70vh] overflow-auto custom-scrollbar"
          style={{
            top: (btnRef.current?.getBoundingClientRect().bottom || 0) + 8,
            right: Math.max(12, window.innerWidth - (btnRef.current?.getBoundingClientRect().right || 0)),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#73FFA2]">Notificaciones</h4>
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-gray-300 hover:text-white transition-colors"
            >
              Marcar todas como leídas
            </button>
          </div>
          <div className="p-2">
            {isLoading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Cargando...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">Sin notificaciones</div>
            ) : (
              <ul className="space-y-1">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`p-3 rounded-lg border ${n.isRead ? 'border-gray-800' : 'border-[#73FFA2]/30 bg-[#73FFA2]/5'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-sm text-white">{n.title}</div>
                    <div className="text-xs text-gray-400">{n.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-3 border-t border-gray-700 text-right">
            <button
              onClick={handleVerTodas}
              className="text-xs text-[#66DEDB] hover:underline transition-colors"
            >
              Ver todas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


