'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'
import { DeleteAccountModal } from './delete-account-modal'
import { useDeleteAccount } from '@/lib/hooks/use-delete-account'
import { useFriends } from '@/lib/hooks/use-friends'
import { BlockedUsersModal } from '@/components/friends/blocked-users-modal'
import type { ComponentType, ReactNode } from 'react'
import {
  GlobeAltIcon,
  GiftIcon,
  MapPinIcon,
  DocumentTextIcon,
  ListBulletIcon,
  UserGroupIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline'

function SettingsSwitch({
  on,
  disabled,
  onClick,
}: {
  on: boolean
  disabled?: boolean
  onClick: () => void | Promise<void>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${
        on ? 'bg-[#73FFA2]' : 'bg-[#3a3a3a]'
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function RowWithIcon({
  icon: Icon,
  title,
  description,
  trailing,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  trailing: ReactNode
}) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.06] py-3.5 last:border-0 sm:min-h-[56px] sm:items-center">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full bg-[#73FFA2]/12 text-[#73FFA2] sm:mt-0 sm:self-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="shrink-0">{trailing}</div>
    </div>
  )
}

/** Misma idea que el bloque “Eliminar cuenta”: tarjeta con borde y botón / enlace a ancho completo. */
function SettingsFullActionCard({
  icon: Icon,
  title,
  description,
  trailing,
  onClick,
  href,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  trailing?: ReactNode
  onClick?: () => void
  href?: string
}) {
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#73FFA2]/12 text-[#73FFA2]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold text-white">{title}</span>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {trailing != null && <div className="shrink-0 self-center">{trailing}</div>}
    </>
  )
  return (
    <div className="overflow-hidden rounded-[25px] border border-[#73FFA2]/25 bg-zinc-900/40 p-3">
      {href != null ? (
        <Link
          href={href}
          className="flex w-full min-w-0 items-center gap-3 rounded-[25px] text-inherit no-underline transition hover:opacity-95"
        >
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="flex w-full min-w-0 items-center gap-3 rounded-[25px] text-left transition hover:opacity-95"
        >
          {inner}
        </button>
      )}
    </div>
  )
}

interface PrivacySectionProps {
  onUpdate?: () => void
  design?: 'default' | 'settings'
}

export function PrivacySection({ onUpdate, design = 'default' }: PrivacySectionProps) {
  const { user, checkAuth, logout } = useAuthStore()
  const router = useRouter()
  const isSettings = design === 'settings'
  const [profilePublic, setProfilePublic] = useState(true)
  const [allowPublicWishlistsWhenPrivate, setAllowPublicWishlistsWhenPrivate] = useState(false)
  const [allowGiftShipping, setAllowGiftShipping] = useState(false)
  const [useMainAddressForGifts, setUseMainAddressForGifts] = useState(false)
  const [hasAddress, setHasAddress] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const { deleteAccount } = useDeleteAccount()
  const { blockedUsers, fetchBlockedUsers } = useFriends()
  const [blockedListLoading, setBlockedListLoading] = useState(true)

  const refreshBlockedUsers = useCallback(async () => {
    setBlockedListLoading(true)
    try {
      await fetchBlockedUsers()
    } finally {
      setBlockedListLoading(false)
    }
  }, [fetchBlockedUsers])

  useEffect(() => {
    if (!user?.id) {
      setBlockedListLoading(false)
      return
    }
    refreshBlockedUsers()
  }, [user?.id, refreshBlockedUsers])

  // Cargar configuración actual del perfil y direcciones
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return
      setIsLoading(true)
      try {
        // Cargar perfil
        const profileResponse = await apiClient.get<import('@/types/api-responses').UserProfileResponse>(API_ENDPOINTS.USERS.PROFILE.GET)
        
        // Cargar direcciones para verificar si hay alguna configurada
        const addressesResponse = await apiClient.get<Array<{ id: string; isGiftAddress: boolean; isDefaultShipping: boolean }>>(
          API_ENDPOINTS.USERS.ADDRESSES.LIST
        )
        
        const hasAnyAddress = addressesResponse.success && addressesResponse.data && addressesResponse.data.length > 0
        setHasAddress(hasAnyAddress || false)
        
        if (profileResponse.success && profileResponse.data) {
          // isPublic: true por defecto
          setProfilePublic(profileResponse.data.isPublic ?? true)
          
          // allowPublicWishlistsWhenPrivate: false por defecto
          setAllowPublicWishlistsWhenPrivate(profileResponse.data.allowPublicWishlistsWhenPrivate ?? false)
          
          // allowGiftShipping: true por defecto solo si hay dirección, sino usar el valor del perfil
          // Si no hay dirección, no puede estar activado
          if (hasAnyAddress) {
            setAllowGiftShipping(profileResponse.data.allowGiftShipping ?? true)
          } else {
            setAllowGiftShipping(false)
          }
          
          // useMainAddressForGifts: true por defecto si se configuró en el onboarding
          setUseMainAddressForGifts(profileResponse.data.useMainAddressForGifts ?? false)
        }
      } catch (error) {
        console.error('Error cargando perfil:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [user?.id])


  const handleSave = async () => {
    if (!user?.id) return
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
        isPublic: profilePublic,
        allowPublicWishlistsWhenPrivate,
        allowGiftShipping,
        useMainAddressForGifts,
      })

      if (response.success) {
        setSuccess(true)
        // Actualizar el estado del usuario
        await checkAuth()
        if (onUpdate) {
          onUpdate()
        }
        // Ocultar mensaje de éxito después de 3 segundos
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError('Error al guardar configuración de privacidad')
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuración de privacidad')
    } finally {
      setIsSaving(false)
    }
  }

  const shellClass = isSettings
    ? 'space-y-3 rounded-lg border border-[#414141]/90 bg-black/20 p-3 sm:p-4'
    : 'space-y-4 rounded-lg border-2 border-[#73FFA2] bg-transparent p-4 transition-colors hover:border-[#66DEDB]'
  return (
    <div className={shellClass}>
      <h3
        className={
          isSettings ? 'text-base font-semibold text-[#73FFA2]' : 'mb-4 text-lg font-semibold text-[#73FFA2]'
        }
      >
        Configuración de Privacidad
      </h3>
      {isSettings && (
        <p className="mb-2 text-xs text-gray-500">Controla la visibilidad, regalos y el uso de tus datos.</p>
      )}
      
      {error && (
        <div className="bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-400/30 text-green-400 px-4 py-2 rounded text-sm">
          Configuración guardada exitosamente
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando configuración...</p>
        </div>
      ) : (
        <div className={isSettings ? 'rounded-lg bg-black/20 p-0 sm:px-2' : 'contents'}>
          {/* Perfil público */}
          {isSettings ? (
            <RowWithIcon
              icon={GlobeAltIcon}
              title="Perfil Público"
              description="Permitir que otros usuarios vean tu perfil"
              trailing={
                <SettingsSwitch
                  on={profilePublic}
                  disabled={isSaving}
                  onClick={async () => {
                    const newValue = !profilePublic
                    setProfilePublic(newValue)
                    if (!newValue) {
                      setAllowPublicWishlistsWhenPrivate(false)
                    }
                    setIsSaving(true)
                    setError(null)
                    try {
                      const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
                        isPublic: newValue,
                        allowPublicWishlistsWhenPrivate: !newValue ? false : allowPublicWishlistsWhenPrivate,
                        allowGiftShipping,
                        useMainAddressForGifts,
                      })
                      if (response.success) {
                        await checkAuth()
                        if (onUpdate) {
                          onUpdate()
                        }
                      } else {
                        setError('Error al guardar configuración')
                        setProfilePublic(profilePublic)
                        if (!newValue) {
                          setAllowPublicWishlistsWhenPrivate(allowPublicWishlistsWhenPrivate)
                        }
                      }
                    } catch (err: any) {
                      setError(err.message || 'Error al guardar configuración')
                      setProfilePublic(profilePublic)
                      if (!newValue) {
                        setAllowPublicWishlistsWhenPrivate(allowPublicWishlistsWhenPrivate)
                      }
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                />
              }
            />
          ) : (
            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-white">Perfil Público</label>
                <p className="text-xs text-gray-400">Permitir que otros usuarios vean tu perfil</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const newValue = !profilePublic
                  setProfilePublic(newValue)
                  if (!newValue) {
                    setAllowPublicWishlistsWhenPrivate(false)
                  }
                  setIsSaving(true)
                  setError(null)
                  try {
                    const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
                      isPublic: newValue,
                      allowPublicWishlistsWhenPrivate: !newValue ? false : allowPublicWishlistsWhenPrivate,
                      allowGiftShipping,
                      useMainAddressForGifts,
                    })
                    if (response.success) {
                      await checkAuth()
                      if (onUpdate) {
                        onUpdate()
                      }
                    } else {
                      setError('Error al guardar configuración')
                      setProfilePublic(profilePublic)
                      if (!newValue) {
                        setAllowPublicWishlistsWhenPrivate(allowPublicWishlistsWhenPrivate)
                      }
                    }
                  } catch (err: any) {
                    setError(err.message || 'Error al guardar configuración')
                    setProfilePublic(profilePublic)
                    if (!newValue) {
                      setAllowPublicWishlistsWhenPrivate(allowPublicWishlistsWhenPrivate)
                    }
                  } finally {
                    setIsSaving(false)
                  }
                }}
                disabled={isSaving}
                className={`relative h-6 w-12 rounded-full transition-colors ${
                  profilePublic ? 'bg-[#73FFA2]' : 'bg-gray-600'
                } disabled:opacity-50`}
              >
                <span
                  className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    profilePublic ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Opción: wishlists públicas con perfil privado */}
          {!profilePublic &&
            (isSettings ? (
              <RowWithIcon
                icon={ListBulletIcon}
                title="Mantener wishlists públicas visibles"
                description="Usuarios no amigos podrán ver wishlists públicas aunque el perfil sea privado"
                trailing={
                  <SettingsSwitch
                    on={allowPublicWishlistsWhenPrivate}
                    disabled={isSaving}
                    onClick={async () => {
                      const newValue = !allowPublicWishlistsWhenPrivate
                      setAllowPublicWishlistsWhenPrivate(newValue)
                      setIsSaving(true)
                      setError(null)
                      try {
                        const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
                          isPublic: profilePublic,
                          allowPublicWishlistsWhenPrivate: newValue,
                          allowGiftShipping,
                          useMainAddressForGifts,
                        })
                        if (response.success) {
                          await checkAuth()
                          onUpdate?.()
                        } else {
                          setError('Error al guardar configuración')
                          setAllowPublicWishlistsWhenPrivate(allowPublicWishlistsWhenPrivate)
                        }
                      } catch (err: any) {
                        setError(err.message || 'Error al guardar configuración')
                        setAllowPublicWishlistsWhenPrivate(allowPublicWishlistsWhenPrivate)
                      } finally {
                        setIsSaving(false)
                      }
                    }}
                  />
                }
              />
            ) : (
              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="text-sm font-medium text-white">Mantener wishlists públicas visibles</label>
                  <p className="text-xs text-gray-400">
                    Los usuarios no amigos podrán ver tus wishlists públicas aunque tu perfil sea privado
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const newValue = !allowPublicWishlistsWhenPrivate
                    setAllowPublicWishlistsWhenPrivate(newValue)
                    setIsSaving(true)
                    setError(null)
                    try {
                      const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
                        isPublic: profilePublic,
                        allowPublicWishlistsWhenPrivate: newValue,
                        allowGiftShipping,
                        useMainAddressForGifts,
                      })
                      if (response.success) {
                        await checkAuth()
                        if (onUpdate) {
                          onUpdate()
                        }
                      } else {
                        setError('Error al guardar configuración')
                        setAllowPublicWishlistsWhenPrivate(allowPublicWishlistsWhenPrivate)
                      }
                    } catch (err: any) {
                      setError(err.message || 'Error al guardar configuración')
                      setAllowPublicWishlistsWhenPrivate(allowPublicWishlistsWhenPrivate)
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  disabled={isSaving}
                  className={`relative h-6 w-12 rounded-full transition-colors ${
                    allowPublicWishlistsWhenPrivate ? 'bg-[#73FFA2]' : 'bg-gray-600'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      allowPublicWishlistsWhenPrivate ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}

          {/* Preferencias de regalos */}
          <div
            className={
              isSettings
                ? 'space-y-0 border-t border-white/[0.08] pt-3'
                : 'space-y-4 border-t border-gray-600 pt-4'
            }
          >
            <h4
              className={
                isSettings
                  ? 'mb-1 text-sm font-semibold text-[#73FFA2]'
                  : 'text-sm font-semibold text-[#66DEDB]'
              }
            >
              Preferencias de Regalos
            </h4>

            {isSettings ? (
              <>
                <RowWithIcon
                  icon={GiftIcon}
                  title="Permitir recibir regalos"
                  description="Permite que tus amigos te envíen regalos desde tus wishlists"
                  trailing={
                    <SettingsSwitch
                      on={allowGiftShipping && hasAddress}
                      disabled={isSaving || !hasAddress}
                      onClick={async () => {
                        if (!hasAddress) {
                          setError('Necesitas configurar una dirección antes de permitir recibir regalos')
                          return
                        }
                        const newValue = !allowGiftShipping
                        setAllowGiftShipping(newValue)
                        setIsSaving(true)
                        setError(null)
                        try {
                          const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
                            isPublic: profilePublic,
                            allowGiftShipping: newValue,
                            useMainAddressForGifts: newValue ? useMainAddressForGifts : false,
                          })
                          if (response.success) {
                            if (!newValue) {
                              setUseMainAddressForGifts(false)
                            }
                            await checkAuth()
                            onUpdate?.()
                          } else {
                            setError('Error al guardar configuración')
                            setAllowGiftShipping(allowGiftShipping)
                          }
                        } catch (err: any) {
                          setError(err.message || 'Error al guardar configuración')
                          setAllowGiftShipping(allowGiftShipping)
                        } finally {
                          setIsSaving(false)
                        }
                      }}
                    />
                  }
                />
                {!hasAddress && (
                  <p className="pl-[52px] text-xs text-yellow-500/90">Necesitas una dirección en «Mis direcciones»</p>
                )}
                <RowWithIcon
                  icon={MapPinIcon}
                  title="Usar dirección principal para regalos"
                  description="Usa tu dirección de envío principal para recibir regalos"
                  trailing={
                    <SettingsSwitch
                      on={useMainAddressForGifts && allowGiftShipping}
                      disabled={isSaving || !allowGiftShipping}
                      onClick={async () => {
                        const newValue = !useMainAddressForGifts
                        setUseMainAddressForGifts(newValue)
                        setIsSaving(true)
                        setError(null)
                        try {
                          const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
                            isPublic: profilePublic,
                            allowGiftShipping,
                            useMainAddressForGifts: newValue,
                          })
                          if (response.success) {
                            await checkAuth()
                            onUpdate?.()
                          } else {
                            setError('Error al guardar configuración')
                            setUseMainAddressForGifts(useMainAddressForGifts)
                          }
                        } catch (err: any) {
                          setError(err.message || 'Error al guardar configuración')
                          setUseMainAddressForGifts(useMainAddressForGifts)
                        } finally {
                          setIsSaving(false)
                        }
                      }}
                    />
                  }
                />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <label className="text-sm font-medium text-white">Permitir recibir regalos</label>
                    <p className="text-xs text-gray-400">Permite que tus amigos te envíen regalos desde tus wishlists</p>
                    {!hasAddress && (
                      <p className="mt-1 text-xs text-yellow-400">Necesitas configurar una dirección primero</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!hasAddress) {
                        setError('Necesitas configurar una dirección antes de permitir recibir regalos')
                        return
                      }
                      const newValue = !allowGiftShipping
                      setAllowGiftShipping(newValue)
                      setIsSaving(true)
                      setError(null)
                      try {
                        const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
                          isPublic: profilePublic,
                          allowGiftShipping: newValue,
                          useMainAddressForGifts: newValue ? useMainAddressForGifts : false,
                        })
                        if (response.success) {
                          if (!newValue) {
                            setUseMainAddressForGifts(false)
                          }
                          await checkAuth()
                          if (onUpdate) {
                            onUpdate()
                          }
                        } else {
                          setError('Error al guardar configuración')
                          setAllowGiftShipping(allowGiftShipping)
                        }
                      } catch (err: any) {
                        setError(err.message || 'Error al guardar configuración')
                        setAllowGiftShipping(allowGiftShipping)
                      } finally {
                        setIsSaving(false)
                      }
                    }}
                    disabled={isSaving || !hasAddress}
                    className={`relative h-6 w-12 rounded-full transition-colors ${
                      allowGiftShipping && hasAddress ? 'bg-[#73FFA2]' : 'bg-gray-600'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        allowGiftShipping && hasAddress ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <label className="text-sm font-medium text-white">Usar dirección principal para regalos</label>
                    <p className="text-xs text-gray-400">Usa tu dirección de envío principal para recibir regalos</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const newValue = !useMainAddressForGifts
                      setUseMainAddressForGifts(newValue)
                      setIsSaving(true)
                      setError(null)
                      try {
                        const response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, {
                          isPublic: profilePublic,
                          allowGiftShipping,
                          useMainAddressForGifts: newValue,
                        })
                        if (response.success) {
                          await checkAuth()
                          if (onUpdate) {
                            onUpdate()
                          }
                        } else {
                          setError('Error al guardar configuración')
                          setUseMainAddressForGifts(useMainAddressForGifts)
                        }
                      } catch (err: any) {
                        setError(err.message || 'Error al guardar configuración')
                        setUseMainAddressForGifts(useMainAddressForGifts)
                      } finally {
                        setIsSaving(false)
                      }
                    }}
                    disabled={isSaving || !allowGiftShipping}
                    className={`relative h-6 w-12 rounded-full transition-colors ${
                      useMainAddressForGifts && allowGiftShipping ? 'bg-[#73FFA2]' : 'bg-gray-600'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        useMainAddressForGifts && allowGiftShipping ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Usuarios bloqueados — se abre en modal */}
          {isSettings ? (
            <div className="mt-1 space-y-2">
              <SettingsFullActionCard
                icon={UserGroupIcon}
                title="Usuarios bloqueados"
                description="Gestionar lista y desbloquear cuando quieras"
                onClick={() => setShowBlockedModal(true)}
                trailing={
                  <span className="rounded-[25px] bg-white/10 px-2.5 py-0.5 text-xs font-medium text-gray-200">
                    {blockedListLoading ? '…' : blockedUsers.length}
                  </span>
                }
              />
              <SettingsFullActionCard
                icon={DocumentTextIcon}
                title="Términos y condiciones"
                description="Cómo usamos y protegemos tus datos en Tanku"
                href="/terms?from=settings-privacy"
              />
              <SettingsFullActionCard
                icon={AdjustmentsHorizontalIcon}
                title="Modificar preferencias"
                description="Intereses y actividades (onboarding)"
                onClick={() => setShowOnboardingModal(true)}
              />
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-600">
              <button
                type="button"
                onClick={() => setShowBlockedModal(true)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-white/[0.04]"
              >
                <div>
                  <span className="text-sm font-semibold text-[#66DEDB]">Usuarios bloqueados</span>
                  <p className="mt-0.5 text-xs text-gray-400">Gestionar lista y desbloquear cuando quieras</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.08] px-2.5 py-0.5 text-xs font-medium text-gray-300">
                  {blockedListLoading ? '…' : blockedUsers.length}
                </span>
              </button>
            </div>
          )}

          {!isSettings && (
            <div className="pt-4 border-t border-gray-600">
              <p className="mb-2 text-xs text-gray-400">
                Para más información sobre cómo manejamos tus datos, consulta nuestros:
              </p>
              <Link
                href="/terms"
                className="inline-flex items-center gap-1 text-sm text-[#73FFA2] transition-colors hover:text-[#66DEDB]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Términos y Condiciones
              </Link>
            </div>
          )}

          {/* Preferencias de onboarding (solo categorías y actividades) — en settings van en el bloque .space-y-2 de arriba */}
          {!isSettings ? (
            <div className="border-t border-gray-600 pt-4">
              <button
                type="button"
                onClick={() => setShowOnboardingModal(true)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[#73FFA2] transition-colors hover:bg-[#73FFA2]/10 hover:text-[#66DEDB]"
              >
                <svg
                  className="h-5 w-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2v20M2 12h20" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <div>
                  <span className="text-sm font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Modificar preferencias
                  </span>
                  <p className="text-xs text-gray-500">Intereses y actividades (onboarding)</p>
                </div>
              </button>
            </div>
          ) : null}

          {/* Cerrar sesión: solo en vista clásica (en modal nuevo está en la barra lateral) */}
          {!isSettings && (
            <div className="pt-4 border-t border-gray-600">
              <button
                type="button"
                onClick={() => {
                  logout()
                  router.push('/')
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span className="font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Cerrar sesión
                </span>
              </button>
            </div>
          )}

          {/* Botón de eliminar cuenta */}
          <div
            className={
              isSettings
                ? 'mt-1 overflow-hidden rounded-[25px] border border-red-500/35 bg-red-950/30 p-3'
                : 'border-t border-red-500/30 pt-4'
            }
          >
            <button
              type="button"
              onClick={() => setShowDeleteAccountModal(true)}
              className="flex w-full items-center gap-3 rounded-[25px] text-left text-red-300 transition-colors hover:text-red-200"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/25 text-red-400">
                <TrashIcon className="h-4 w-4" />
              </span>
              <div>
                <span className="text-sm font-semibold">Eliminar Cuenta</span>
                <p className="text-xs text-red-200/60">Esta acción es permanente e irreversible</p>
              </div>
            </button>
            {!isSettings && <p className="mt-1 px-2 text-xs text-gray-400">Esta acción es permanente e irreversible</p>}
          </div>
        </div>
      )}

      {/* Modal de onboarding */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        onlySteps={[2, 3]}
        onClose={() => setShowOnboardingModal(false)}
        onComplete={() => {
          setShowOnboardingModal(false)
          if (onUpdate) {
            onUpdate()
          }
        }}
      />

      <BlockedUsersModal
        open={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        blockedUsers={blockedUsers}
        isLoading={blockedListLoading}
        onRefresh={refreshBlockedUsers}
      />

      {/* Modal de eliminar cuenta */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={async () => {
          await deleteAccount()
          setShowDeleteAccountModal(false)
        }}
      />
    </div>
  )
}

