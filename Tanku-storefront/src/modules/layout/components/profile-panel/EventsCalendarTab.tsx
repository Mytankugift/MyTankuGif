"use client"

import React, { useState, useEffect } from 'react'
import { Calendar, Pencil, Trash, Plus } from "@medusajs/icons"
import { getUserEvents, UserEvent } from '../actions/get-user-events'
import { updateEventCalendar } from '../actions/update-event-calendar'
import { deleteEventCalendar } from '../actions/delete-event-calendar'

interface EventsCalendarTabProps {
  customerId: string
}

const EventsCalendarTab: React.FC<EventsCalendarTabProps> = ({ customerId }) => {
  const [events, setEvents] = useState<UserEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEvent, setEditingEvent] = useState<UserEvent | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Form states for editing
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editType, setEditType] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const eventTypes = [
    'Cumpleaños (Anual)',
    'Reunión',
    'Cita',
    'Recordatorio',
    'Celebración',
    'Trabajo',
    'Personal',
    'Otro'
  ]

  const loadEvents = async () => {
    try {
      setLoading(true)
      const userEvents = await getUserEvents(customerId)
      setEvents(userEvents || [])
    } catch (error) {
      console.error('Error al cargar eventos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (customerId) {
      loadEvents()
    }
  }, [customerId])

  const handleEditEvent = (event: UserEvent) => {
    setEditingEvent(event)
    setEditTitle(event.event_name)
    setEditDate(event.event_date.split('T')[0]) // Format date for input
    setEditType(event.location || 'Otro')
    setEditDescription(event.description || '')
  }

  const handleCancelEdit = () => {
    setEditingEvent(null)
    setEditTitle('')
    setEditDate('')
    setEditType('')
    setEditDescription('')
  }

  const handleUpdateEvent = async () => {
    if (!editingEvent || !editTitle.trim() || !editDate) {
      alert('El título y la fecha son obligatorios')
      return
    }

    setIsUpdating(true)
    try {
      await updateEventCalendar({
        id: editingEvent.id,
        event_name: editTitle.trim(),
        event_date: editDate,
        description: editDescription.trim() || undefined,
        event_type: editType
      })

      alert('¡Evento actualizado exitosamente!')
      handleCancelEdit()
      loadEvents() // Reload events
    } catch (error: any) {
      console.error('Error al actualizar evento:', error)
      alert(error.message || 'Error al actualizar el evento')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el evento "${eventName}"?`)) {
      return
    }

    try {
      await deleteEventCalendar(eventId)
      alert('¡Evento eliminado exitosamente!')
      loadEvents() // Reload events
    } catch (error: any) {
      console.error('Error al eliminar evento:', error)
      alert(error.message || 'Error al eliminar el evento')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getEventTypeEmoji = (type: string) => {
    const emojiMap: { [key: string]: string } = {
      'Cumpleaños (Anual)': '🎂',
      'Reunión': '👥',
      'Cita': '📅',
      'Recordatorio': '⏰',
      'Celebración': '🎉',
      'Trabajo': '💼',
      'Personal': '👤',
      'Otro': '📝'
    }
    return emojiMap[type] || '📝'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
        <span className="ml-2 text-white">Cargando eventos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-6 h-6 text-[#73FFA2]" />
        <h3 className="text-xl font-bold text-[#73FFA2]">MIS FECHAS ESPECIALES</h3>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-white text-lg font-medium mb-2">No hay fechas especiales</h4>
          <p className="text-gray-400 text-sm">Cuando agregues eventos, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              {editingEvent?.id === event.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#73FFA2] text-sm font-medium mb-2">
                        Título del Evento:
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#73FFA2]"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="block text-[#73FFA2] text-sm font-medium mb-2">
                        Fecha:
                      </label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#73FFA2]"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[#73FFA2] text-sm font-medium mb-2">
                      Tipo de Evento:
                    </label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#73FFA2]"
                    >
                      {eventTypes.map((type) => (
                        <option key={type} value={type}>
                          {getEventTypeEmoji(type)} {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#73FFA2] text-sm font-medium mb-2">
                      Descripción:
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 h-20 text-sm resize-none focus:outline-none focus:border-[#73FFA2]"
                      maxLength={300}
                      placeholder="Descripción opcional..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-500 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleUpdateEvent}
                      disabled={isUpdating || !editTitle.trim() || !editDate}
                      className="flex-1 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 px-4 py-2 rounded-lg font-bold text-sm hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getEventTypeEmoji(event.location || 'Otro')}</span>
                      <h4 className="text-white font-semibold text-lg">{event.event_name}</h4>
                    </div>
                    <p className="text-[#73FFA2] text-sm mb-1">
                      📅 {formatDate(event.event_date)}
                    </p>
                    {event.description && (
                      <p className="text-gray-300 text-sm">{event.description}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-2">
                      Tipo: {event.location || 'Otro'}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Editar evento"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id, event.event_name)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Eliminar evento"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EventsCalendarTab
