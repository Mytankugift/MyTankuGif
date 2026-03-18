'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useEvents, type RepeatType, type Event } from '@/lib/hooks/use-events'
import {
  EVENT_COLOR_PRESETS,
  DEFAULT_EVENT_COLOR,
  normalizeEventColor,
  toDateInputValue,
  dateInputToApiPayload,
} from '@/lib/event-colors'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  onEventCreated?: () => void
  onEventUpdated?: () => void
  event?: Event | null
}

export function EventFormModal({
  isOpen,
  onClose,
  onEventCreated,
  onEventUpdated,
  event,
}: EventFormModalProps) {
  const { createEvent, updateEvent, isLoading, error: hookError } = useEvents()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventColor, setEventColor] = useState(DEFAULT_EVENT_COLOR)
  const [repeatType, setRepeatType] = useState<RepeatType>('NONE')
  const [reminders, setReminders] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showRemindersDropdown, setShowRemindersDropdown] = useState(false)
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false)
  const remindersDropdownRef = useRef<HTMLDivElement>(null)
  const repeatDropdownRef = useRef<HTMLDivElement>(null)
  const remindersButtonRef = useRef<HTMLButtonElement>(null)
  const repeatButtonRef = useRef<HTMLButtonElement>(null)
  const [remindersDropdownPosition, setRemindersDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [repeatDropdownPosition, setRepeatDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  const reminderOptions = [
    { label: '1 semana antes', days: 7 },
    { label: '3 días antes', days: 3 },
    { label: '1 día antes', days: 1 },
    { label: 'El mismo día', days: 0 },
  ]

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description || '')
      setEventDate(toDateInputValue(event.eventDate))
      setEventColor(normalizeEventColor(event.color))
      setRepeatType(event.repeatType)
      setReminders(event.reminders || [])
    } else {
      setTitle('')
      setDescription('')
      setEventDate(toDateInputValue(new Date().toISOString()))
      setEventColor(DEFAULT_EVENT_COLOR)
      setRepeatType('NONE')
      setReminders([])
    }
    setError(null)
  }, [event, isOpen])

  // Calcular posición de los dropdowns
  const updateDropdownPosition = (
    buttonRef: React.RefObject<HTMLButtonElement | null>,
    setPosition: (pos: { top: number; left: number; width: number }) => void
  ) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      })
    }
  }

  // Cerrar dropdowns al hacer click fuera o scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (showRemindersDropdown && remindersDropdownRef.current && !remindersDropdownRef.current.contains(target) && remindersButtonRef.current && !remindersButtonRef.current.contains(target)) {
        setShowRemindersDropdown(false)
      }
      if (showRepeatDropdown && repeatDropdownRef.current && !repeatDropdownRef.current.contains(target) && repeatButtonRef.current && !repeatButtonRef.current.contains(target)) {
        setShowRepeatDropdown(false)
      }
    }

    const handleScroll = () => {
      setShowRemindersDropdown(false)
      setShowRepeatDropdown(false)
    }

    if (showRemindersDropdown || showRepeatDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [showRemindersDropdown, showRepeatDropdown])

  // Actualizar posición cuando se abren los dropdowns
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

  const handleReminderToggle = (days: number) => {
    setReminders((prev) => {
      if (prev.includes(days)) {
        return prev.filter((d) => d !== days)
      } else {
        return [...prev, days].sort((a, b) => b - a)
      }
    })
  }

  const getRemindersLabel = () => {
    if (reminders.length === 0) return 'Seleccionar recordatorios'
    const selected = reminderOptions
      .filter(opt => reminders.includes(opt.days))
      .map(opt => opt.label)
    return selected.join(', ')
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

    const datePayload = dateInputToApiPayload(eventDate)
    const colorPayload = normalizeEventColor(eventColor)

    try {
      if (event) {
        const updated = await updateEvent(event.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          eventDate: datePayload,
          repeatType,
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
          repeatType,
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
    } catch (err: any) {
      setError(err.message || 'Error al guardar evento')
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/80 p-4"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="rounded-[25px] w-full overflow-hidden flex flex-col border-2"
        style={{ 
          backgroundColor: '#262626',
          borderColor: '#73FFA2',
          maxWidth: '600px',
          maxHeight: '720px',
          minHeight: '500px',
          width: '90%'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-semibold" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
            {event ? 'Editar Evento' : 'Nuevo Evento'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar" style={{ minHeight: '350px', maxHeight: '520px', paddingBottom: '80px' }}>
          <form id="event-form" onSubmit={handleSubmit} className="space-y-4">
            {(error || hookError) && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                {error || hookError}
              </div>
            )}

            {/* Nombre y Fecha en el mismo renglón */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nombre del evento */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                  Nombre del evento *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 text-white focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(217, 217, 217, 0.2)',
                    borderRadius: '25px',
                    border: '1px solid #4A4A4A',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                  placeholder="Ej: Cumpleaños de mamá"
                  required
                />
              </div>

              {/* Fecha (solo día) */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                  Fecha *
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-3 text-white focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(217, 217, 217, 0.2)',
                    borderRadius: '25px',
                    border: '1px solid #4A4A4A',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                  required
                />
              </div>
            </div>

            {/* Tipo / color */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                Tipo de evento (color)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {EVENT_COLOR_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    title={p.label}
                    onClick={() => setEventColor(p.hex)}
                    className="w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#73FFA2]/50"
                    style={{
                      backgroundColor: p.hex,
                      borderColor: eventColor.toLowerCase() === p.hex.toLowerCase() ? '#FFFFFF' : '#4A4A4A',
                    }}
                    aria-label={p.label}
                  />
                ))}
                <label className="flex items-center gap-2 cursor-pointer rounded-full border border-[#4A4A4A] px-2 py-1 bg-[rgba(217,217,217,0.15)]">
                  <span className="text-xs text-[#B7B7B7] whitespace-nowrap">Otro</span>
                  <input
                    type="color"
                    value={eventColor.length === 7 ? eventColor : DEFAULT_EVENT_COLOR}
                    onChange={(e) => setEventColor(e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent"
                    title="Color personalizado"
                  />
                </label>
              </div>
              <p className="text-xs mt-1.5" style={{ color: '#B7B7B7' }}>
                El color se verá en el calendario y en la lista de próximos eventos.
              </p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 text-white focus:outline-none resize-none"
                style={{
                  backgroundColor: 'rgba(217, 217, 217, 0.2)',
                  borderRadius: '25px',
                  border: '1px solid #4A4A4A',
                  fontFamily: 'Poppins, sans-serif',
                  minHeight: '80px',
                }}
                rows={3}
                placeholder="Agrega una descripción..."
              />
            </div>

            {/* Repetición y Recordatorios en el mismo renglón */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Repetición - Desplegable personalizado */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                  Repetición
                </label>
                <button
                  ref={repeatButtonRef}
                  type="button"
                  onClick={() => {
                    if (!showRepeatDropdown) {
                      updateDropdownPosition(repeatButtonRef, setRepeatDropdownPosition)
                    }
                    setShowRepeatDropdown(!showRepeatDropdown)
                  }}
                  className="w-full px-4 py-3 text-left flex items-center justify-between focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(217, 217, 217, 0.2)',
                    borderRadius: '25px',
                    border: '1px solid #4A4A4A',
                    fontFamily: 'Poppins, sans-serif',
                    color: '#FFFFFF',
                  }}
                >
                  <span>
                    {repeatType === 'NONE' ? 'No repetir' :
                     repeatType === 'DAILY' ? 'Diario' :
                     repeatType === 'WEEKLY' ? 'Semanal' :
                     repeatType === 'MONTHLY' ? 'Mensual' :
                     repeatType === 'YEARLY' ? 'Anual' : 'No repetir'}
                  </span>
                  <ChevronDownIcon 
                    className={`w-5 h-5 transition-transform ${showRepeatDropdown ? 'rotate-180' : ''}`}
                    style={{ color: '#73FFA2' }}
                  />
                </button>
              </div>

              {/* Recordatorios - Desplegable con selector múltiple */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2" style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}>
                  Recordatorios
                </label>
                <button
                  ref={remindersButtonRef}
                  type="button"
                  onClick={() => {
                    if (!showRemindersDropdown) {
                      updateDropdownPosition(remindersButtonRef, setRemindersDropdownPosition)
                    }
                    setShowRemindersDropdown(!showRemindersDropdown)
                  }}
                  className="w-full px-4 py-3 text-left flex items-center justify-between focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(217, 217, 217, 0.2)',
                    borderRadius: '25px',
                    border: '1px solid #4A4A4A',
                    fontFamily: 'Poppins, sans-serif',
                    color: reminders.length > 0 ? '#FFFFFF' : '#B7B7B7',
                  }}
                >
                  <span>{getRemindersLabel()}</span>
                  <ChevronDownIcon 
                    className={`w-5 h-5 transition-transform ${showRemindersDropdown ? 'rotate-180' : ''}`}
                    style={{ color: '#73FFA2' }}
                  />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer con botones sticky */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 p-4 border-t" style={{ borderColor: '#4A4A4A' }}>
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
              backgroundColor: (title.trim() && !isLoading) ? '#73FFA2' : '#4A4A4A',
              color: (title.trim() && !isLoading) ? '#262626' : '#666',
              fontFamily: 'Poppins, sans-serif',
              boxShadow: '0px 4px 4px 0px #00000040 inset',
            }}
          >
            {isLoading ? 'Guardando...' : event ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>

      {/* Dropdown de Repetición renderizado fuera del modal */}
      {showRepeatDropdown && createPortal(
        <div
          ref={repeatDropdownRef}
          className="fixed rounded-lg border overflow-hidden"
          style={{
            top: `${repeatDropdownPosition.top}px`,
            left: `${repeatDropdownPosition.left}px`,
            width: `${repeatDropdownPosition.width}px`,
            backgroundColor: '#262626',
            borderColor: '#4A4A4A',
            zIndex: 100001,
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

      {/* Dropdown de Recordatorios renderizado fuera del modal */}
      {showRemindersDropdown && createPortal(
        <div
          ref={remindersDropdownRef}
          className="fixed rounded-lg border overflow-hidden"
          style={{
            top: `${remindersDropdownPosition.top}px`,
            left: `${remindersDropdownPosition.left}px`,
            width: `${remindersDropdownPosition.width}px`,
            backgroundColor: '#262626',
            borderColor: '#4A4A4A',
            zIndex: 100001,
          }}
        >
          {reminderOptions.map((option) => (
            <label
              key={option.days}
              className="flex items-center space-x-3 cursor-pointer p-3 hover:bg-gray-800/50 transition-colors border-b last:border-b-0"
              style={{ borderColor: '#4A4A4A' }}
            >
              <input
                type="checkbox"
                checked={reminders.includes(option.days)}
                onChange={() => handleReminderToggle(option.days)}
                className="w-4 h-4"
                style={{
                  accentColor: '#73FFA2',
                }}
              />
              <span className="text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {option.label}
              </span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </div>,
    document.body
  )
}
