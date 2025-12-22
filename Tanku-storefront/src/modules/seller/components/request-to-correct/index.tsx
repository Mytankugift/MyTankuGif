import { Button } from "@medusajs/ui"
import Link from "next/link"
import React from "react"

const RequestNeedsCorrection = ({ comment }: { comment: string }) => {
  return (
    <div className="flex justify-center py-10 h-[50vh]">
      <div className="bg-gray-800 border-2 border-[#3B9BC3] p-6 rounded-lg max-w-6xl text-center">
        <h2 className="text-2xl font-bold text-[#66DEDB]">
          ⚠️ ¡Solicitud en Revisión! ✍️
        </h2>
        <p className="mt-4 text-white">
          Hemos revisado tu solicitud en <strong className="text-[#73FFA2]">Tanku</strong> y necesitamos
          algunos ajustes antes de continuar. 🛠️
        </p>
        <p className="mt-2 text-gray-300">
          Por favor, revisa los siguientes detalles y corrige tu solicitud:
        </p>
        <div className="mt-4 p-3 bg-gray-700 border-l-4 border-[#66DEDB] text-white text-left">
          {comment}
        </div>
        <p className="my-4 font-semibold text-[#73FFA2]">
          Una vez corregido, vuelve a enviarla. ¡Gracias! 🙌
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

export default RequestNeedsCorrection
