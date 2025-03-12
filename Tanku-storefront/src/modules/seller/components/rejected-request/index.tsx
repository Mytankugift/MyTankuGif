import { Button } from "@medusajs/ui"
import Link from "next/link"
import React from "react"

const RequestRejected = ({ comment }: { comment: string }) => {
  return (
    <div className="flex justify-center py-10 h-[50vh]">
      <div className="bg-white p-6 rounded-lg  max-w-6xl text-center">
        <h2 className="text-2xl font-bold text-red-600">
          ❌ Solicitud Rechazada
        </h2>
        <p className="mt-4 text-gray-700">
          Lamentamos informarte que tu solicitud en <strong>Tanku</strong> no ha
          sido aprobada en esta ocasión. 😞
        </p>
        <p className="mt-2 text-gray-600">
          Queremos agradecerte por tu interés y esfuerzo. 💙
        </p>
        <div className="mt-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-left">
          {comment}
        </div>
        <p className="my-4 font-semibold">
          No te desanimes, puedes intentarlo nuevamente en el futuro. ¡Te
          esperamos! 🚀
        </p>
        <Link href={"/account"} className="mt-">
          <Button size="base">Volver a mi cuenta</Button>
        </Link>
      </div>
    </div>
  )
}

export default RequestRejected
