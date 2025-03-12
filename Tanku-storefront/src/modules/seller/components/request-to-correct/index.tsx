import { Button } from "@medusajs/ui"
import Link from "next/link"
import React from "react"

const RequestNeedsCorrection = ({ comment }: { comment: string }) => {
  return (
    <div className="flex justify-center  py-10 h-[50vh]">
      <div className="bg-white p-6 rounded-lg  max-w-6xl text-center">
        <h2 className="text-2xl font-bold text-yellow-600">
          ⚠️ ¡Solicitud en Revisión! ✍️
        </h2>
        <p className="mt-4 text-gray-700">
          Hemos revisado tu solicitud en <strong>Tanku</strong> y necesitamos
          algunos ajustes antes de continuar. 🛠️
        </p>
        <p className="mt-2 text-gray-600">
          Por favor, revisa los siguientes detalles y corrige tu solicitud:
        </p>
        <div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 text-left">
          {comment}
        </div>
        <p className="my-4 font-semibold">
          Una vez corregido, vuelve a enviarla. ¡Gracias! 🙌
        </p>

        <Link href={"/account"} className="mt-">
          <Button size="base">Volver a mi cuenta</Button>
        </Link>
      </div>
    </div>
  )
}

export default RequestNeedsCorrection
