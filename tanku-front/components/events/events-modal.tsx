'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useEvents, type CalendarEvent, type Event } from '@/lib/hooks/use-events'
import { EventFormModal } from '@/components/events/event-form-modal'
import { EventDayModal } from '@/components/events/event-day-modal'
import {
  format,
  addMonths,
  startOfMonth,
  startOfDay,
  isBefore,
  isAfter,
  isSameDay,
  addDays,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { XMarkIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth-store'
import { normalizeEventColor } from '@/lib/event-colors'

interface EventsModalProps {
  isOpen: boolean
  onClose: () => void
}

function dedupeEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>()
  return events.filter((e) => {
    const k = `${e.id}_${e.date}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function EventsModal({ isOpen, onClose }: EventsModalProps) {
  const { getEventsForMonth, deleteEvent, getEventById } = useEvents()
  const { isAuthenticated } = useAuthStore()
  // Portal SSR: mismo orden de hooks en todos los renders (mounted primero)
  const [mounted, setMounted] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([])
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingEventData, setEditingEventData] = useState<Event | null>(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [formDefaultDate, setFormDefaultDate] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isOpen || !isAuthenticated) {
      if (!isOpen) setEvents([])
      return
    }

    const load = async () => {
      setIsLoading(true)
      try {
        const base = new Date()
        const months = [0, 1].map((i) => {
          const d = addMonths(startOfMonth(base), i)
          return { month: d.getMonth() + 1, year: d.getFullYear() }
        })
        const chunks = await Promise.all(
          months.map((m) => getEventsForMonth(m.month, m.year))
        )
        const merged = dedupeEvents(chunks.flat())
        const todayStart = startOfDay(new Date())
        const horizonEnd = startOfDay(addMonths(todayStart, 1))
        const upcoming = merged
          .filter((e) => {
            const d = startOfDay(new Date(e.date))
            return !isBefore(d, todayStart) && !isAfter(d, horizonEnd)
          })
          .map((e) => ({ ...e, color: normalizeEventColor(e.color) }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        setEvents(upcoming)
      } catch (e) {
        console.error('Error cargando eventos:', e)
        setEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [isOpen, isAuthenticated, getEventsForMonth])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const key = format(startOfDay(new Date(e.date)), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  const handleDaySectionClick = (dayKey: string) => {
    const dayEvents = eventsByDay.find(([k]) => k === dayKey)?.[1] ?? []
    if (dayEvents.length === 0) return
    const d = startOfDay(new Date(dayEvents[0].date))
    setSelectedDate(d)
    setSelectedEvents(dayEvents)
    setShowDayModal(true)
  }

  const handleEditEvent = async (eventId: string) => {
    const event = await getEventById(eventId)
    if (event) {
      setEditingEventData(event)
      setShowFormModal(true)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      const success = await deleteEvent(eventId)
      if (success) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId))
        setShowDayModal(false)
      }
    }
  }

  const handleEventCreated = () => {
    setShowFormModal(false)
    setEditingEventData(null)
    if (isAuthenticated && isOpen) {
      const base = new Date()
      Promise.all(
        [0, 1].map((i) => {
          const d = addMonths(startOfMonth(base), i)
          return getEventsForMonth(d.getMonth() + 1, d.getFullYear())
        })
      ).then((chunks) => {
        const merged = dedupeEvents(chunks.flat())
        const todayStart = startOfDay(new Date())
        const horizonEnd = startOfDay(addMonths(todayStart, 1))
        setEvents(
          merged
            .filter((e) => {
              const d = startOfDay(new Date(e.date))
              return !isBefore(d, todayStart) && !isAfter(d, horizonEnd)
            })
            .map((e) => ({ ...e, color: normalizeEventColor(e.color) }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        )
      })
    }
  }

  const handleEventUpdated = () => {
    handleEventCreated()
  }

  if (!isOpen || !mounted) return null

  const today = new Date()

  const modalContent = (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/80 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        <div
          className="rounded-[25px] w-full overflow-hidden flex flex-col border-2"
          style={{
            backgroundColor: '#262626',
            borderColor: '#73FFA2',
            maxWidth: '560px',
            width: '92%',
            maxHeight: 'min(720px, 88vh)',
            minHeight: '420px',
            cursor: 'default',
            userSelect: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[#4A4A4A]">
            <h2
              className="text-xl font-semibold"
              style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
            >
              Próximos eventos
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
              aria-label="Cerrar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div
            className="flex-1 flex flex-col min-h-0 px-4 pb-4 pt-3"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            <div className="flex-shrink-0 flex items-center justify-between gap-3 mb-3">
              <Link
                href="/events"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: '#66DEDB',
                  color: '#2C3137',
                  boxShadow: '0px 4px 4px 0px #00000040 inset',
                }}
              >
                <CalendarDaysIcon className="w-4 h-4" />
                Calendario
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEditingEventData(null)
                  setFormDefaultDate(null)
                  setShowFormModal(true)
                }}
                className="px-4 py-2 text-sm font-semibold transition-all duration-300 hover:scale-105 rounded-full"
                style={{
                  backgroundColor: '#73FFA2',
                  color: '#2C3137',
                  boxShadow: '0px 4px 4px 0px #00000040 inset',
                }}
              >
                + Nuevo
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-0.5">
              {!isAuthenticated ? (
                <p className="text-gray-400 text-sm text-center py-8" style={{ color: '#B7B7B7' }}>
                  Inicia sesión para ver y crear eventos.
                </p>
              ) : isLoading ? (
                <div className="text-center py-8 text-sm" style={{ color: '#B7B7B7' }}>
                  Cargando…
                </div>
              ) : eventsByDay.length === 0 ? (
                <p className="text-sm text-center py-8 px-2" style={{ color: '#B7B7B7' }}>
                  No hay eventos en el próximo mes. Crea uno o usa el calendario.
                </p>
              ) : (
                <div className="space-y-4 pb-2">
                  {eventsByDay.map(([dayKey, dayEvents]) => {
                    const d = new Date(dayKey + 'T12:00:00')
                    const isToday = isSameDay(d, today)
                    const isTomorrow = isSameDay(d, addDays(today, 1))
                    let label: string
                    if (isToday) label = 'Hoy'
                    else if (isTomorrow) label = 'Mañana'
                    else label = format(d, 'EEEE d MMMM', { locale: es })

                    return (
                      <div key={dayKey}>
                        <button
                          type="button"
                          onClick={() => handleDaySectionClick(dayKey)}
                          className="w-full text-left mb-2 pb-1 border-b border-[#4A4A4A] hover:border-[#73FFA2]/40 transition-colors"
                        >
                          <span
                            className="text-sm font-semibold capitalize"
                            style={{ color: '#73FFA2' }}
                          >
                            {label}
                          </span>
                          <span className="text-xs ml-2" style={{ color: '#B7B7B7' }}>
                            {format(d, 'yyyy')}
                          </span>
                        </button>
                        <ul className="space-y-2">
                          {dayEvents.map((event) => (
                            <li key={`${event.id}_${event.date}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDate(startOfDay(new Date(event.date)))
                                  setSelectedEvents([event])
                                  setShowDayModal(true)
                                }}
                                className="w-full text-left p-3 rounded-lg border border-l-4 transition-colors hover:border-[#73FFA2]/50"
                                style={{
                                  backgroundColor: 'rgba(217, 217, 217, 0.1)',
                                  borderColor: '#4A4A4A',
                                  borderLeftColor: normalizeEventColor(event.color),
                                }}
                              >
                                <div className="min-w-0">
                                    <p
                                      className="font-semibold text-sm truncate"
                                      style={{ color: '#FFFFFF' }}
                                    >
                                      {event.title}
                                    </p>
                                    {event.description ? (
                                      <p
                                        className="text-sm mt-1 line-clamp-2 leading-snug"
                                        style={{ color: '#B7B7B7' }}
                                      >
                                        {event.description}
                                      </p>
                                    ) : null}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EventDayModal
        isOpen={showDayModal}
        selectedDate={selectedDate}
        events={selectedEvents}
        onClose={() => setShowDayModal(false)}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
        onCreateEvent={(d) => {
          setEditingEventData(null)
          setFormDefaultDate(format(d, 'yyyy-MM-dd'))
          setShowFormModal(true)
        }}
        zIndex={100000}
      />

      {showFormModal && (
        <EventFormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false)
            setEditingEventData(null)
            setFormDefaultDate(null)
          }}
          onEventCreated={handleEventCreated}
          onEventUpdated={handleEventUpdated}
          event={editingEventData}
          defaultDate={formDefaultDate ?? undefined}
        />
      )}
    </>
  )

  return createPortal(modalContent, document.body)
}
