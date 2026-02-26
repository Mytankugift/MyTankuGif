'use client'

import { useEffect, useState } from 'react'

interface Notification {
  id: string
  message: string
  type: 'success' | 'info' | 'error'
  duration?: number
}

let notificationId = 0
let listeners: Array<(notifications: Notification[]) => void> = []
let notifications: Notification[] = []

const notify = (message: string, type: 'success' | 'info' | 'error' = 'info', duration = 3000) => {
  const id = `notification-${++notificationId}`
  
  // Si es una notificación de carga (sin duración), reemplazar las anteriores de carga
  if (duration === 0 && (
    message.includes('Guardando') || 
    message.includes('Actualizando') || 
    message.includes('Reordenando')
  )) {
    notifications = notifications.filter(n => 
      !(n.duration === 0 && (
        n.message.includes('Guardando') || 
        n.message.includes('Actualizando') || 
        n.message.includes('Reordenando')
      ))
    )
  }
  
  const notification: Notification = { id, message, type, duration }
  notifications = [...notifications, notification]
  listeners.forEach(listener => listener(notifications))

  if (duration > 0) {
    setTimeout(() => {
      notifications = notifications.filter(n => n.id !== id)
      listeners.forEach(listener => listener(notifications))
    }, duration)
  }
  
  return id // Retornar ID para poder cerrar manualmente si es necesario
}

// Función para cerrar una notificación específica
export const closeNotification = (id: string) => {
  notifications = notifications.filter(n => n.id !== id)
  listeners.forEach(listener => listener(notifications))
}

export const showNotification = notify

export function NotificationContainer() {
  const [currentNotifications, setCurrentNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const listener = (notifications: Notification[]) => {
      setCurrentNotifications(notifications)
    }
    listeners.push(listener)
    setCurrentNotifications(notifications)

    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])

  if (currentNotifications.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {currentNotifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  )
}

function NotificationItem({ notification }: { notification: Notification }) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!notification.duration || notification.duration <= 0) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / notification.duration!) * 100)
      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [notification.duration])

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    info: 'bg-blue-50 border-blue-200',
    error: 'bg-red-50 border-red-200',
  }[notification.type]

  const textColor = {
    success: 'text-green-800',
    info: 'text-blue-800',
    error: 'text-red-800',
  }[notification.type]

  const progressColor = {
    success: 'bg-green-500',
    info: 'bg-blue-500',
    error: 'bg-red-500',
  }[notification.type]

  return (
    <div
      className={`${bgColor} border rounded-lg shadow-lg p-3 min-w-[280px] max-w-[400px] transition-all duration-300 animate-in slide-in-from-right`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor}`}>{notification.message}</p>
        </div>
      </div>
      {notification.duration != null && notification.duration > 0 && (
        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-150 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

