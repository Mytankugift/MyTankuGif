"use client"

import { useEffect } from "react"

interface RedirectTabProps {
  token: string
}

export default function RedirectTab({ token }: RedirectTabProps) {
  useEffect(() => {
    // Abre una nueva pestaña con la URL deseada
    const newTab = window.open(`./authWordpress/${token}`, "_blank")
    
    // Enfoca la nueva pestaña (algunos navegadores pueden bloquear esto por políticas de seguridad)
    if (newTab) {
      newTab.focus()
    }
  }, [token]) // Solo se ejecuta cuando el token cambia

  // Este componente no renderiza nada visible
  return null
}
