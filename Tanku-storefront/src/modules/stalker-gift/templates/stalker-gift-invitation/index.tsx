"use client"

import { useState, useEffect } from "react"
import { getStalkerGiftById, StalkerGiftData } from "../../actions/get-stalker-gift"
import StalkerGiftDisplay from "../../components/stalker-gift-display"

interface StalkerGiftInvitationProps {
  stalkerGiftId: string
}

export default function StalkerGiftInvitation({ stalkerGiftId }: StalkerGiftInvitationProps) {
  const [stalkerGift, setStalkerGift] = useState<StalkerGiftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStalkerGift = async () => {
      try {
        
        const data = await getStalkerGiftById(stalkerGiftId)
        
        if (!data) {
          setError("Regalo no encontrado o no válido")
          return
        }
        
        setStalkerGift(data)
      } catch (err) {
        console.error('Error fetching StalkerGift:', err)
        setError("Error al cargar el regalo")
      } finally {
        setLoading(false)
      }
    }

    if (stalkerGiftId) {
      fetchStalkerGift()
    }
  }, [stalkerGiftId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E1E1E] via-[#262626] to-[#1E1E1E] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#81007F] mb-4"></div>
          <p className="text-white text-lg">Cargando tu regalo sorpresa...</p>
        </div>
      </div>
    )
  }

  if (error || !stalkerGift) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E1E1E] via-[#262626] to-[#1E1E1E] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-white mb-4">Oops...</h1>
          <p className="text-gray-300 mb-6">
            {error || "No pudimos encontrar este regalo. Verifica que el enlace sea correcto."}
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-[#81007F] to-[#FE9600] text-white px-6 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Ir a MyTanku
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E1E1E] via-[#262626] to-[#1E1E1E]">
      <StalkerGiftDisplay 
        stalkerGift={stalkerGift}
      />
    </div>
  )
}
