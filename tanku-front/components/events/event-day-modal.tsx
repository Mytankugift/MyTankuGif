'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  XMarkIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import type { CalendarEvent } from '@/lib/hooks/use-events'
import { EventCalendarRow } from '@/components/events/event-calendar-row'

export interface EventDayModalProps {
  isOpen: boolean
  selectedDate: Date | null
  events: CalendarEvent[]
  onClose: () => void
  onEditEvent: (eventId: string) => void
  onDeleteEvent: (eventId: string) => void
  onCreateEvent: (date: Date) => void
  /** Si es false, no se ofrece crear evento (día ya pasado en calendario local). */
  allowCreateEvent?: boolean
  zIndex?: number
  /** Filtro por color activo en /events al abrir este modal (solo informativo en cabecera). */
  categoryFilterBadge?: { hex: string; label: string } | null
  /** Tipos de color guardados (etiquetas tipo “test”, etc.) para la fila del evento */
  savedColorLabels?: readonly { hex: string; label: string }[]
}

export function EventDayModal({
  isOpen,
  selectedDate,
  events,
  onClose,
  onEditEvent,
  onDeleteEvent,
  onCreateEvent,
  allowCreateEvent = true,
  zIndex = 50,
  categoryFilterBadge = null,
  savedColorLabels,
}: EventDayModalProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string
    recurring: boolean
    title: string
  } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isOpen) setDeleteConfirm(null)
  }, [isOpen])

  if (!isOpen || !selectedDate) return null

  const confirmZ = zIndex + 80

  const confirmDialog =
    deleteConfirm && mounted
      ? createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-black/75 p-4"
            style={{ zIndex: confirmZ }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteConfirm(null)
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
          >
            <div
              className="w-full max-w-[400px] rounded-[20px] border-2 p-5 shadow-2xl"
              style={{
                backgroundColor: '#262626',
                borderColor: deleteConfirm.recurring ? '#F87171' : '#73FFA2',
                fontFamily: 'Poppins, sans-serif',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: deleteConfirm.recurring
                      ? 'rgba(248, 113, 113, 0.15)'
                      : 'rgba(115, 255, 162, 0.12)',
                  }}
                >
                  <ExclamationTriangleIcon
                    className="w-6 h-6"
                    style={{ color: deleteConfirm.recurring ? '#F87171' : '#73FFA2' }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4
                    id="delete-confirm-title"
                    className="text-base font-semibold text-white mb-2"
                  >
                    {deleteConfirm.recurring ? 'Eliminar serie recurrente' : 'Eliminar evento'}
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: '#B7B7B7' }}>
                    {deleteConfirm.recurring ? (
                      <>
                        <strong className="text-white/90">{deleteConfirm.title}</strong>
                        <br />
                        <br />
                        Se eliminará la <strong className="text-[#F87171]">serie completa</strong>:
                        desaparecerán todas las repeticiones (pasadas y futuras) de este evento en el
                        calendario.
                      </>
                    ) : (
                      <>
                        ¿Eliminar <strong className="text-white/90">{deleteConfirm.title}</strong>?
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2.5 rounded-full font-semibold text-sm transition-all hover:opacity-90"
                  style={{
                    backgroundColor: '#4A4A4A',
                    color: '#E5E5E5',
                    boxShadow: '0px 4px 4px 0px #00000040 inset',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteEvent(deleteConfirm.id)
                    setDeleteConfirm(null)
                  }}
                  className="px-4 py-2.5 rounded-full font-semibold text-sm transition-all hover:opacity-90"
                  style={{
                    backgroundColor: deleteConfirm.recurring ? '#DC2626' : '#73FFA2',
                    color: deleteConfirm.recurring ? '#FFFFFF' : '#2C3137',
                    boxShadow: '0px 4px 4px 0px #00000040 inset',
                  }}
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/80 p-4"
        style={{ zIndex }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="rounded-[25px] w-full max-w-md overflow-hidden border-2"
          style={{
            backgroundColor: '#262626',
            borderColor: '#73FFA2',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#4A4A4A] p-4">
            <h3
              className="min-w-0 flex-1 text-lg font-semibold leading-snug sm:text-xl"
              style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
            >
              {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
            </h3>
            <button
              onClick={onClose}
              className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              style={{ color: '#73FFA2' }}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {categoryFilterBadge ? (
            <div className="border-b border-[#4A4A4A]/80 px-4 py-3">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Filtrar por categoría
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5">
                <GlobeAltIcon className="h-4 w-4 shrink-0 text-[#66DEDB]/90" aria-hidden />
                <span
                  className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/25"
                  style={{ backgroundColor: categoryFilterBadge.hex }}
                />
                <span className="text-sm font-medium text-zinc-200">
                  {categoryFilterBadge.label}
                </span>
              </div>
            </div>
          ) : null}

          <div className="custom-scrollbar max-h-[60vh] overflow-y-auto p-4">
            {events.length === 0 ? (
              <p
                className="mb-4 text-sm text-gray-400"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {categoryFilterBadge
                  ? 'Ningún evento de esta categoría para este día.'
                  : 'No hay eventos para este día'}
              </p>
            ) : (
              <div className="space-y-3 pb-2">
                {events.map((event) => (
                  <EventCalendarRow
                    key={`${event.id}_${event.date}`}
                    event={event}
                    savedColorLabels={savedColorLabels}
                    actions={
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                            onEditEvent(event.id)
                          }}
                          className="text-[11px] font-semibold text-[#73FFA2] hover:underline sm:text-xs"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirm({
                              id: event.id,
                              recurring: event.repeatType !== 'NONE',
                              title: event.title,
                            })
                          }}
                          className="p-1 text-gray-400 transition-colors hover:text-red-400"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-[#4A4A4A] flex flex-col items-center gap-2">
            {allowCreateEvent ? (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onCreateEvent(selectedDate)
                }}
                className="w-auto px-5 py-2 font-semibold transition-all duration-300 hover:transform hover:scale-105 flex items-center justify-center gap-2 rounded-full"
                style={{
                  backgroundColor: '#73FFA2',
                  color: '#2C3137',
                  boxShadow: '0px 4px 4px 0px #00000040 inset',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                <span className="text-xl">+</span>
                Nuevo Evento
              </button>
            ) : (
              <p
                className="text-center text-sm px-2"
                style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}
              >
                No puedes crear eventos en fechas que ya pasaron. Puedes editar o eliminar los que ya existen
                en este día.
              </p>
            )}
          </div>
        </div>
      </div>
      {confirmDialog}
    </>
  )
}
