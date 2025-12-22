"use client" // include with Next.js 13+

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState,
} from "react"
import { HttpTypes } from "@medusajs/types"
import { sdk } from "@lib/config"

type RegionContextType = {
  region?: HttpTypes.StoreRegion
  setRegion: React.Dispatch<
    React.SetStateAction<HttpTypes.StoreRegion | undefined>
  >
}

const RegionContext = createContext<RegionContextType | null>(null)

type RegionProviderProps = {
  children: React.ReactNode
}

export const RegionProvider = ({ children }: RegionProviderProps) => {
  const [region, setRegion] = useState<
    HttpTypes.StoreRegion
  >()

  useEffect(() => {
    if (region) {
      // set its ID in the local storage in
      // case it changed
      localStorage.setItem("region_id", region.id)
      return
    }

    const regionId = localStorage.getItem("region_id")
    if (!regionId) {
      // retrieve regions and select the first one
      sdk.store.region.list()
      .then(({ regions }) => {
        setRegion(regions[0])
      })
      .catch((error: any) => {
        // Solo mostrar error si no es un error de red esperado
        if (error?.message && !error.message.includes('Failed to fetch')) {
          console.warn("Failed to load regions:", error?.message || error)
        }
      })
    } else {
      // retrieve selected region
      sdk.store.region.retrieve(regionId)
      .then(({ region: dataRegion }) => {
        setRegion(dataRegion)
      })
      .catch((error: any) => {
        // Solo mostrar error si no es un error de red esperado o 404
        if (error?.message && !error.message.includes('Failed to fetch') && !error.message.includes('404')) {
          console.warn("Failed to retrieve stored region:", error?.message || error)
        }
        // Clear invalid region ID from localStorage
        localStorage.removeItem("region_id")
        // Fall back to loading the first available region
        sdk.store.region.list()
        .then(({ regions }) => {
          if (regions && regions.length > 0) {
            setRegion(regions[0])
          }
        })
        .catch((fallbackError: any) => {
          // Solo mostrar error si no es un error de red esperado
          if (fallbackError?.message && !fallbackError.message.includes('Failed to fetch')) {
            console.warn("Failed to load fallback regions:", fallbackError?.message || fallbackError)
          }
        })
      })
    }
  }, [region])

  return (
    <RegionContext.Provider value={{
      region,
      setRegion,
    }}>
      {children}
    </RegionContext.Provider>
  )
}

export const useRegion = () => {
  const context = useContext(RegionContext)

  if (!context) {
    throw new Error("useRegion must be used within a RegionProvider")
  }

  return context
}