"use client"

import React, { useState } from 'react'
import { Calendar } from "@medusajs/icons"

interface CalendarEventFormProps {
  onClose: () => void
  onEventCreated?: () => void
}

const CalendarEventForm: React.FC<CalendarEventFormProps> = ({ onClose, onEventCreated }) => {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [eventType, setEventType] = useState('Cumpleaños (Anual)')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('El título del evento es obligatorio')
      return
    }

    if (!date) {
      alert('La fecha del evento es obligatoria')
      return
    }

    setIsSubmitting(true)
    
    try {
      // TODO: Implement API call to save event
      console.log('Saving event:', {
        title: title.trim(),
        date,
        eventType,
        description: description.trim()
      })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      alert('¡Evento creado exitosamente!')
      onEventCreated?.()
      handleClose()
    } catch (error) {
      console.error('Error creating event:', error)
      alert('Error al crear el evento. Por favor, inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setDate('')
    setEventType('Cumpleaños (Anual)')
    setDescription('')
    onClose()
  }

  return (
    <div className="max-w-2xl mx-auto p-3 sm:p-4 md:p-6">
      <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#73FFA2]" />
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#73FFA2]">CREAR NUEVO EVENTO</h2>
        </div>

        {/* Form Fields */}
        <div className="space-y-3 sm:space-y-4">
          {/* Título del Evento */}
          <div>
            <label className="flex items-center gap-1 sm:gap-2 text-[#73FFA2] text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              <span className="text-pink-400">📝</span>
              TÍTULO DEL EVENTO:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Mi cumpleaños, Aniversario..."
              className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-[#73FFA2] transition-colors placeholder-gray-400"
              maxLength={100}
            />
          </div>

          {/* Date and Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Fecha del Evento */}
            <div>
              <label className="flex items-center gap-1 sm:gap-2 text-[#73FFA2] text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                <span className="text-purple-400">📅</span>
                FECHA DEL EVENTO:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-[#73FFA2] transition-colors"
              />
            </div>

            {/* Tipo de Evento */}
            <div>
              <label className="flex items-center gap-1 sm:gap-2 text-[#73FFA2] text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                <span className="text-yellow-400">🎯</span>
                TIPO DE EVENTO:
              </label>
              <div className="relative">
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-[#73FFA2] transition-colors appearance-none cursor-pointer"
                >
                  {eventTypes.map((type) => (
                    <option key={type} value={type} className="bg-gray-800">
                      🎂 {type}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="flex items-center gap-1 sm:gap-2 text-[#73FFA2] text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              <span className="text-blue-400">📄</span>
              DESCRIPCIÓN:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu evento (opcional)"
              className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 h-20 sm:h-24 text-sm sm:text-base resize-none focus:outline-none focus:border-[#73FFA2] transition-colors placeholder-gray-400"
              maxLength={300}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !date}
            className="flex-1 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 px-4 sm:px-6 py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base md:text-lg hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'GUARDANDO...' : 'GUARDAR EVENTO'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CalendarEventForm
