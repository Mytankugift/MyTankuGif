'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { AddressDTO, CreateAddressDTO, UpdateAddressDTO } from '@/types/api'

export function useAddresses() {
  const [addresses, setAddresses] = useState<AddressDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAddresses = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<AddressDTO[]>(
        API_ENDPOINTS.USERS.ADDRESSES.LIST
      )
      if (response.success && response.data) {
        setAddresses(response.data)
      } else {
        setError(response.error?.message || 'Error al cargar direcciones')
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar direcciones')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createAddress = useCallback(async (data: CreateAddressDTO) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.post<AddressDTO>(
        API_ENDPOINTS.USERS.ADDRESSES.CREATE,
        data
      )
      if (response.success && response.data) {
        setAddresses((prev) => [...prev, response.data!])
        return response.data
      } else {
        throw new Error(response.error?.message || 'Error al crear dirección')
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear dirección')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateAddress = useCallback(async (addressId: string, data: UpdateAddressDTO) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.put<AddressDTO>(
        API_ENDPOINTS.USERS.ADDRESSES.UPDATE(addressId),
        data
      )
      if (response.success && response.data) {
        setAddresses((prev) =>
          prev.map((addr) => (addr.id === addressId ? response.data! : addr))
        )
        return response.data
      } else {
        throw new Error(response.error?.message || 'Error al actualizar dirección')
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar dirección')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteAddress = useCallback(async (addressId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.delete<void>(
        API_ENDPOINTS.USERS.ADDRESSES.DELETE(addressId)
      )
      if (response.success) {
        // Actualizar estado local inmediatamente
        setAddresses((prev) => prev.filter((addr) => addr.id !== addressId))
        // Refrescar desde el servidor para asegurar sincronización
        await fetchAddresses()
      } else {
        throw new Error(response.error?.message || 'Error al eliminar dirección')
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar dirección')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [fetchAddresses])

  return {
    addresses,
    isLoading,
    error,
    fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
  }
}

