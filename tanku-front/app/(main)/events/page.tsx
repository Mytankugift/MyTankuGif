'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useEvents, type CalendarEvent } from '@/lib/hooks/use-events'
import { EventFormModal } from '@/components/events/event-form-modal'
import { EventDayModal } from '@/components/events/event-day-modal'
import { format, isSameDay, isSameMonth, addMonths, subMonths, addDays, startOfDay, isBefore, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { getCalendarGridDays } from '@/lib/events/calendar-grid'
import { EVENT_COLOR_PRESETS, normalizeEventColor } from '@/lib/event-colors'
import { useAuthStore } from '@/lib/stores/auth-store'

export default function EventsPage() {
  const { getEventsForMonth, deleteEvent, getEventById } = useEvents()
  const { isAuthenticated } = useAuthStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [colorFilter, setColorFilter] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([])
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<string | null>(null)
  const [editingEventData, setEditingEventData] = useState<any>(null)
  const [showDayModal, setShowDayModal] = useState(false)

  const loadEvents = useCallback(async () => {
    if (!isAuthenticated) {
      setEvents([])
      return
    }

    setIsRefreshing(true)
    try {
      const seen = new Set<string>()
      const merged: CalendarEvent[] = []
      for (const offset of [-1, 0, 1] as const) {
        const d = addMonths(currentDate, offset)
        const m = d.getMonth() + 1
        const y = d.getFullYear()
        const chunk = await getEventsForMonth(m, y)
        for (const e of chunk) {
          const k = `${e.id}_${e.date}`
          if (seen.has(k)) continue
          seen.add(k)
          merged.push({
            ...e,
            color: normalizeEventColor((e as CalendarEvent).color),
          })
        }
      }
      setEvents(merged)
    } catch (error) {
      console.error('Error cargando eventos:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [currentDate, getEventsForMonth, isAuthenticated])

  // Cargar eventos del mes cuando cambia la fecha o cuando se autentica
  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    const dayEvents = events.filter((e) => isSameDay(new Date(e.date), date))
    setSelectedEvents(dayEvents)
    setShowDayModal(true)
  }

  const handleCreateEvent = () => {
    setEditingEvent(null)
    setEditingEventData(null)
    setShowFormModal(true)
  }

  const handleEditEvent = async (eventId: string) => {
    const event = await getEventById(eventId)
    if (event) {
      setEditingEvent(eventId)
      setEditingEventData(event)
      setShowFormModal(true)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    const success = await deleteEvent(eventId)
    if (success) {
      loadEvents()
      setShowDayModal(false)
    }
  }

  const handleEventCreated = () => {
    loadEvents()
    setShowFormModal(false)
  }

  const handleEventUpdated = () => {
    loadEvents()
    setShowFormModal(false)
    setEditingEvent(null)
  }

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const calendarDays = getCalendarGridDays(currentDate)

  // Obtener eventos para un día específico
  const getEventsForDay = (date: Date) => {
    return events.filter((e) => isSameDay(new Date(e.date), date))
  }

  const baseUpcomingEvents = useMemo(() => {
    const todayStart = startOfDay(new Date())
    const horizonEnd = startOfDay(addMonths(todayStart, 1))
    return events
      .filter((e) => {
        const eventDate = startOfDay(new Date(e.date))
        return !isBefore(eventDate, todayStart) && !isAfter(eventDate, horizonEnd)
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [events])

  const upcomingEvents = useMemo(() => {
    if (!colorFilter) return baseUpcomingEvents
    return baseUpcomingEvents.filter(
      (e) =>
        normalizeEventColor(e.color).toLowerCase() === colorFilter.toLowerCase()
    )
  }, [baseUpcomingEvents, colorFilter])

  return (
    <div className="min-h-screen text-white p-4 md:p-8" style={{ fontFamily: 'Poppins, sans-serif', backgroundColor: '#262626' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4" style={{ color: '#73FFA2' }}>
            Eventos
          </h1>

          {/* Navegación de mes */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="px-4 py-2 font-semibold transition-all duration-300 hover:transform hover:scale-105 rounded-full"
                style={{
                  backgroundColor: '#66DEDB',
                  color: '#2C3137',
                  boxShadow: '0px 4px 4px 0px #00000040 inset'
                }}
              >
                ←
              </button>
              <h2 className="text-xl font-semibold px-4 flex items-center gap-2">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
                {isRefreshing && (
                  <span className="text-xs font-normal text-[#73FFA2] animate-pulse whitespace-nowrap">
                    Actualizando…
                  </span>
                )}
              </h2>
              <button
                onClick={goToNextMonth}
                className="px-4 py-2 font-semibold transition-all duration-300 hover:transform hover:scale-105 rounded-full"
                style={{
                  backgroundColor: '#66DEDB',
                  color: '#2C3137',
                  boxShadow: '0px 4px 4px 0px #00000040 inset'
                }}
              >
                →
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 font-semibold transition-all duration-300 hover:transform hover:scale-105 rounded-full"
                style={{
                  backgroundColor: '#73FFA2',
                  color: '#2C3137',
                  boxShadow: '0px 4px 4px 0px #00000040 inset'
                }}
              >
                Hoy
              </button>
            </div>
            <button
              onClick={handleCreateEvent}
              className="px-5 py-2 font-semibold transition-all duration-300 hover:transform hover:scale-105 flex items-center gap-2 rounded-full"
              style={{
                backgroundColor: '#73FFA2',
                color: '#2C3137',
                boxShadow: '0px 4px 4px 0px #00000040 inset'
              }}
            >
              <span className="text-xl">+</span>
              Nuevo Evento
            </button>
          </div>
        </div>

        {/* Contenido principal: Calendario y Próximos Eventos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendario */}
          <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 relative">
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const dayEvents = getEventsForDay(day)
                const isToday = isSameDay(day, new Date())
                const isCurrentMonth = isSameMonth(day, currentDate)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    className={`
                      aspect-square p-2 rounded-lg border-2 transition-all
                      ${isToday ? 'border-[#73FFA2] bg-[#73FFA2]/10' : 'border-gray-700 hover:border-gray-600'}
                      ${!isCurrentMonth ? 'opacity-40 text-gray-500' : ''}
                      ${dayEvents.length > 0 && isCurrentMonth ? 'bg-[#73FFA2]/20' : dayEvents.length > 0 ? 'bg-[#73FFA2]/10' : isCurrentMonth ? 'bg-gray-700/50' : 'bg-gray-800/40'}
                    `}
                  >
                    <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {dayEvents.slice(0, 4).map((event) => (
                          <div
                            key={`${event.id}_${event.date}`}
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 border border-white/10"
                            style={{ backgroundColor: normalizeEventColor(event.color) }}
                            title={event.title}
                          />
                        ))}
                        {dayEvents.length > 4 && (
                          <div className="text-xs text-gray-400">+{dayEvents.length - 4}</div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
              </div>
          </div>

          {/* Próximos Eventos - Lista lateral */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 sticky top-4 flex flex-col max-h-[min(520px,62vh)]">
              <h2 className="text-base font-bold mb-2 flex-shrink-0" style={{ color: '#73FFA2' }}>
                Próximos eventos
              </h2>
              <p className="text-[10px] text-gray-500 mb-2 flex-shrink-0">Próximo mes</p>
              <div className="flex flex-wrap gap-1 mb-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setColorFilter(null)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    colorFilter === null ? 'border-[#73FFA2] text-[#73FFA2]' : 'border-gray-600 text-gray-400'
                  }`}
                >
                  Todos
                </button>
                {EVENT_COLOR_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    title={p.label}
                    onClick={() =>
                      setColorFilter((f) => (f === p.hex ? null : p.hex))
                    }
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      colorFilter === p.hex ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: p.hex }}
                    aria-label={p.label}
                  />
                ))}
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-400 text-xs">
                  {colorFilter && baseUpcomingEvents.length > 0
                    ? 'Ningún evento con este color en el periodo.'
                    : 'No hay eventos en el próximo mes'}
                </p>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1 space-y-1.5">
                  {upcomingEvents.map((event) => {
                    const eventDate = new Date(event.date)
                    const isToday = isSameDay(eventDate, new Date())
                    const isTomorrow = isSameDay(eventDate, addDays(new Date(), 1))

                    return (
                      <div
                        key={`${event.id}_${event.date}`}
                        className="p-2 bg-gray-700/90 rounded-lg border border-gray-600 hover:border-[#66DEDB]/50 transition-colors cursor-pointer border-l-4"
                        style={{ borderLeftColor: normalizeEventColor(event.color) }}
                        onClick={() => {
                          setSelectedDate(eventDate)
                          setSelectedEvents([event])
                          setShowDayModal(true)
                        }}
                      >
                        <div className="flex items-start min-w-0 pl-0.5">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-xs leading-tight truncate">
                              {event.title}
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                              {isToday ? 'Hoy' : isTomorrow ? 'Mañana' : format(eventDate, 'EEE d MMM', { locale: es })}
                            </p>
                            {event.description ? (
                              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 leading-tight">
                                {event.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de eventos del día */}
        <EventDayModal
          isOpen={showDayModal}
          selectedDate={selectedDate}
          events={selectedEvents}
          onClose={() => setShowDayModal(false)}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          onCreateEvent={handleCreateEvent}
        />

        {/* Modal de formulario */}
        {showFormModal && (
          <EventFormModal
            isOpen={showFormModal}
            onClose={() => {
              setShowFormModal(false)
              setEditingEvent(null)
              setEditingEventData(null)
            }}
            onEventCreated={handleEventCreated}
            onEventUpdated={handleEventUpdated}
            event={editingEventData}
          />
        )}
      </div>
    </div>
  )
}

