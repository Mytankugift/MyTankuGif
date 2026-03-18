'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { XMarkIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { CalendarEvent } from '@/lib/hooks/use-events'
import { normalizeEventColor } from '@/lib/event-colors'

export interface EventDayModalProps {
  isOpen: boolean
  selectedDate: Date | null
  events: CalendarEvent[]
  onClose: () => void
  onEditEvent: (eventId: string) => void
  onDeleteEvent: (eventId: string) => void
  onCreateEvent: () => void
  zIndex?: number
}

export function EventDayModal({
  isOpen,
  selectedDate,
  events,
  onClose,
  onEditEvent,
  onDeleteEvent,
  onCreateEvent,
  zIndex = 50,
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
          <div className="flex items-center justify-between p-4 border-b border-[#4A4A4A]">
            <h3
              className="text-xl font-semibold"
              style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
            >
              {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
              style={{ color: '#73FFA2' }}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {events.length === 0 ? (
              <p className="text-gray-400 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                No hay eventos para este día
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                {events.map((event) => (
                  <div
                    key={`${event.id}_${event.date}`}
                    className="p-3 rounded-lg border border-l-4 pl-3"
                    style={{
                      backgroundColor: 'rgba(217, 217, 217, 0.1)',
                      borderColor: '#4A4A4A',
                      borderLeftColor: normalizeEventColor(event.color),
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-semibold mb-1"
                          style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}
                        >
                          {event.title}
                        </h4>
                        {event.description && (
                          <p
                            className="text-sm mb-2"
                            style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}
                          >
                            {event.description}
                          </p>
                        )}
                        <div
                          className="flex gap-2 text-xs"
                          style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}
                        >
                          {event.repeatType !== 'NONE' && (
                            <span>Repite: {event.repeatType}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            onClose()
                            onEditEvent(event.id)
                          }}
                          className="text-sm font-semibold transition-all duration-300 hover:opacity-80"
                          style={{
                            color: '#73FFA2',
                            fontFamily: 'Poppins, sans-serif',
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              id: event.id,
                              recurring: event.repeatType !== 'NONE',
                              title: event.title,
                            })
                          }
                          className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-[#4A4A4A] flex justify-center">
            <button
              onClick={() => {
                onClose()
                onCreateEvent()
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
          </div>
        </div>
      </div>
      {confirmDialog}
    </>
  )
}
