"use client"

import { ReactNode, useState, useEffect, useContext , createContext} from "react"


interface Props {
  children: ReactNode
}

interface StoreContextType {
  storeId: string
  setStoreId: (id: string) => void
  getStoreId: () => string | null
}

export const StoreContext = createContext<StoreContextType | null>(null)

export function StoreContextProvider({ children }: Props) {
  const [storeId, setStoreId] = useState<string>("")
  const handleSetStoreId = (id: string) => {
    setStoreId(id)
  }

  const getStoreId = () => {
    return storeId
  }

 

  const contextValue: StoreContextType = {
    storeId,
    setStoreId: handleSetStoreId,
    getStoreId,
    
  }

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  )
}


export const useStoreTanku = () => {
  const context = useContext(StoreContext)

  if (context === null) {
    throw new Error("useStore debe ser usado dentro de un StoreProvider")
  }

  return context
}

