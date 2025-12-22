import { deleteLineItem } from "@lib/data/cart"
import { Spinner, Trash } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useState } from "react"
import { deleteLineItemCustom } from "@lib/data/cart-custom"
import { useRouter } from "next/navigation"

const DeleteButton = ({
  id,
  children,
  className,
}: {
  id: string
  children?: React.ReactNode
  className?: string
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      // Intentar primero con el método personalizado (más confiable)
      await deleteLineItemCustom(id)
      // Emitir evento para que los componentes actualicen el carrito sin recargar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cartUpdated'))
      }
      // Usar router.refresh() que solo actualiza los datos del servidor sin recargar toda la página
      router.refresh()
    } catch (customErr: any) {
      console.error("Error con método personalizado:", customErr)
      try {
        // Si falla el método personalizado, intentar con el estándar
        await deleteLineItem(id)
        // Emitir evento para que los componentes actualicen el carrito sin recargar
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cartUpdated'))
        }
        // Usar router.refresh() que solo actualiza los datos del servidor sin recargar toda la página
        router.refresh()
      } catch (err: any) {
        console.error("Error con método estándar:", err)
        setIsDeleting(false)
        alert("Error al eliminar el producto. Por favor intenta de nuevo.")
      }
    }
  }

  return (
    <div
      className={clx(
        "flex items-center justify-between text-small-regular",
        className
      )}
    >
      <button
        className="flex gap-x-1 cursor-pointer"
        onClick={() => handleDelete(id)}
      >
        {isDeleting ? <Spinner className="animate-spin" /> : <Trash className="text-[#E73230]" />}
        <span>{children}</span>
      </button>
    </div>
  )
}

export default DeleteButton
