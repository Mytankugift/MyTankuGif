"use client"

import { useState, useRef, useEffect } from "react"

export default function StalkerGiftTab() {

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#73FFA2] mb-4">#StalkerGift</h2>
        <p className="text-gray-300 text-lg">
          Descubre la funcionalidad StalkerGift de TANKU
        </p>
      </div>

      {/* Video Player */}
      <div className="bg-black rounded-2xl overflow-hidden mb-6">
        <video
          className="w-full h-auto"
          controls
          preload="metadata"
        >
          <source src="/funcionalidadtdes/TANKU - StalkerGift.mp4" type="video/mp4" />
          Tu navegador no soporta el elemento de video.
        </video>
      </div>

      {/* Construction Notice */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-4">🚧</div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">
          Seccion en Construcción
        </h3>
        <p className="text-gray-300">
          La funcionalidad StalkerGift está actualmente en desarrollo. 
          ¡Pronto estará disponible para todos los usuarios!
        </p>
      </div>
    </div>
  )
}
