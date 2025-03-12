import { Button } from "@medusajs/ui"
import Link from "next/link"
import React from "react"

const RequestInPending = () => {
  return (
    <div className="flex justify-center py-10 h-[50vh]">
      <div className="bg-white p-6 rounded-lg  max-w-6xl text-center">
        <h2 className="text-2xl font-bold text-green-600">
          🎉 ¡Gracias por tu solicitud! 🚀
        </h2>
        <p className="mt-4 text-gray-700">
          Estamos revisando tu solicitud para formar parte de{" "}
          <strong>Tanku</strong>. 🌟
        </p>
        <p className="mt-2 text-gray-600">
          Tu participación ayudará a hacer realidad los sueños de muchas
          personas. ✨
        </p>
        <p className="my-4 font-semibold">
          Su solicitud fue enviada con éxito. ✅
        </p>
        <Link href={"/account"} className="mt-">
          <Button size="base">Volver a mi cuenta</Button>
        </Link>
      </div>
    </div>
  )
}

export default RequestInPending
