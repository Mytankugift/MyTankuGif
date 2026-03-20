'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useEvents, type CalendarEvent } from '@/lib/hooks/use-events'
import { EventFormModal } from '@/components/events/event-form-modal'
import { EventDayModal } from '@/components/events/event-day-modal'
import { format, isSameDay, isSameMonth, addMonths, subMonths, addDays, startOfDay, isBefore, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { getCalendarGridDays } from '@/lib/events/calendar-grid'
import { EVENT_COLOR_PRESETS, normalizeEventColor } from '@/lib/event-colors'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useEventColorPresets } from '@/lib/hooks/use-event-color-presets'
import { BaseNav } from '@/components/layout/base-nav'

export default function EventsPage() {
  const { getEventsForMonth, deleteEvent, getEventById } = useEvents()
  const { presets: savedColorPresets, loadPresets } = useEventColorPresets()
  const { isAuthenticated } = useAuthStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [colorFilter, setColorFilter] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([])
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<string | null>(null)
  const [editingEventData, setEditingEventData] = useState<any>(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [formDefaultDate, setFormDefaultDate] = useState<string | null>(null)
  const [pastDateToast, setPastDateToast] = useState<string | null>(null)
  const pastDateToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadEvents = useCallback(async () => {
    if (!isAuthenticated) {
      setEvents([])
      return
    }

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
    }
  }, [currentDate, getEventsForMonth, isAuthenticated])

  // Cargar eventos del mes cuando cambia la fecha o cuando se autentica
  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    if (isAuthenticated) loadPresets()
  }, [isAuthenticated, loadPresets])

  useEffect(() => {
    return () => {
      if (pastDateToastTimer.current) clearTimeout(pastDateToastTimer.current)
    }
  }, [])

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    const dayEvents = events.filter((e) => isSameDay(new Date(e.date), date))
    setSelectedEvents(dayEvents)
    setShowDayModal(true)
  }

  const showPastDateHint = useCallback((message: string) => {
    if (pastDateToastTimer.current) clearTimeout(pastDateToastTimer.current)
    setPastDateToast(message)
    pastDateToastTimer.current = setTimeout(() => {
      setPastDateToast(null)
      pastDateToastTimer.current = null
    }, 3800)
  }, [])

  const handleCreateEvent = (date?: Date) => {
    if (date && isBefore(startOfDay(date), startOfDay(new Date()))) {
      showPastDateHint('No puedes crear eventos en fechas que ya pasaron')
      return
    }
    setEditingEvent(null)
    setEditingEventData(null)
    setFormDefaultDate(date ? format(date, 'yyyy-MM-dd') : null)
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
    loadPresets()
    setShowFormModal(false)
  }

  const handleEventUpdated = () => {
    loadEvents()
    loadPresets()
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

  const knownPresetHexes = useMemo(() => {
    const s = new Set<string>()
    EVENT_COLOR_PRESETS.forEach((p) => s.add(p.hex.toLowerCase()))
    savedColorPresets.forEach((p) =>
      s.add(normalizeEventColor(p.hex).toLowerCase())
    )
    return s
  }, [savedColorPresets])

  const orphanColorsForFilter = useMemo(() => {
    const s = new Set<string>()
    for (const e of baseUpcomingEvents) {
      const h = normalizeEventColor(e.color).toLowerCase()
      if (!knownPresetHexes.has(h)) s.add(h)
    }
    return Array.from(s).sort()
  }, [baseUpcomingEvents, knownPresetHexes])

  /** Sin hover:scale en filas con ancho ajustado: evita overflow y mini-scrollbars al pasar el ratón */
  const navButtonBase =
    'px-4 py-2 font-semibold transition-all duration-300 rounded-full shrink-0 hover:brightness-110 active:brightness-95'
  /** Flechas móvil: tamaño fijo para que la barra de mes no se mueva al cambiar el nombre del mes */
  const monthNavArrowMobileClass =
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold transition-all duration-300 hover:brightness-110 active:brightness-95'
  const navCyan = {
    backgroundColor: '#66DEDB',
    color: '#2C3137',
    boxShadow: '0px 4px 4px 0px #00000040 inset',
  } as const
  const navGreen = {
    backgroundColor: '#73FFA2',
    color: '#2C3137',
    boxShadow: '0px 4px 4px 0px #00000040 inset',
  } as const

  /**
   * Móvil (dentro de caja fija): flex-1 + truncate. Desktop: ancho fijo 17rem.
   */
  const monthTitle = (
    <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold tabular-nums capitalize px-1 sm:text-lg lg:w-[17rem] lg:min-w-[17rem] lg:flex-none lg:shrink-0 lg:text-xl">
      {format(currentDate, 'MMMM yyyy', { locale: es })}
    </h2>
  )

  const newEventButtonDesktop = (
    <button
      type="button"
      onClick={() => handleCreateEvent()}
      className={`${navButtonBase} px-5 flex items-center justify-center gap-2`}
      style={navGreen}
    >
      <span className="text-xl leading-none">+</span>
      Nuevo Evento
    </button>
  )

  /** Móvil: mismo alto que Hoy; el ancho lo iguala la cuadrícula (grid-cols-2) */
  const newEventButtonMobile = (
    <button
      type="button"
      onClick={() => handleCreateEvent()}
      className="flex h-11 w-full min-w-0 items-center justify-center gap-1 rounded-full px-2 text-sm font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
      style={navGreen}
    >
      <span className="shrink-0 text-lg leading-none">+</span>
      <span className="truncate">Nuevo evento</span>
    </button>
  )

  const todayButtonDesktop = (
    <button type="button" onClick={goToToday} className={navButtonBase} style={navGreen}>
      Hoy
    </button>
  )

  const monthArrowsOnly = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
      <button
        type="button"
        onClick={goToPreviousMonth}
        className={monthNavArrowMobileClass}
        style={navCyan}
        aria-label="Mes anterior"
      >
        ←
      </button>
      {monthTitle}
      <button
        type="button"
        onClick={goToNextMonth}
        className={monthNavArrowMobileClass}
        style={navCyan}
        aria-label="Mes siguiente"
      >
        →
      </button>
    </div>
  )

  const todayButtonMobile = (
    <button
      type="button"
      onClick={goToToday}
      className="h-11 w-full rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
      style={navGreen}
    >
      Hoy
    </button>
  )

  /** Desktop: barra única debajo del calendario (← mes → Hoy Nuevo). shrink-0: nunca genera scroll propio; scroll va al contenedor de página. */
  const calendarToolbarDesktop = (
    <div className="mx-auto hidden w-full min-w-0 max-w-full shrink-0 flex-nowrap items-center justify-center gap-2 overflow-x-hidden lg:mb-3 lg:flex lg:max-w-[min(100%,max(15rem,calc((100dvh-16rem)*7/6)))]">
      <button type="button" onClick={goToPreviousMonth} className={navButtonBase} style={navCyan}>
        ←
      </button>
      {monthTitle}
      <button type="button" onClick={goToNextMonth} className={navButtonBase} style={navCyan}>
        →
      </button>
      {todayButtonDesktop}
      {newEventButtonDesktop}
    </div>
  )

  return (
    <>
      <BaseNav
        showStories={false}
        canHide={false}
        isVisible={true}
        pageTitle="Eventos"
        pageSubtitle="Consulta el calendario, crea recordatorios y gestiona tus fechas"
        pageTitleColor="#66DEDB"
      />
      {/* Shell: ocupa el alto del main; el scroll (custom-scrollbar) es solo en la zona interior */}
      <div
        className="flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden text-white"
        style={{ fontFamily: 'Poppins, sans-serif', backgroundColor: '#262626' }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain custom-scrollbar p-3 pt-24 sm:p-4 sm:pt-28 md:p-6 md:pt-32 lg:p-6 lg:pt-32">
          <div className="mx-auto w-full max-w-7xl">
            {/* Contenido principal: Calendario y Próximos Eventos */}
            <div className="grid grid-cols-1 gap-6 pb-2 lg:grid-cols-3 lg:pb-1">
              {/* Calendario (+ controles solo en móvil debajo) */}
              <div className="flex flex-col gap-4 lg:col-span-2 lg:items-start">
            {calendarToolbarDesktop}
            {/*
              Tarjeta = ancho exacto del grid (móvil 100%, desktop max por altura + centrado).
            */}
            <div
              className="relative w-full max-w-full rounded-2xl border border-gray-700 bg-gray-800 p-4 lg:mx-auto lg:max-w-[min(100%,max(15rem,calc((100dvh-16rem)*7/6)))] lg:p-3"
            >
              <div className="mb-3 grid w-full grid-cols-7 gap-1.5 lg:mb-2 lg:gap-1">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                  <div
                    key={day}
                    className="py-1 text-center text-xs font-semibold text-gray-400 lg:py-1 lg:text-xs lg:leading-tight"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid w-full grid-cols-7 gap-1.5 lg:gap-1">
                {calendarDays.map((day) => {
                  const dayEvents = getEventsForDay(day)
                  const isToday = isSameDay(day, new Date())
                  const isCurrentMonth = isSameMonth(day, currentDate)

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateClick(day)}
                      className={`
                      aspect-square rounded-lg border-2 p-1.5 transition-all
                      lg:rounded-md lg:border lg:p-1 lg:text-xs
                      ${isToday ? 'border-[#73FFA2] bg-[#73FFA2]/10 lg:ring-1 lg:ring-[#73FFA2]/40' : 'border-gray-700 hover:border-gray-600'}
                      ${!isCurrentMonth ? 'opacity-40 text-gray-500' : ''}
                      ${dayEvents.length > 0 && isCurrentMonth ? 'bg-[#73FFA2]/20' : dayEvents.length > 0 ? 'bg-[#73FFA2]/10' : isCurrentMonth ? 'bg-gray-700/50' : 'bg-gray-800/40'}
                    `}
                    >
                      <div className="mb-0.5 text-xs font-medium leading-none lg:mb-0 lg:leading-tight">
                        {format(day, 'd')}
                      </div>
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-0.5">
                          {dayEvents.slice(0, 4).map((event) => (
                            <div
                              key={`${event.id}_${event.date}`}
                              className="h-1.5 w-1.5 shrink-0 rounded-full border border-white/10"
                              style={{ backgroundColor: normalizeEventColor(event.color) }}
                              title={event.title}
                            />
                          ))}
                          {dayEvents.length > 4 && (
                            <div className="text-[10px] leading-none text-gray-400 lg:text-[9px]">
                              +{dayEvents.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Móvil: caja de ancho fijo centrada; mes estable; Hoy / Nuevo mismo ancho (grid) */}
            <div className="sticky bottom-0 z-20 flex w-full justify-center border-t border-gray-700/60 bg-[#262626] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
              <div className="flex w-[20rem] max-w-[calc(100vw-2rem)] shrink-0 flex-col gap-2.5">
                {monthArrowsOnly}
                <div className="grid w-full grid-cols-2 gap-2">
                  {todayButtonMobile}
                  {newEventButtonMobile}
                </div>
              </div>
            </div>
              </div>

              {/* Próximos Eventos - Lista lateral */}
              <div className="flex flex-col lg:col-span-1">
                <div className="sticky top-4 flex min-h-0 max-h-[min(480px,62vh)] flex-col rounded-2xl border border-gray-700 bg-gray-800 p-4 lg:relative lg:top-auto lg:max-h-[min(520px,58vh)] lg:shrink-0">
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
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] leading-tight max-w-[72px] transition-colors ${
                      colorFilter === p.hex
                        ? 'border-white text-white bg-white/10'
                        : 'border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
                    aria-label={p.label}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                      style={{ backgroundColor: p.hex }}
                    />
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
                {savedColorPresets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.label}
                    onClick={() =>
                      setColorFilter((f) =>
                        f === normalizeEventColor(p.hex) ? null : normalizeEventColor(p.hex)
                      )
                    }
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] leading-tight max-w-[80px] transition-colors ${
                      colorFilter?.toLowerCase() ===
                      normalizeEventColor(p.hex).toLowerCase()
                        ? 'border-white text-white bg-white/10'
                        : 'border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
                    aria-label={p.label}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                      style={{ backgroundColor: p.hex }}
                    />
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
                {orphanColorsForFilter.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    title={hex}
                    onClick={() =>
                      setColorFilter((f) =>
                        f?.toLowerCase() === hex ? null : normalizeEventColor(hex)
                      )
                    }
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] leading-tight max-w-[64px] transition-colors ${
                      colorFilter?.toLowerCase() === hex
                        ? 'border-white text-white bg-white/10'
                        : 'border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
                    aria-label={`Color ${hex}`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="truncate">{hex.slice(1, 5)}…</span>
                  </button>
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
            onCreateEvent={(d) => handleCreateEvent(d)}
            allowCreateEvent={
              selectedDate
                ? !isBefore(startOfDay(selectedDate), startOfDay(new Date()))
                : true
            }
          />

          {pastDateToast ? (
            <div
              className="fixed bottom-24 left-1/2 z-[200000] max-w-[min(90vw,20rem)] -translate-x-1/2 rounded-xl border border-[#73FFA2]/40 bg-[#1E1E1E] px-4 py-3 text-center text-sm text-white shadow-lg md:bottom-8"
              style={{ fontFamily: 'Poppins, sans-serif' }}
              role="status"
            >
              {pastDateToast}
            </div>
          ) : null}

          {/* Modal de formulario */}
          {showFormModal && (
            <EventFormModal
              isOpen={showFormModal}
              onClose={() => {
                setShowFormModal(false)
                setEditingEvent(null)
                setEditingEventData(null)
                setFormDefaultDate(null)
              }}
              onEventCreated={handleEventCreated}
              onEventUpdated={handleEventUpdated}
              event={editingEventData}
              defaultDate={formDefaultDate ?? undefined}
            />
          )}
        </div>
    </>
  )
}

