import { Button } from "@medusajs/ui"
import Link from "next/link"
import React from "react"

const RequestInPending = () => {
  return (
    <div className="flex justify-center py-10 h-[50vh]">
      <div className="bg-gray-800 border-2 border-[#3B9BC3] p-6 rounded-lg max-w-6xl text-center">
        <h2 className="text-2xl font-bold text-[#66DEDB]">
          🎉 ¡Gracias por tu solicitud! 🚀
        </h2>
        <p className="mt-4 text-white">
          Estamos revisando tu solicitud para formar parte de{" "}
          <strong className="text-[#73FFA2]">Tanku</strong>. 🌟
        </p>
        <p className="mt-2 text-gray-300">
          Tu participación ayudará a hacer realidad los sueños de muchas
          personas. ✨
        </p>
        <p className="my-4 font-semibold text-[#73FFA2]">
          Su solicitud fue enviada con éxito. ✅
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

export default RequestInPending
