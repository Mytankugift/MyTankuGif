'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useEvents, type RepeatType, type Event, type EventKind } from '@/lib/hooks/use-events'
import { useEventColorPresets } from '@/lib/hooks/use-event-color-presets'
import {
  EVENT_COLOR_PRESETS,
  DEFAULT_EVENT_COLOR,
  normalizeEventColor,
  toDateInputValue,
  dateInputToApiPayload,
  todayDateInputValue,
} from '@/lib/event-colors'
import {
  XMarkIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

/** Overlay del modal (más bajo que los portales de desplegables). */
const EVENT_FORM_MODAL_Z = 100_000
/** Listas desplegables por encima del modal. */
const EVENT_FORM_DROPDOWN_Z = 500_000
/** Diálogo anidado (añadir preset). */
const EVENT_FORM_NESTED_DIALOG_Z = 500_001

const ALL_REMINDER_OPTIONS: { label: string; days: number }[] = [
  { label: '1 mes antes (30 días naturales)', days: 30 },
  { label: '1 semana antes', days: 7 },
  { label: '3 días antes', days: 3 },
  { label: '1 día antes', days: 1 },
  { label: 'El mismo día', days: 0 },
]

const fieldShell: React.CSSProperties = {
  backgroundColor: 'rgba(217, 217, 217, 0.2)',
  border: '1px solid #4A4A4A',
  fontFamily: 'Poppins, sans-serif',
}

const fieldClass =
  'w-full px-4 py-2 text-sm text-white rounded-full focus:outline-none focus:ring-1 focus:ring-[#73FFA2]/30 min-h-[40px]'

function getColorTypeLabel(
  hex: string,
  saved: { id: string; label: string; hex: string }[]
): string {
  const n = normalizeEventColor(hex).toLowerCase()
  const s = saved.find((p) => normalizeEventColor(p.hex).toLowerCase() === n)
  if (s) return s.label
  const b = EVENT_COLOR_PRESETS.find((p) => p.hex.toLowerCase() === n)
  if (b) return b.label
  return `Personalizado (${n})`
}

/** Días hasta la fecha del evento según calendario local (misma noción de “hoy” que el input type=date). */
function daysUntilEventDate(yyyyMmDd: string): number {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return 400
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const ev = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((ev.getTime() - today.getTime()) / 86400000)
}

/** Todos los recordatorios permitidos para esa fecha (los que ya no exceden el tiempo hasta el evento). */
function allRemindersForDateYyyyMmDd(yyyyMmDd: string): number[] {
  const daysUntil = daysUntilEventDate(yyyyMmDd)
  if (daysUntil < 0) return []
  return ALL_REMINDER_OPTIONS.filter((o) => o.days <= daysUntil).map((o) => o.days)
}

/** Ajusta recordatorios a opciones válidas para la fecha (misma regla que el desplegable). */
function sanitizeRemindersForDateYyyyMmDd(yyyyMmDd: string, raw: number[]): number[] {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) {
    return raw.length > 0 ? raw : [0]
  }
  const daysUntil = daysUntilEventDate(yyyyMmDd)
  if (daysUntil < 0) return []
  const opts = ALL_REMINDER_OPTIONS.filter((o) => o.days <= daysUntil)
  const allowed = new Set(opts.map((o) => o.days))
  const next = raw.filter((d) => allowed.has(d))
  if (next.length > 0) return next
  if (opts.length > 0) return [opts[opts.length - 1].days]
  return [0]
}

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  onEventCreated?: () => void
  onEventUpdated?: () => void
  event?: Event | null
  /** YYYY-MM-DD al crear desde un día del calendario */
  defaultDate?: string
}

function KindHelp({ title, text }: { title: string; text: string }) {
  return (
    <span className="inline-flex items-center" title={text}>
      <InformationCircleIcon
        className="w-4 h-4 ml-1 cursor-help shrink-0"
        style={{ color: '#66DEDB' }}
        aria-label={title}
      />
    </span>
  )
}

export function EventFormModal({
  isOpen,
  onClose,
  onEventCreated,
  onEventUpdated,
  event,
  defaultDate,
}: EventFormModalProps) {
  const { createEvent, updateEvent, isLoading, error: hookError } = useEvents()
  const { presets: savedColorPresets, loadPresets, savePresets } = useEventColorPresets()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventColor, setEventColor] = useState(DEFAULT_EVENT_COLOR)
  const [eventKind, setEventKind] = useState<EventKind>('EVENT')
  const [repeatType, setRepeatType] = useState<RepeatType>('NONE')
  const [reminders, setReminders] = useState<number[]>(() =>
    allRemindersForDateYyyyMmDd(todayDateInputValue())
  )
  const [error, setError] = useState<string | null>(null)
  const [showRemindersDropdown, setShowRemindersDropdown] = useState(false)
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false)
  const remindersDropdownRef = useRef<HTMLDivElement>(null)
  const repeatDropdownRef = useRef<HTMLDivElement>(null)
  const remindersButtonRef = useRef<HTMLButtonElement>(null)
  const repeatButtonRef = useRef<HTMLButtonElement>(null)
  const [remindersDropdownPosition, setRemindersDropdownPosition] = useState({
    bottom: 0,
    left: 0,
    width: 0,
  })
  const [repeatDropdownPosition, setRepeatDropdownPosition] = useState({ bottom: 0, left: 0, width: 0 })
  const [showColorDropdown, setShowColorDropdown] = useState(false)
  const colorDropdownRef = useRef<HTMLDivElement>(null)
  const colorButtonRef = useRef<HTMLButtonElement>(null)
  const [colorDropdownPosition, setColorDropdownPosition] = useState({ bottom: 0, left: 0, width: 0 })
  const [showAddPresetModal, setShowAddPresetModal] = useState(false)
  const [newColorLabel, setNewColorLabel] = useState('')
  const [newColorHex, setNewColorHex] = useState('#73FFA2')
  const [addPresetError, setAddPresetError] = useState<string | null>(null)
  const [savingPreset, setSavingPreset] = useState(false)
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null)

  const daysUntil = useMemo(() => daysUntilEventDate(eventDate), [eventDate])

  const availableReminderOptions = useMemo(
    () => ALL_REMINDER_OPTIONS.filter((o) => o.days <= daysUntil),
    [daysUntil]
  )

  useEffect(() => {
    if (event) {
      const dateStr = toDateInputValue(event.eventDate)
      const kind = event.kind ?? 'EVENT'
      const rawReminders =
        Array.isArray(event.reminders) && event.reminders.length > 0
          ? event.reminders.map((d) => Number(d))
          : [0]
      setTitle(event.title)
      setDescription(event.description || '')
      setEventDate(dateStr)
      setEventColor(normalizeEventColor(event.color))
      setEventKind(kind)
      setRepeatType(kind === 'EVENT' ? 'NONE' : event.repeatType)
      setReminders(sanitizeRemindersForDateYyyyMmDd(dateStr, rawReminders))
    } else {
      const dateStr =
        defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(defaultDate) ? defaultDate : todayDateInputValue()
      setTitle('')
      setDescription('')
      setEventDate(dateStr)
      setEventColor(DEFAULT_EVENT_COLOR)
      setEventKind('EVENT')
      setRepeatType('NONE')
      setReminders(allRemindersForDateYyyyMmDd(dateStr))
    }
    setError(null)
  }, [event, isOpen, defaultDate])

  useEffect(() => {
    if (isOpen) {
      loadPresets()
    }
  }, [isOpen, loadPresets])

  /** Abre el menú hacia arriba: borde inferior del panel 8px por encima del botón. */
  const updateDropdownPosition = (
    buttonRef: React.RefObject<HTMLButtonElement | null>,
    setPosition: (pos: { bottom: number; left: number; width: number }) => void
  ) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const gap = 8
      setPosition({
        bottom: window.innerHeight - rect.top + gap,
        left: rect.left,
        width: rect.width,
      })
    }
  }

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      const target = ev.target as Node
      if (
        showRemindersDropdown &&
        remindersDropdownRef.current &&
        !remindersDropdownRef.current.contains(target) &&
        remindersButtonRef.current &&
        !remindersButtonRef.current.contains(target)
      ) {
        setShowRemindersDropdown(false)
      }
      if (
        showRepeatDropdown &&
        repeatDropdownRef.current &&
        !repeatDropdownRef.current.contains(target) &&
        repeatButtonRef.current &&
        !repeatButtonRef.current.contains(target)
      ) {
        setShowRepeatDropdown(false)
      }
      if (
        showColorDropdown &&
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(target) &&
        colorButtonRef.current &&
        !colorButtonRef.current.contains(target)
      ) {
        setShowColorDropdown(false)
      }
    }

    const handleScroll = (ev: globalThis.Event) => {
      const target = ev.target
      if (!(target instanceof Node)) return
      const insideReminders =
        remindersDropdownRef.current?.contains(target) ?? false
      const insideRepeat = repeatDropdownRef.current?.contains(target) ?? false
      const insideColor = colorDropdownRef.current?.contains(target) ?? false

      if (
        showRemindersDropdown &&
        remindersDropdownRef.current &&
        !insideReminders
      ) {
        setShowRemindersDropdown(false)
      }
      if (showRepeatDropdown && repeatDropdownRef.current && !insideRepeat) {
        setShowRepeatDropdown(false)
      }
      if (showColorDropdown && colorDropdownRef.current && !insideColor) {
        setShowColorDropdown(false)
      }
    }

    if (showRemindersDropdown || showRepeatDropdown || showColorDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [showRemindersDropdown, showRepeatDropdown, showColorDropdown])

  useEffect(() => {
    if (showRemindersDropdown && remindersButtonRef.current) {
      updateDropdownPosition(remindersButtonRef, setRemindersDropdownPosition)
    }
  }, [showRemindersDropdown])

  useEffect(() => {
    if (showRepeatDropdown && repeatButtonRef.current) {
      updateDropdownPosition(repeatButtonRef, setRepeatDropdownPosition)
    }
  }, [showRepeatDropdown])

  useEffect(() => {
    if (showColorDropdown && colorButtonRef.current) {
      updateDropdownPosition(colorButtonRef, setColorDropdownPosition)
    }
  }, [showColorDropdown])

  const handleReminderToggle = (days: number) => {
    setReminders((prev) => {
      if (prev.includes(days)) {
        return prev.filter((d) => d !== days)
      }
      return [...prev, days].sort((a, b) => b - a)
    })
  }

  const getRemindersLabel = () => {
    if (reminders.length === 0) return 'Seleccionar recordatorios'
    const selected = ALL_REMINDER_OPTIONS.filter((opt) => reminders.includes(opt.days)).map(
      (opt) => opt.label
    )
    return selected.join(', ')
  }

  const showOrphanColorOption = useMemo(() => {
    const n = normalizeEventColor(eventColor).toLowerCase()
    const inBuilt = EVENT_COLOR_PRESETS.some((p) => p.hex.toLowerCase() === n)
    const inSaved = savedColorPresets.some(
      (p) => normalizeEventColor(p.hex).toLowerCase() === n
    )
    return !inBuilt && !inSaved
  }, [eventColor, savedColorPresets])

  const openAddPresetModal = () => {
    setAddPresetError(null)
    setNewColorLabel('')
    setNewColorHex(normalizeEventColor(eventColor))
    setShowAddPresetModal(true)
  }

  const handleSaveNewColorType = async () => {
    const label = newColorLabel.trim()
    if (!label) {
      setAddPresetError('Escribe un nombre para el tipo')
      return
    }
    if (savedColorPresets.length >= 24) {
      setAddPresetError('Máximo 24 tipos guardados')
      return
    }
    const hex = normalizeEventColor(newColorHex)
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setAddPresetError('El color debe ser un hex válido (#RRGGBB)')
      return
    }
    setSavingPreset(true)
    setAddPresetError(null)
    try {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `p-${Date.now()}`
      const next = [...savedColorPresets, { id, label, hex }]
      const result = await savePresets(next)
      if (result.ok) {
        setEventColor(hex)
        setNewColorLabel('')
        setShowAddPresetModal(false)
        setShowColorDropdown(false)
      } else {
        setAddPresetError(result.error)
      }
    } finally {
      setSavingPreset(false)
    }
  }

  const handleDeleteSavedColorPreset = async (presetId: string) => {
    const next = savedColorPresets.filter((x) => x.id !== presetId)
    setDeletingPresetId(presetId)
    setError(null)
    try {
      const result = await savePresets(next)
      if (!result.ok) {
        setError(result.error)
      }
    } finally {
      setDeletingPresetId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('El nombre del evento es requerido')
      return
    }

    if (!eventDate) {
      setError('La fecha es requerida')
      return
    }

    if (daysUntilEventDate(eventDate) < 0) {
      if (!event) {
        setError('No puedes crear un evento en una fecha que ya pasó')
        return
      }
      const originalStr = toDateInputValue(event.eventDate)
      if (eventDate !== originalStr) {
        setError('No puedes cambiar el evento a una fecha que ya pasó')
        return
      }
    }

    const datePayload = dateInputToApiPayload(eventDate)
    const colorPayload = normalizeEventColor(eventColor)
    const effectiveRepeat: RepeatType = eventKind === 'EVENT' ? 'NONE' : repeatType

    try {
      if (event) {
        const updated = await updateEvent(event.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          eventDate: datePayload,
          repeatType: effectiveRepeat,
          kind: eventKind,
          reminders,
          color: colorPayload,
        })

        if (updated) {
          onEventUpdated?.()
          onClose()
        } else {
          setError(hookError || 'Error al actualizar evento')
        }
      } else {
        const created = await createEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          eventDate: datePayload,
          repeatType: effectiveRepeat,
          kind: eventKind,
          reminders,
          color: colorPayload,
        })

        if (created) {
          onEventCreated?.()
          onClose()
        } else {
          setError(hookError || 'Error al crear evento')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar evento'
      setError(msg)
    }
  }

  if (!isOpen) return null

  const showRepeat = eventKind === 'CELEBRATION'

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: EVENT_FORM_MODAL_Z,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="rounded-[25px] flex max-h-[min(85dvh,720px)] w-[90%] max-w-[600px] min-h-0 flex-col overflow-hidden border-2 md:max-h-[min(85vh,720px)]"
        style={{
          backgroundColor: '#262626',
          borderColor: '#73FFA2',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4">
          <h2
            className="text-xl font-semibold"
            style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
          >
            {event ? 'Editar Evento' : 'Nuevo Evento'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-1 custom-scrollbar">
          <form id="event-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
            {(error || hookError) && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                {error || hookError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
                >
                  Nombre del evento *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={fieldClass}
                  style={fieldShell}
                  placeholder="Ej: Cumpleaños de mamá"
                  required
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
                >
                  Fecha *
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => {
                    const v = e.target.value
                    setEventDate(v)
                    if (event) {
                      setReminders((prev) => sanitizeRemindersForDateYyyyMmDd(v, prev))
                    } else {
                      setReminders(allRemindersForDateYyyyMmDd(v))
                    }
                  }}
                  min={event ? undefined : todayDateInputValue()}
                  className={fieldClass}
                  style={fieldShell}
                  required
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5 flex items-center flex-wrap gap-1"
                style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
              >
                Tipo
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <label
                  className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-2 flex-1 min-h-[40px] ${
                    eventKind === 'CELEBRATION' ? 'border-[#73FFA2] bg-[#73FFA2]/10' : 'border-[#4A4A4A]'
                  }`}
                >
                  <input
                    type="radio"
                    name="eventKind"
                    checked={eventKind === 'CELEBRATION'}
                    onChange={() => setEventKind('CELEBRATION')}
                    className="accent-[#73FFA2]"
                  />
                  <span className="text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Celebración
                  </span>
                  <KindHelp
                    title="Celebración"
                    text="Ocasiones que se repiten cada año o con cierta periodicidad: cumpleaños, aniversarios, festividades, San Valentín, etc."
                  />
                </label>
                <label
                  className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-2 flex-1 min-h-[40px] ${
                    eventKind === 'EVENT' ? 'border-[#73FFA2] bg-[#73FFA2]/10' : 'border-[#4A4A4A]'
                  }`}
                >
                  <input
                    type="radio"
                    name="eventKind"
                    checked={eventKind === 'EVENT'}
                    onChange={() => {
                      setEventKind('EVENT')
                      setRepeatType('NONE')
                    }}
                    className="accent-[#73FFA2]"
                  />
                  <span className="text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Evento (una sola vez)
                  </span>
                  <KindHelp
                    title="Evento"
                    text="Actos puntuales que no se repiten en el calendario: boda, bautizo, reunión con amigos, cita única, etc."
                  />
                </label>
              </div>
            </div>

            <div className="relative">
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
              >
                Tipo de evento (color)
              </label>
              <button
                ref={colorButtonRef}
                type="button"
                onClick={() => {
                  if (!showColorDropdown) {
                    setShowRemindersDropdown(false)
                    setShowRepeatDropdown(false)
                    updateDropdownPosition(colorButtonRef, setColorDropdownPosition)
                  }
                  setShowColorDropdown(!showColorDropdown)
                }}
                className={`${fieldClass} text-left flex items-center justify-between gap-2`}
                style={{
                  ...fieldShell,
                  color: '#FFFFFF',
                }}
              >
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: normalizeEventColor(eventColor) }}
                    aria-hidden
                  />
                  <span className="truncate text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {getColorTypeLabel(eventColor, savedColorPresets)}
                  </span>
                </span>
                <ChevronDownIcon
                  className={`w-5 h-5 shrink-0 transition-transform ${showColorDropdown ? 'rotate-180' : ''}`}
                  style={{ color: '#73FFA2' }}
                />
              </button>
              <button
                type="button"
                onClick={openAddPresetModal}
                className="mt-2 text-xs font-semibold underline-offset-2 hover:underline"
                style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}
              >
                + Añadir nuevo tipo y guardarlo
              </button>
              <p className="text-xs mt-1.5" style={{ color: '#B7B7B7' }}>
                El color se verá en el calendario y en la lista de próximos eventos.
              </p>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
              >
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 text-sm text-white focus:outline-none resize-none rounded-full min-h-[72px]"
                style={fieldShell}
                rows={3}
                placeholder="Agrega una descripción..."
              />
            </div>

            <div className={`grid grid-cols-1 gap-4 ${showRepeat ? 'sm:grid-cols-2' : ''}`}>
              {showRepeat && (
                <div className="relative">
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
                  >
                    Repetición
                  </label>
                  <button
                    ref={repeatButtonRef}
                    type="button"
                    onClick={() => {
                      if (!showRepeatDropdown) {
                        setShowRemindersDropdown(false)
                        setShowColorDropdown(false)
                        updateDropdownPosition(repeatButtonRef, setRepeatDropdownPosition)
                      }
                      setShowRepeatDropdown(!showRepeatDropdown)
                    }}
                    className={`${fieldClass} text-left flex items-center justify-between`}
                    style={{ ...fieldShell, color: '#FFFFFF' }}
                  >
                    <span>
                      {repeatType === 'NONE'
                        ? 'No repetir'
                        : repeatType === 'DAILY'
                          ? 'Diario'
                          : repeatType === 'WEEKLY'
                            ? 'Semanal'
                            : repeatType === 'MONTHLY'
                              ? 'Mensual'
                              : repeatType === 'YEARLY'
                                ? 'Anual'
                                : 'No repetir'}
                    </span>
                    <ChevronDownIcon
                      className={`w-5 h-5 transition-transform ${showRepeatDropdown ? 'rotate-180' : ''}`}
                      style={{ color: '#73FFA2' }}
                    />
                  </button>
                </div>
              )}

              <div className={`relative ${!showRepeat ? 'sm:col-span-1' : ''}`}>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
                >
                  Recordatorios
                </label>
                <button
                  ref={remindersButtonRef}
                  type="button"
                  onClick={() => {
                    if (!showRemindersDropdown) {
                      setShowRepeatDropdown(false)
                      setShowColorDropdown(false)
                      updateDropdownPosition(remindersButtonRef, setRemindersDropdownPosition)
                    }
                    setShowRemindersDropdown(!showRemindersDropdown)
                  }}
                  className={`${fieldClass} text-left flex items-center justify-between`}
                  style={{
                    ...fieldShell,
                    color: reminders.length > 0 ? '#FFFFFF' : '#B7B7B7',
                  }}
                >
                  <span className="truncate pr-2">{getRemindersLabel()}</span>
                  <ChevronDownIcon
                    className={`w-5 h-5 shrink-0 transition-transform ${showRemindersDropdown ? 'rotate-180' : ''}`}
                    style={{ color: '#73FFA2' }}
                  />
                </button>
              </div>
            </div>
          </form>
        </div>

        <div
          className="flex-shrink-0 flex items-center justify-between gap-3 p-4 border-t"
          style={{ borderColor: '#4A4A4A' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="font-semibold transition-all rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              width: '120px',
              height: '40px',
              backgroundColor: '#4A4A4A',
              color: '#B7B7B7',
              fontFamily: 'Poppins, sans-serif',
              boxShadow: '0px 4px 4px 0px #00000040 inset',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="event-form"
            onClick={handleSubmit}
            disabled={isLoading || !title.trim()}
            className="font-semibold transition-all rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              width: '120px',
              height: '40px',
              backgroundColor: title.trim() && !isLoading ? '#73FFA2' : '#4A4A4A',
              color: title.trim() && !isLoading ? '#262626' : '#666',
              fontFamily: 'Poppins, sans-serif',
              boxShadow: '0px 4px 4px 0px #00000040 inset',
            }}
          >
            {isLoading ? 'Guardando...' : event ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>

      {showColorDropdown &&
        createPortal(
          <div
            ref={colorDropdownRef}
            className="fixed rounded-lg border overflow-hidden max-h-72 overflow-y-auto custom-scrollbar"
            style={{
              bottom: `${colorDropdownPosition.bottom}px`,
              left: `${colorDropdownPosition.left}px`,
              width: `${colorDropdownPosition.width}px`,
              backgroundColor: '#262626',
              borderColor: '#4A4A4A',
              zIndex: EVENT_FORM_DROPDOWN_Z,
            }}
            onWheel={(e) => e.stopPropagation()}
          >
            <div
              className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-b"
              style={{
                borderColor: '#4A4A4A',
                color: '#888888',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              Predeterminados
            </div>
            {EVENT_COLOR_PRESETS.map((p) => {
              const selected =
                normalizeEventColor(eventColor).toLowerCase() === p.hex.toLowerCase()
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setEventColor(p.hex)
                    setShowColorDropdown(false)
                  }}
                  className={`w-full flex items-center gap-3 text-left p-3 hover:bg-gray-800/50 transition-colors border-b border-[#4A4A4A] ${
                    selected ? 'bg-gray-800/70' : ''
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-white/15"
                    style={{ backgroundColor: p.hex }}
                  />
                  <span
                    className="text-sm leading-snug"
                    style={{
                      fontFamily: 'Poppins, sans-serif',
                      color: selected ? '#73FFA2' : '#FFFFFF',
                    }}
                  >
                    {p.label}
                  </span>
                </button>
              )
            })}
            {savedColorPresets.length > 0 ? (
              <>
                <div
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-b border-t border-[#4A4A4A]"
                  style={{ color: '#888888', fontFamily: 'Poppins, sans-serif' }}
                >
                  Mis tipos (guardados)
                </div>
                {savedColorPresets.map((p) => {
                  const selected =
                    normalizeEventColor(eventColor).toLowerCase() ===
                    normalizeEventColor(p.hex).toLowerCase()
                  return (
                    <div
                      key={p.id}
                      className={`flex items-stretch border-b border-[#4A4A4A] last:border-b-0 ${
                        selected ? 'bg-gray-800/70' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEventColor(normalizeEventColor(p.hex))
                          setShowColorDropdown(false)
                        }}
                        className="flex flex-1 min-w-0 items-center gap-3 text-left p-3 hover:bg-gray-800/50 transition-colors"
                      >
                        <span
                          className="w-4 h-4 rounded-full shrink-0 border border-white/15"
                          style={{ backgroundColor: p.hex }}
                        />
                        <span
                          className="text-sm leading-snug truncate"
                          style={{
                            fontFamily: 'Poppins, sans-serif',
                            color: selected ? '#73FFA2' : '#FFFFFF',
                          }}
                        >
                          {p.label}
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Eliminar tipo guardado"
                        aria-label={`Eliminar tipo ${p.label}`}
                        disabled={deletingPresetId === p.id}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          void handleDeleteSavedColorPreset(p.id)
                        }}
                        className="shrink-0 px-2.5 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </>
            ) : null}
            {showOrphanColorOption ? (
              <>
                <div
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-b border-t border-[#4A4A4A]"
                  style={{ color: '#888888', fontFamily: 'Poppins, sans-serif' }}
                >
                  Sin guardar
                </div>
                <button
                  type="button"
                  onClick={() => setShowColorDropdown(false)}
                  className="w-full flex items-center gap-3 text-left p-3 hover:bg-gray-800/50 transition-colors bg-gray-800/70"
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-white/15"
                    style={{ backgroundColor: normalizeEventColor(eventColor) }}
                  />
                  <span
                    className="text-sm leading-snug"
                    style={{ fontFamily: 'Poppins, sans-serif', color: '#73FFA2' }}
                  >
                    Color actual ({normalizeEventColor(eventColor)})
                  </span>
                </button>
              </>
            ) : null}
          </div>,
          document.body
        )}

      {showRepeatDropdown &&
        createPortal(
          <div
            ref={repeatDropdownRef}
            className="fixed rounded-lg border overflow-hidden"
            style={{
              bottom: `${repeatDropdownPosition.bottom}px`,
              left: `${repeatDropdownPosition.left}px`,
              width: `${repeatDropdownPosition.width}px`,
              backgroundColor: '#262626',
              borderColor: '#4A4A4A',
              zIndex: EVENT_FORM_DROPDOWN_Z,
            }}
          >
            {[
              { value: 'NONE', label: 'No repetir' },
              { value: 'DAILY', label: 'Diario' },
              { value: 'WEEKLY', label: 'Semanal' },
              { value: 'MONTHLY', label: 'Mensual' },
              { value: 'YEARLY', label: 'Anual' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setRepeatType(option.value as RepeatType)
                  setShowRepeatDropdown(false)
                }}
                className={`w-full text-left p-3 hover:bg-gray-800/50 transition-colors border-b last:border-b-0 ${
                  repeatType === option.value ? 'bg-gray-800/70' : ''
                }`}
                style={{
                  borderColor: '#4A4A4A',
                  color: repeatType === option.value ? '#73FFA2' : '#FFFFFF',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body
        )}

      {showRemindersDropdown &&
        createPortal(
          <div
            ref={remindersDropdownRef}
            className="fixed rounded-lg border overflow-hidden max-h-64 overflow-y-auto"
            style={{
              bottom: `${remindersDropdownPosition.bottom}px`,
              left: `${remindersDropdownPosition.left}px`,
              width: `${remindersDropdownPosition.width}px`,
              backgroundColor: '#262626',
              borderColor: '#4A4A4A',
              zIndex: EVENT_FORM_DROPDOWN_Z,
            }}
            onWheel={(e) => e.stopPropagation()}
          >
            {availableReminderOptions.map((option) => (
              <label
                key={option.days}
                className="flex items-center space-x-3 cursor-pointer p-3 hover:bg-gray-800/50 transition-colors border-b last:border-b-0"
                style={{ borderColor: '#4A4A4A' }}
              >
                <input
                  type="checkbox"
                  checked={reminders.includes(option.days)}
                  onChange={() => handleReminderToggle(option.days)}
                  className="w-4 h-4 shrink-0"
                  style={{ accentColor: '#73FFA2' }}
                />
                <span className="text-white text-sm leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>,
          document.body
        )}

      {showAddPresetModal &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-black/70 p-4"
            style={{ zIndex: EVENT_FORM_NESTED_DIALOG_Z }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-preset-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddPresetModal(false)
                setAddPresetError(null)
              }
            }}
          >
            <div
              className="w-full max-w-sm rounded-2xl border-2 p-4 shadow-xl"
              style={{
                backgroundColor: '#262626',
                borderColor: '#73FFA2',
                fontFamily: 'Poppins, sans-serif',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3
                  id="add-preset-title"
                  className="text-base font-semibold pr-2"
                  style={{ color: '#73FFA2' }}
                >
                  Nuevo tipo de color
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPresetModal(false)
                    setAddPresetError(null)
                  }}
                  className="text-gray-400 hover:text-white p-1 rounded shrink-0"
                  aria-label="Cerrar"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[11px] mb-3" style={{ color: '#B7B7B7' }}>
                Así podrás filtrar por este color en el calendario.
              </p>
              {addPresetError ? (
                <div className="mb-3 p-2 rounded-lg text-sm bg-red-900/40 border border-red-700/80 text-red-200">
                  {addPresetError}
                </div>
              ) : null}
              <div className="space-y-3">
                <input
                  type="text"
                  value={newColorLabel}
                  onChange={(e) => setNewColorLabel(e.target.value)}
                  placeholder="Nombre (ej: Familia)"
                  className={fieldClass}
                  style={fieldShell}
                  maxLength={40}
                  autoFocus
                />
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newColorHex.length === 7 ? newColorHex : DEFAULT_EVENT_COLOR}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-11 h-11 rounded-full cursor-pointer border border-[#4A4A4A] bg-transparent shrink-0"
                    title="Elegir color"
                  />
                  <span className="text-xs truncate" style={{ color: '#B7B7B7' }}>
                    {normalizeEventColor(newColorHex)}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPresetModal(false)
                    setAddPresetError(null)
                  }}
                  className="px-4 py-2 rounded-full text-sm font-semibold"
                  style={{
                    backgroundColor: '#4A4A4A',
                    color: '#B7B7B7',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveNewColorType()}
                  disabled={savingPreset}
                  className="px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
                  style={{
                    backgroundColor: '#73FFA2',
                    color: '#262626',
                  }}
                >
                  {savingPreset ? 'Guardando…' : 'Guardar tipo'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>,
    document.body
  )
}
