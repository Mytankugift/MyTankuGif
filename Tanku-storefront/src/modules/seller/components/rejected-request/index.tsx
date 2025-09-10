import { Button } from "@medusajs/ui"
import Link from "next/link"
import React from "react"

const RequestRejected = ({ comment }: { comment: string }) => {
  return (
    <div className="flex justify-center py-10 h-[50vh]">
      <div className="bg-gray-800 border-2 border-[#3B9BC3] p-6 rounded-lg max-w-6xl text-center">
        <h2 className="text-2xl font-bold text-[#66DEDB]">
          ❌ Solicitud Rechazada
        </h2>
        <p className="mt-4 text-white">
          Lamentamos informarte que tu solicitud en <strong className="text-[#73FFA2]">Tanku</strong> no ha
          sido aprobada en esta ocasión. 😞
        </p>
        <p className="mt-2 text-gray-300">
          Queremos agradecerte por tu interés y esfuerzo. 💙
        </p>
        <div className="mt-4 p-3 bg-gray-700 border-l-4 border-red-400 text-red-300 text-left">
          {comment}
        </div>
        <p className="my-4 font-semibold text-[#73FFA2]">
          No te desanimes, puedes intentarlo nuevamente en el futuro. ¡Te
          esperamos! 🚀
        </p>
        <Link href={"/account"} className="mt-">
          <Button size="base" className="bg-[#73FFA2] text-gray-900 hover:bg-[#66e891]">
            Volver a mi cuenta
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default RequestRejected
