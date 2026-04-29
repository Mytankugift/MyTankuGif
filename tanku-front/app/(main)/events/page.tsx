'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { clsx } from 'clsx'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { useEvents, type CalendarEvent, type Event } from '@/lib/hooks/use-events'
import { EventFormModal } from '@/components/events/event-form-modal'
import { EventDayModal } from '@/components/events/event-day-modal'
import { EventFilterModal } from '@/components/events/event-filter-modal'
import { EventCalendarRow } from '@/components/events/event-calendar-row'
import { format, isSameDay, isSameMonth, addMonths, subMonths, startOfDay, isBefore, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { getCalendarGridDays } from '@/lib/events/calendar-grid'
import { EVENT_COLOR_PRESETS, normalizeEventColor } from '@/lib/event-colors'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useEventColorPresets } from '@/lib/hooks/use-event-color-presets'
import { BaseNav } from '@/components/layout/base-nav'
import { NavBackToFeedLink } from '@/components/layout/nav-back-to-feed'

const GLASS_PANEL =
  'relative w-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[0_12px_40px_rgba(0,0,0,0.2)] backdrop-blur-sm'

/** Botón cuadrado del toolbar del calendario (flechas y acciones auxiliares) */
const CAL_TOOL_BTN =
  'inline-flex shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.05] text-zinc-100 transition-colors hover:bg-white/[0.09] active:bg-white/[0.06]'

/** Botones «Hoy» / «Nuevo evento»: relleno azul Tanku + sombra interna */
const CAL_ACTION_TANKU_FILL =
  'rounded-xl border border-[#66DEDB] bg-[#66DEDB] text-[#0d1619] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_5px_rgba(0,0,0,0.22)] hover:bg-[#8df5f1] active:bg-[#5bd8d4] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-2px_5px_rgba(0,0,0,0.2)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]'

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
  const [editingEventData, setEditingEventData] = useState<Event | null>(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [formDefaultDate, setFormDefaultDate] = useState<string | null>(null)
  const [pastDateToast, setPastDateToast] = useState<string | null>(null)
  const pastDateToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showFilterModal, setShowFilterModal] = useState(false)

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

  // Cargar eventos cuando cambian mes o sesión — difiere a microtask para no disparar react-hooks/set-state-in-effect en el propio efecto
  useEffect(() => {
    void Promise.resolve().then(() => loadEvents())
  }, [loadEvents])

  useEffect(() => {
    if (isAuthenticated) void Promise.resolve().then(() => loadPresets())
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
    setEditingEventData(null)
    setFormDefaultDate(date ? format(date, 'yyyy-MM-dd') : null)
    setShowFormModal(true)
  }

  const handleEditEvent = async (eventId: string) => {
    const event = await getEventById(eventId)
    if (event) {
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
    setEditingEventData(null)
  }

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const categoryFilterBadge = useMemo(() => {
    if (!colorFilter) return null
    const hex = normalizeEventColor(colorFilter)
    const h = hex.toLowerCase()
    const preset = EVENT_COLOR_PRESETS.find(
      (p) => normalizeEventColor(p.hex).toLowerCase() === h,
    )
    if (preset) return { hex, label: preset.label }
    const saved = savedColorPresets.find(
      (p) => normalizeEventColor(p.hex).toLowerCase() === h,
    )
    if (saved) return { hex, label: saved.label }
    return { hex, label: hex.length > 10 ? `${hex.slice(0, 9)}…` : hex }
  }, [colorFilter, savedColorPresets])

  /** Una vez por render: “hoy” local para el destacado del calendario */
  const todayAnchor = startOfDay(new Date())

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(null)
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

  const savedColorLabelsForRows = useMemo(
    () => savedColorPresets.map((p) => ({ hex: p.hex, label: p.label })),
    [savedColorPresets],
  )

  /** Ancho del calendario en lg+: alinea cabecera y rejilla. */
  const calendarWidthLg =
    'lg:max-w-[min(100%,max(15rem,calc((100dvh-16rem)*7/6)))]'

  /** Cabecera de mes + acciones (en lg+ el selector de mes usa todo el hueco entre flechas) */
  const calendarToolbar = (
    <div className="mb-4 flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex min-h-[2.5rem] min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className={clsx(CAL_TOOL_BTN, 'h-10 w-10 shrink-0')}
          aria-label="Mes anterior"
        >
          <ChevronLeftIcon className="h-5 w-5 text-zinc-200" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-2 sm:gap-2.5 lg:min-w-0 lg:flex-1 lg:justify-center">
          <CalendarDaysIcon
            className="hidden h-[1.125rem] w-[1.125rem] shrink-0 text-[#66DEDB]/90 sm:inline"
            aria-hidden
          />
          <h2 className="min-w-0 truncate text-center text-[15px] font-semibold capitalize tabular-nums text-zinc-100 sm:text-base">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
        </div>
        <button
          type="button"
          onClick={goToNextMonth}
          className={clsx(CAL_TOOL_BTN, 'h-10 w-10 shrink-0')}
          aria-label="Mes siguiente"
        >
          <ChevronRightIcon className="h-5 w-5 text-zinc-200" aria-hidden />
        </button>
      </div>
      <div className="flex w-full shrink-0 flex-row flex-wrap justify-stretch gap-2 lg:w-auto lg:justify-end">
        <button
          type="button"
          onClick={goToToday}
          className={clsx(
            CAL_ACTION_TANKU_FILL,
            'inline-flex h-10 min-w-[6rem] flex-1 items-center justify-center px-4 text-sm font-semibold lg:flex-initial',
          )}
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => handleCreateEvent()}
          className={clsx(
            CAL_ACTION_TANKU_FILL,
            'inline-flex h-10 min-w-[8rem] flex-1 items-center justify-center gap-2 px-4 text-sm font-semibold lg:flex-initial',
          )}
        >
          <span className="text-base leading-none">+</span>
          <span className="truncate">Nuevo evento</span>
        </button>
      </div>
    </div>
  )

  const weekdayRow = (
    <div className="mb-2 grid w-full grid-cols-7 gap-2 sm:gap-1.5">
      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
        <div
          key={day}
          className="py-1 text-center text-[11px] font-medium text-zinc-500 sm:text-xs"
        >
          {day}
        </div>
      ))}
    </div>
  )

  const calendarLegend = (
    <div
      className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4"
      aria-label="Leyenda de categorías de eventos"
    >
      {EVENT_COLOR_PRESETS.map((p) => (
        <div key={p.key} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/15"
            style={{ backgroundColor: p.hex }}
          />
          <span className="text-[11px] text-zinc-400 sm:text-xs">{p.label}</span>
        </div>
      ))}
    </div>
  )

  const dayCellsGrid = (
    <div className="grid w-full grid-cols-7 gap-2 sm:gap-1.5">
      {calendarDays.map((day) => {
        const dayEvents = getEventsForDay(day)
        const isToday = isSameDay(day, todayAnchor)
        const isCurrentMonth = isSameMonth(day, currentDate)
        const showGradientCell =
          (selectedDate !== null && isSameDay(day, selectedDate)) ||
          (selectedDate === null && isToday && isCurrentMonth)

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => handleDateClick(day)}
            className={clsx(
              'relative flex aspect-square min-h-0 flex-col rounded-xl border p-1 transition-[box-shadow,border-color,background-color]',
              !isCurrentMonth && 'opacity-45',
              !showGradientCell &&
                isToday &&
                isCurrentMonth &&
                'border-[#4d6f68]/35 ring-1 ring-[#5f8078]/28',
              !showGradientCell &&
                !isToday &&
                'border-white/[0.08] bg-[#121a23]/95 hover:bg-white/[0.05]',
              showGradientCell &&
                'scale-[1.01] border-[#5c857a]/50 shadow-[0_0_14px_rgba(55,95,85,0.22)] ring-2 ring-[#608a80]/42',
              !isCurrentMonth && 'border-white/[0.04] bg-black/25 hover:bg-black/35',
              !showGradientCell &&
                dayEvents.length > 0 &&
                isCurrentMonth &&
                'bg-[#0f181f]/98',
            )}
            style={
              showGradientCell && isCurrentMonth
                ? {
                    backgroundImage:
                      'linear-gradient(180deg,rgb(73, 160, 135) 0%, #273430 50%, #151d26 100%)',
                  }
                : undefined
            }
          >
            <span
              className={clsx(
                'pt-0.5 text-center text-[11px] font-semibold tabular-nums sm:text-xs',
                !isCurrentMonth ? 'text-zinc-600' : 'text-zinc-100',
              )}
            >
              {format(day, 'd')}
            </span>
            <div className="mt-auto flex min-h-[0.65rem] flex-wrap items-center justify-center gap-[3px] pb-0.5">
              {dayEvents.slice(0, 4).map((event) => (
                <span
                  key={`${event.id}_${event.date}`}
                  className="h-[5px] w-[5px] shrink-0 rounded-full ring-1 ring-black/35"
                  style={{ backgroundColor: normalizeEventColor(event.color) }}
                  title={event.title}
                />
              ))}
              {dayEvents.length > 4 ? (
                <span className="text-[9px] font-medium tabular-nums text-zinc-500">
                  +{dayEvents.length - 4}
                </span>
              ) : null}
            </div>
          </button>
        )
      })}
    </div>
  )

  /** Calendario en panel cristal (mismo tratamiento visual que solicitudes/sugerencias en /friends). */
  const calendarGlassCard = (
    <section
      className={clsx('flex flex-col p-3 sm:p-4 md:p-5', GLASS_PANEL)}
      aria-label="Calendario de eventos"
    >
      {calendarToolbar}
      {weekdayRow}
      {dayCellsGrid}
      {calendarLegend}
    </section>
  )

  return (
    <div
      className="relative z-0 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden text-white transition-colors duration-300"
      style={{
        fontFamily: 'Poppins, sans-serif',
        backgroundColor: 'var(--color-surface-191e23-20)',
      }}
    >
      <div className="pointer-events-none relative z-40 h-0 shrink-0 overflow-visible">
        <BaseNav
          showStories={false}
          canHide={false}
          isVisible={true}
          pageTitle="Eventos"
          pageTitleColor="#FFFFFF"
          mobileBackCenterTitleCartOnly
          mobileTranslucentNav
          desktopNavTitleCentered
          startContent={<NavBackToFeedLink />}
          className="pointer-events-auto"
        />
      </div>
      <div
        id="events-scroll-root"
        className={clsx(
          'custom-scrollbar relative z-0 min-h-0 w-full flex-1 basis-0 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]',
          'px-4 pt-[max(6.25rem,calc(env(safe-area-inset-top,0px)+5.25rem))] pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
          'lg:px-8 lg:pb-8 lg:pt-28 xl:px-10 xl:pt-32',
        )}
        style={{
          marginRight: '0',
          scrollBehavior: 'auto',
          scrollPaddingTop: 'max(env(safe-area-inset-top),12px)',
          scrollPaddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="mx-auto w-full max-w-7xl pb-4">
          <div className="grid grid-cols-1 gap-6 pb-2 lg:grid-cols-3 lg:items-start lg:gap-8 lg:pb-1">
            <div
              className={clsx(
                'mx-auto w-full min-w-0 lg:col-span-2',
                calendarWidthLg,
              )}
            >
              {calendarGlassCard}
            </div>

            <div className="flex min-h-0 flex-col lg:col-span-1 lg:self-start">
              <div
                className={clsx(
                  'sticky top-4 flex min-h-0 flex-col overflow-hidden p-3 sm:p-4',
                  GLASS_PANEL,
                  'h-[min(21rem,52svh)] max-h-[min(21rem,52svh)] lg:h-[30rem] lg:min-h-[30rem] lg:max-h-[30rem]',
                  'lg:relative lg:top-auto lg:shrink-0',
                )}
              >
              <div className="mb-3 flex flex-nowrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <h2 className="truncate text-[15px] font-semibold text-zinc-100 sm:text-base">
                  Próximos eventos
                </h2>
              </div>
              <p className="mb-2 flex-shrink-0 text-[10px] text-zinc-500">
                Próximo mes
              </p>
              <div className="mb-2 flex flex-shrink-0 items-center justify-between gap-2">
                <p className="text-[10px] text-zinc-500">Filtrar por categoría</p>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(true)}
                  className="inline-flex max-w-[min(100%,14rem)] shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-zinc-100 transition-colors hover:bg-white/[0.09]"
                >
                  <FunnelIcon
                    className="h-3.5 w-3.5 shrink-0 text-[#66DEDB]"
                    aria-hidden
                  />
                  <span className="truncate">Filtros</span>
                  {categoryFilterBadge ? (
                    <span className="truncate text-[#66DEDB]" title={categoryFilterBadge.label}>
                      · {categoryFilterBadge.label}
                    </span>
                  ) : null}
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 -mr-1">
                {upcomingEvents.length === 0 ? (
                  <p className="text-gray-400 text-xs py-2">
                    {colorFilter && baseUpcomingEvents.length > 0
                      ? 'Ningún evento con este color en el periodo.'
                      : 'No hay eventos en el próximo mes'}
                  </p>
                ) : (
                  <div className="space-y-2 pb-1">
                    {upcomingEvents.map((event) => {
                      const eventDate = new Date(event.date)
                      return (
                        <EventCalendarRow
                          key={`${event.id}_${event.date}`}
                          event={event}
                          savedColorLabels={savedColorLabelsForRows}
                          className="!p-2 sm:!p-2.5"
                          onClick={() => {
                            setSelectedDate(eventDate)
                            setSelectedEvents([event])
                            setShowDayModal(true)
                          }}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

          <EventFilterModal
            open={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            colorFilter={colorFilter}
            onColorFilterChange={setColorFilter}
            savedColorPresets={savedColorPresets}
            orphanColorsForFilter={orphanColorsForFilter}
          />

          {/* Modal de eventos del día */}
          <EventDayModal
            isOpen={showDayModal}
            selectedDate={selectedDate}
            events={selectedEvents}
            onClose={() => setShowDayModal(false)}
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
            onCreateEvent={(d) => handleCreateEvent(d)}
            categoryFilterBadge={categoryFilterBadge}
            savedColorLabels={savedColorLabelsForRows}
            allowCreateEvent={
              selectedDate
                ? !isBefore(startOfDay(selectedDate), todayAnchor)
                : true
            }
            zIndex={1_000_450}
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
    </div>
  )
}

