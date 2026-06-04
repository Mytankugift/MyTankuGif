'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import * as React from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { getAgeInYearsFromParts, isAdultFromBirthParts } from '@/lib/utils/age-policy'
import { OnboardingAdultConfirmMiniModal } from '@/components/onboarding/onboarding-adult-confirm-mini-modal'
import { ColombiaPhoneInput } from '@/components/ui/colombia-phone-input'
import {
  formatColombiaPhoneDisplay,
  isValidColombiaPhone,
  normalizeColombiaPhone,
} from '@/lib/utils/colombia-phone'
import { CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline'
import {
  tankuSettingsFieldCardClass,
  tankuSettingsSectionShellClass,
} from '@/lib/tanku-modal-panel'

function phoneForForm(raw: string | null | undefined): string {
  return normalizeColombiaPhone(raw) || ''
}

function onboardingBirthToIso(birthDate: unknown): string {
  if (birthDate == null) return ''
  if (typeof birthDate === 'string') {
    const dayPart = birthDate.split('T')[0]
    const parts = dayPart.split('-').map(Number)
    if (parts.length >= 3) {
      const [y, m, d] = parts
      if (![y, m, d].some(Number.isNaN) && y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      }
    }
  }
  if (birthDate instanceof Date && !Number.isNaN(birthDate.getTime())) {
    const y = birthDate.getFullYear()
    const m = birthDate.getMonth() + 1
    const d = birthDate.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  return ''
}

interface PersonalInfoSectionProps {
  onUpdate?: () => void
  /** Tarjetas oscuras y tipografía alineada al modal de configuración */
  design?: 'default' | 'settings'
}

/** Fuera del cuerpo de PersonalInfoSection: si se define dentro, cada render crea un tipo nuevo de componente y React remonta el árbol (inputs pierden foco al teclear). */
function PersonalInfoFieldBlock({
  isSettings,
  cardClassName,
  children,
}: {
  isSettings: boolean
  cardClassName: string
  children: React.ReactNode
}) {
  if (isSettings) return <div className={cardClassName}>{children}</div>
  return <div className="space-y-2">{children}</div>
}

/** Configuración: mismo aspecto en vista y edición (píldoras compactas). */
const fieldCardSettings = tankuSettingsFieldCardClass
const inpSettings =
  'h-9 min-h-9 w-full min-w-0 rounded-[20px] border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#73FFA2]/35'
const valueRowSettings =
  'mt-1 flex min-h-9 w-full min-w-0 items-center rounded-[20px] border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white'
const valueRowSettingsBio =
  'mt-1 flex min-h-[4.5rem] w-full min-w-0 items-start rounded-[20px] border border-white/10 bg-black/30 px-3 py-2 text-sm text-white'
const textAreaSettings =
  'min-h-[4.5rem] w-full resize-y rounded-[20px] border border-white/10 bg-black/30 px-3 py-2 text-sm leading-snug text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#73FFA2]/35'
const editIconBtnSettings =
  'shrink-0 rounded-[20px] border border-white/10 bg-black/30 p-1.5 text-gray-400 transition hover:border-[#73FFA2]/30 hover:text-[#73FFA2]'

export function PersonalInfoSection({ onUpdate, design = 'default' }: PersonalInfoSectionProps) {
  const isSettings = design === 'settings'
  const { user, checkAuth } = useAuthStore()
  const { getOnboardingData, updateOnboardingData } = useOnboarding()
  const [birthDateIso, setBirthDateIso] = useState('')
  const [showAdultBirthConfirm, setShowAdultBirthConfirm] = useState(false)
  const [pendingBirthIso, setPendingBirthIso] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  /** En modal de configuración: un solo lapiz para editar todo el bloque a la vez. */
  const [settingsBulkEdit, setSettingsBulkEdit] = useState(false)
  /** Fecha al abrir edición masiva; la confirmación de edad solo aplica si cambió. */
  const birthDateAtBulkEditStartRef = useRef('')
  const [formData, setFormData] = useState({
    username: user?.username || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    bio: user?.profile?.bio || '',
  })

  // Cargar información completa del usuario para obtener el teléfono
  useEffect(() => {
    const loadUserData = async () => {
      if (user?.id) {
        try {
          const response = await apiClient.get<import('@/types/api-responses').UserMeResponse | { user: import('@/types/api-responses').UserMeResponse; addresses: any[] }>(API_ENDPOINTS.USERS.ME)
          if (response.success && response.data) {
            const responseData = response.data as any
            // El endpoint devuelve { user: {...}, addresses: [...] }
            const userData = responseData.user || responseData
            setFormData({
              username: userData.username || user?.username || '',
              firstName: userData.firstName || user?.firstName || '',
              lastName: userData.lastName || user?.lastName || '',
              email: userData.email || user?.email || '',
              phone: phoneForForm(userData.phone || user?.phone),
              bio: userData.profile?.bio || user?.profile?.bio || '',
            })
          }
        } catch (err) {
          console.error('Error al cargar información del usuario:', err)
          // Si falla, usar datos del store
          setFormData({
            username: user?.username || '',
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: phoneForForm(user?.phone),
            bio: user?.profile?.bio || '',
          })
        }
      }
    }
    loadUserData()
  }, [user])

  const reloadBirthFromServer = useCallback(async () => {
    try {
      const data = await getOnboardingData()
      setBirthDateIso(onboardingBirthToIso(data?.birthDate))
    } catch {
      setBirthDateIso('')
    }
  }, [getOnboardingData])

  useEffect(() => {
    if (!user?.id) return
    reloadBirthFromServer()
  }, [user?.id, reloadBirthFromServer])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxBirthDateStr = new Date().toISOString().slice(0, 10)

  const birthAgeDisplay = (() => {
    if (!birthDateIso) return null
    const [y, m, d] = birthDateIso.split('-').map(Number)
    if ([y, m, d].some((n) => Number.isNaN(n))) return null
    const age = getAgeInYearsFromParts(y, m, d)
    const pretty = new Date(y, m - 1, d).toLocaleDateString('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return { age, pretty }
  })()

  const handleFieldEdit = (field: string) => {
    setEditingField(field)
    setError(null)
  }

  const handleFieldCancel = async () => {
    setEditingField(null)
    setError(null)
    
    // Recargar datos actuales del usuario
    if (user?.id) {
      try {
        const response = await apiClient.get<import('@/types/api-responses').UserMeResponse | { user: import('@/types/api-responses').UserMeResponse; addresses: any[] }>(API_ENDPOINTS.USERS.ME)
        if (response.success && response.data) {
          const responseData = response.data as any
          const userData = responseData.user || responseData
          setFormData({
            username: userData.username || user?.username || '',
            firstName: userData.firstName || user?.firstName || '',
            lastName: userData.lastName || user?.lastName || '',
            email: userData.email || user?.email || '',
            phone: userData.phone || user?.phone || '',
            bio: userData.profile?.bio || user?.profile?.bio || '',
          })
        }
      } catch (err) {
        // Si falla, usar datos del store
        setFormData({
          username: user?.username || '',
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          phone: user?.phone || '',
          bio: user?.profile?.bio || '',
        })
      }
    }
    await reloadBirthFromServer()
    setShowAdultBirthConfirm(false)
    setPendingBirthIso(null)
  }

  async function saveUserAndProfileFields(): Promise<boolean> {
    const me = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.ME, {
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone.trim() ? normalizeColombiaPhone(formData.phone) || '' : '',
    })
    if (!me.success) {
      setError(me.error?.message || 'Error al actualizar datos')
      return false
    }
    const prof = await apiClient.put<import('@/types/api-responses').UpdateResponse>(
      API_ENDPOINTS.USERS.PROFILE.UPDATE,
      { bio: formData.bio }
    )
    if (!prof.success) {
      setError(prof.error?.message || 'Error al actualizar biografía')
      return false
    }
    return true
  }

  async function finalizeBirthDateSave(iso: string, recordAgeConsent: boolean) {
    setIsLoading(true)
    setError(null)
    try {
      await updateOnboardingData({
        birthDate: iso,
        ...(recordAgeConsent ? { recordAgeConsent: true } : {}),
      })
      if (isSettings && settingsBulkEdit) {
        const ok = await saveUserAndProfileFields()
        if (!ok) return
      }
      await checkAuth()
      setEditingField(null)
      setShowAdultBirthConfirm(false)
      setPendingBirthIso(null)
      birthDateAtBulkEditStartRef.current = iso
      if (onUpdate) onUpdate()
      if (isSettings) setSettingsBulkEdit(false)
    } catch (err: any) {
      setError(err.message || 'Error al guardar la fecha de nacimiento')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkCancel = () => {
    setSettingsBulkEdit(false)
    setEditingField(null)
    void handleFieldCancel()
  }

  const handleBulkSave = async () => {
    if (!isSettings) return
    setError(null)
    const uErr = formData.username?.trim() ? validateUsername(formData.username) : null
    if (uErr) {
      setError(uErr)
      return
    }
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      setError('Nombre y apellido son obligatorios')
      return
    }
    if (!formData.email?.trim() || !formData.email.includes('@')) {
      setError('Email no válido')
      return
    }
    if (formData.phone.trim() && !isValidColombiaPhone(formData.phone)) {
      setError('Indica un celular válido (+57, 10 dígitos comenzando en 3)')
      return
    }

    const birthDateChanged = birthDateIso !== birthDateAtBulkEditStartRef.current

    if (birthDateChanged) {
      if (!birthDateIso?.trim()) {
        setError('Selecciona tu fecha de nacimiento')
        return
      }
      const [y, m, d] = birthDateIso.split('-').map(Number)
      if ([y, m, d].some((n) => Number.isNaN(n))) {
        setError('Fecha inválida')
        return
      }
      if (isAdultFromBirthParts(y, m, d)) {
        setPendingBirthIso(birthDateIso)
        setShowAdultBirthConfirm(true)
        return
      }
    }

    setIsLoading(true)
    try {
      const ok = await saveUserAndProfileFields()
      if (!ok) return
      if (birthDateChanged) {
        await updateOnboardingData({ birthDate: birthDateIso })
        birthDateAtBulkEditStartRef.current = birthDateIso
      }
      await checkAuth()
      setSettingsBulkEdit(false)
      if (onUpdate) onUpdate()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFieldSave = async (field: string) => {
    setIsLoading(true)
    setError(null)

    try {
      if (field === 'birthDate') {
        if (!birthDateIso?.trim()) {
          setError('Selecciona tu fecha de nacimiento')
          setIsLoading(false)
          return
        }
        const parts = birthDateIso.split('-').map(Number)
        if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
          setError('Fecha inválida')
          setIsLoading(false)
          return
        }
        const [y, m, d] = parts
        if (isAdultFromBirthParts(y, m, d)) {
          setPendingBirthIso(birthDateIso)
          setShowAdultBirthConfirm(true)
          setIsLoading(false)
          return
        }
        await finalizeBirthDateSave(birthDateIso, false)
        return
      }

      let response
      if (field === 'bio') {
        // La bio se actualiza en el perfil
        response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.PROFILE.UPDATE, { bio: formData.bio })
      } else {
        const updateData: Record<string, string> = {}
        if (field === 'phone') {
          if (formData.phone.trim() && !isValidColombiaPhone(formData.phone)) {
            setError('Indica un celular válido (+57, 10 dígitos comenzando en 3)')
            setIsLoading(false)
            return
          }
          updateData.phone = formData.phone.trim() ? normalizeColombiaPhone(formData.phone)! : ''
        } else {
          updateData[field] = formData[field as keyof typeof formData]
        }
        response = await apiClient.put<import('@/types/api-responses').UpdateResponse>(API_ENDPOINTS.USERS.ME, updateData)
      }

      if (response.success) {
        // Actualizar el store de autenticación
        await checkAuth()
        setEditingField(null)
        if (onUpdate) {
          onUpdate()
        }
      } else {
        setError(response.error?.message || 'Error al actualizar')
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar')
    } finally {
      setIsLoading(false)
    }
  }

  // Validar username
  const validateUsername = (username: string): string | null => {
    if (!username || username.trim().length === 0) {
      return null // Permitir username vacío (null)
    }
    if (username.length < 3) {
      return 'El username debe tener al menos 3 caracteres'
    }
    if (username.length > 30) {
      return 'El username no puede exceder 30 caracteres'
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'El username solo puede contener letras, números y guiones bajos'
    }
    return null
  }

  const titleClass = isSettings
    ? 'text-base font-semibold text-[#73FFA2]'
    : 'text-lg font-semibold text-[#73FFA2] mb-4'
  const shellClass = isSettings
    ? tankuSettingsSectionShellClass
    : 'bg-transparent rounded-lg p-4 border-2 border-[#73FFA2] hover:border-[#66DEDB] transition-colors space-y-4'
  const labelClass = isSettings ? 'text-xs text-gray-500' : 'text-sm font-medium text-gray-300'
  const inpClass = isSettings
    ? 'h-6 min-w-0 flex-1 rounded border border-white/12 bg-[#1a1a1a] px-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#73FFA2]/35'
    : 'flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB]'
  const inpFullClass = isSettings
    ? 'h-6 w-full min-w-0 rounded border border-white/12 bg-[#1a1a1a] px-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#73FFA2]/35'
    : 'w-full bg-gray-800 text-white px-3 py-2 rounded border border-[#73FFA2] focus:outline-none focus:border-[#66DEDB]'
  const rowClass = isSettings ? 'mt-1 flex min-h-0 items-center gap-1.5' : 'flex items-center gap-2'
  const penBtn = isSettings ? editIconBtnSettings : 'p-2 text-gray-400 hover:text-[#73FFA2] transition-colors'
  const actionBtn = isSettings
    ? 'p-0.5 text-[#73FFA2] hover:text-[#66DEDB] disabled:cursor-not-allowed disabled:opacity-50'
    : 'p-2 text-[#73FFA2] hover:text-[#66DEDB] disabled:opacity-50 disabled:cursor-not-allowed'
  const actionBtnDanger = isSettings
    ? 'p-0.5 text-red-400/90 hover:text-red-300 disabled:opacity-50'
    : 'p-2 text-red-400 hover:text-red-300 disabled:opacity-50'

  const isBulk = isSettings && settingsBulkEdit
  const fieldCardClass = isSettings ? fieldCardSettings : 'space-y-2'

  return (
    <>
    <div className={shellClass}>
      {isSettings ? (
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[#73FFA2]">Información personal</h3>
            <p className="mt-0.5 text-xs text-gray-500">Datos mostrados en tu perfil.</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
            {settingsBulkEdit ? (
              <>
                <button
                  type="button"
                  onClick={handleBulkCancel}
                  disabled={isLoading}
                  className="rounded-[20px] border border-white/15 bg-black/30 px-2.5 py-1 text-xs text-gray-200 transition hover:border-white/25 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleBulkSave}
                  disabled={isLoading}
                  className="rounded-[20px] border border-[#73FFA2]/50 bg-[#73FFA2]/15 px-2.5 py-1 text-xs font-medium text-[#73FFA2] transition hover:bg-[#73FFA2]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Guardar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  birthDateAtBulkEditStartRef.current = birthDateIso
                  setSettingsBulkEdit(true)
                }}
                className={penBtn}
                title="Editar toda la información"
                aria-label="Editar toda la información"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <h3 className={titleClass}>Información personal</h3>
      )}

      {error && (
        <div
          className={
            isSettings
              ? 'rounded border border-red-500/20 bg-red-900/10 px-2 py-1.5 text-xs text-red-400'
              : 'bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm'
          }
        >
          {error}
        </div>
      )}

      {/* Username */}
      <PersonalInfoFieldBlock isSettings={isSettings} cardClassName={fieldCardClass}>
        <label className={labelClass}>Username</label>
        <div className={isBulk ? 'mt-1 flex min-h-0 flex-col gap-1' : rowClass}>
          {isBulk ? (
            <div className="flex-1">
              <input
                type="text"
                value={formData.username}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, username: value })
                  const validationError = validateUsername(value)
                  if (validationError) {
                    setError(validationError)
                  } else {
                    setError(null)
                  }
                }}
                className={inpSettings}
                placeholder="@username"
                disabled={isLoading}
              />
              <p className="mt-0.5 text-xs text-gray-500">Solo letras, números y _ · único</p>
            </div>
          ) : !isSettings && editingField === 'username' ? (
            <>
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData({ ...formData, username: value })
                    const validationError = validateUsername(value)
                    if (validationError) {
                      setError(validationError)
                    } else {
                      setError(null)
                    }
                  }}
                  className={inpFullClass}
                  placeholder="@username"
                  disabled={isLoading}
                  autoFocus
                />
                <p className="mt-0.5 text-xs text-gray-500">Solo letras, números y _ · único</p>
              </div>
              <button
                type="button"
                onClick={() => handleFieldSave('username')}
                disabled={isLoading || (formData.username.trim() !== '' && validateUsername(formData.username) !== null)}
                className={actionBtn}
              >
                <CheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              <button
                type="button"
                onClick={handleFieldCancel}
                disabled={isLoading}
                className={actionBtnDanger}
              >
                <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </>
          ) : isSettings ? (
            <div className={valueRowSettings}>
              <span className="truncate font-medium">
                {formData.username ? `@${formData.username}` : 'No especificado'}
              </span>
            </div>
          ) : (
            <>
              <span className="flex-1 truncate text-sm font-medium text-white">
                {formData.username ? `@${formData.username}` : 'No especificado'}
              </span>
              <button
                type="button"
                onClick={() => handleFieldEdit('username')}
                className={penBtn}
              >
                <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </>
          )}
        </div>
      </PersonalInfoFieldBlock>

      {/* Nombre y Apellido en un renglón */}
      <div
        className={
          isSettings ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-2.5' : 'grid grid-cols-2 gap-4'
        }
      >
        <PersonalInfoFieldBlock isSettings={isSettings} cardClassName={fieldCardClass}>
          <label className={labelClass}>Nombre</label>
          <div className={isBulk ? 'mt-1' : rowClass}>
            {isBulk ? (
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={inpSettings}
                disabled={isLoading}
              />
            ) : !isSettings && editingField === 'firstName' ? (
              <>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={inpClass}
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleFieldSave('firstName')}
                  disabled={isLoading || !formData.firstName.trim()}
                  className={actionBtn}
                >
                  <CheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFieldCancel}
                  disabled={isLoading}
                  className={actionBtnDanger}
                >
                  <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </>
            ) : isSettings ? (
              <div className={valueRowSettings}>
                <span className="truncate font-medium">{formData.firstName || 'No especificado'}</span>
              </div>
            ) : (
              <div className="flex w-full min-w-0 items-center gap-1.5">
                <span className="flex-1 text-sm font-medium text-white">
                  {formData.firstName || 'No especificado'}
                </span>
                <button
                  type="button"
                  onClick={() => handleFieldEdit('firstName')}
                  className={penBtn}
                >
                  <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            )}
          </div>
        </PersonalInfoFieldBlock>

        <PersonalInfoFieldBlock isSettings={isSettings} cardClassName={fieldCardClass}>
          <label className={labelClass}>Apellido</label>
          <div className={isBulk ? 'mt-1' : rowClass}>
            {isBulk ? (
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={inpSettings}
                disabled={isLoading}
              />
            ) : !isSettings && editingField === 'lastName' ? (
              <>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={inpClass}
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleFieldSave('lastName')}
                  disabled={isLoading || !formData.lastName.trim()}
                  className={actionBtn}
                >
                  <CheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFieldCancel}
                  disabled={isLoading}
                  className={actionBtnDanger}
                >
                  <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </>
            ) : isSettings ? (
              <div className={valueRowSettings}>
                <span className="truncate font-medium">{formData.lastName || 'No especificado'}</span>
              </div>
            ) : (
              <div className="flex w-full min-w-0 items-center gap-1.5">
                <span className="flex-1 text-sm font-medium text-white">
                  {formData.lastName || 'No especificado'}
                </span>
                <button
                  type="button"
                  onClick={() => handleFieldEdit('lastName')}
                  className={penBtn}
                >
                  <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            )}
          </div>
        </PersonalInfoFieldBlock>
      </div>

      {/* Email y Teléfono en un renglón */}
      <div
        className={
          isSettings ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-2.5' : 'grid grid-cols-2 gap-4'
        }
      >
        <PersonalInfoFieldBlock isSettings={isSettings} cardClassName={fieldCardClass}>
          <label className={labelClass}>Email</label>
          <div className={isBulk ? 'mt-1' : rowClass}>
            {isBulk ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inpSettings}
                disabled={isLoading}
              />
            ) : !isSettings && editingField === 'email' ? (
              <>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inpClass}
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleFieldSave('email')}
                  disabled={isLoading || !formData.email.trim() || !formData.email.includes('@')}
                  className={actionBtn}
                >
                  <CheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFieldCancel}
                  disabled={isLoading}
                  className={actionBtnDanger}
                >
                  <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </>
            ) : isSettings ? (
              <div className={valueRowSettings}>
                <span className="truncate font-medium">{formData.email || 'No especificado'}</span>
              </div>
            ) : (
              <div className="flex w-full min-w-0 items-center gap-1.5">
                <span className="flex-1 truncate text-sm font-medium text-white">
                  {formData.email || 'No especificado'}
                </span>
                <button
                  type="button"
                  onClick={() => handleFieldEdit('email')}
                  className={penBtn}
                >
                  <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            )}
          </div>
        </PersonalInfoFieldBlock>

        <PersonalInfoFieldBlock isSettings={isSettings} cardClassName={fieldCardClass}>
          <label className={labelClass}>Teléfono</label>
          <div className={isBulk ? 'mt-1' : rowClass}>
            {isBulk ? (
              <ColombiaPhoneInput
                value={formData.phone}
                onChange={(phone) => setFormData({ ...formData, phone })}
                disabled={isLoading}
                inputClassName="h-9 rounded-r-[20px] border-white/10 bg-black/30 px-3 text-sm"
                className="mt-1"
              />
            ) : !isSettings && editingField === 'phone' ? (
              <>
                <ColombiaPhoneInput
                  value={formData.phone}
                  onChange={(phone) => setFormData({ ...formData, phone })}
                  disabled={isLoading}
                  className="min-w-0 flex-1"
                  inputClassName={
                    isSettings
                      ? inpClass
                      : 'flex-1 rounded-r border border-[#73FFA2] bg-gray-800 px-3 py-2 text-white focus:outline-none focus:border-[#66DEDB]'
                  }
                />
                <button
                  type="button"
                  onClick={() => handleFieldSave('phone')}
                  disabled={isLoading}
                  className={actionBtn}
                >
                  <CheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFieldCancel}
                  disabled={isLoading}
                  className={actionBtnDanger}
                >
                  <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </>
            ) : isSettings ? (
              <div className={valueRowSettings}>
                <span className="truncate font-medium">
                  {formatColombiaPhoneDisplay(formData.phone) || 'No especificado'}
                </span>
              </div>
            ) : (
              <div className="flex w-full min-w-0 items-center gap-1.5">
                <span className="flex-1 text-sm font-medium text-white">
                  {formatColombiaPhoneDisplay(formData.phone) || 'No especificado'}
                </span>
                <button
                  type="button"
                  onClick={() => handleFieldEdit('phone')}
                  className={penBtn}
                >
                  <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            )}
          </div>
        </PersonalInfoFieldBlock>
      </div>

      {/* Fecha de nacimiento y edad (onboarding) */}
      <PersonalInfoFieldBlock isSettings={isSettings} cardClassName={fieldCardClass}>
        <label className={labelClass}>Fecha de nacimiento</label>
        <div className={isBulk ? 'mt-1' : rowClass}>
          {isBulk ? (
            <input
              type="date"
              value={birthDateIso}
              max={maxBirthDateStr}
              min="1904-01-01"
              onChange={(e) => {
                setBirthDateIso(e.target.value)
                setError(null)
              }}
              className={inpSettings}
              disabled={isLoading}
            />
          ) : !isSettings && editingField === 'birthDate' ? (
            <>
              <input
                type="date"
                value={birthDateIso}
                max={maxBirthDateStr}
                min="1904-01-01"
                onChange={(e) => {
                  setBirthDateIso(e.target.value)
                  setError(null)
                }}
                className="flex-1 rounded border border-[#73FFA2] bg-gray-800 px-3 py-2 text-white focus:border-[#66DEDB] focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => handleFieldSave('birthDate')}
                disabled={isLoading || !birthDateIso}
                className={actionBtn}
              >
                <CheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              <button
                type="button"
                onClick={handleFieldCancel}
                disabled={isLoading}
                className={actionBtnDanger}
              >
                <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </>
          ) : isSettings ? (
            <div className={valueRowSettings}>
              <span className="truncate font-medium">
                {birthAgeDisplay ? (
                  <>
                    <span className="text-[#66DEDB]">{birthAgeDisplay.age} años</span>
                    <span className="text-gray-400"> · {birthAgeDisplay.pretty}</span>
                  </>
                ) : (
                  'No especificado'
                )}
              </span>
            </div>
          ) : (
            <div className="flex w-full min-w-0 items-center gap-1.5">
              <span className="flex-1 text-sm font-medium text-white">
                {birthAgeDisplay ? (
                  <>
                    <span className="text-[#66DEDB]">{birthAgeDisplay.age} años</span>
                    <span className="text-gray-400"> · {birthAgeDisplay.pretty}</span>
                  </>
                ) : (
                  'No especificado'
                )}
              </span>
              <button
                type="button"
                onClick={() => handleFieldEdit('birthDate')}
                className={penBtn}
              >
                <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          )}
        </div>
        <p
          className={
            isSettings ? 'mt-1 text-xs text-gray-500' : 'mt-2 text-xs text-gray-400'
          }
        >
          {isSettings
            ? 'Se usa para edad y políticas de contenido.'
            : 'Define tu edad en Tanku y las políticas de contenido según mayoría de edad.'}
        </p>
      </PersonalInfoFieldBlock>

      {/* Bio a lo largo */}
      <PersonalInfoFieldBlock isSettings={isSettings} cardClassName={fieldCardClass}>
        <label className={labelClass}>Biografía</label>
        <div className={isBulk ? 'mt-1' : 'flex items-start gap-1'}>
          {isBulk ? (
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className={textAreaSettings}
              placeholder="Escribe algo sobre ti..."
              disabled={isLoading}
              maxLength={500}
            />
          ) : !isSettings && editingField === 'bio' ? (
            <>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="min-h-[100px] flex-1 resize-y rounded border border-[#73FFA2] bg-gray-800 px-3 py-2 text-base text-white focus:border-[#66DEDB] focus:outline-none"
                placeholder="Escribe algo sobre ti..."
                disabled={isLoading}
                autoFocus
                maxLength={500}
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleFieldSave('bio')}
                  disabled={isLoading}
                  className={actionBtn}
                >
                  <CheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFieldCancel}
                  disabled={isLoading}
                  className={actionBtnDanger}
                >
                  <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </>
          ) : isSettings ? (
            <div className={valueRowSettingsBio}>
              <span className="max-h-16 flex-1 overflow-y-auto whitespace-pre-wrap text-gray-200">
                {formData.bio || 'No especificado'}
              </span>
            </div>
          ) : (
            <div className="flex w-full min-w-0 items-start gap-1">
              <span className="flex-1 whitespace-pre-wrap text-sm text-white">
                {formData.bio || 'No especificado'}
              </span>
              <button
                type="button"
                onClick={() => handleFieldEdit('bio')}
                className={penBtn}
              >
                <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          )}
        </div>
        {(isBulk || (!isSettings && editingField === 'bio')) && (
          <p className={isSettings ? 'mt-1 text-xs text-gray-500' : 'mt-1 text-xs text-gray-400'}>
            {formData.bio.length}/500
          </p>
        )}
      </PersonalInfoFieldBlock>
    </div>

    <OnboardingAdultConfirmMiniModal
      open={showAdultBirthConfirm}
      overlayZIndex={isSettings ? 2000007 : 210}
      onConfirm={() => {
        if (pendingBirthIso) void finalizeBirthDateSave(pendingBirthIso, true)
      }}
      onCorrectDate={() => {
        setShowAdultBirthConfirm(false)
        setPendingBirthIso(null)
      }}
    />
    </>
  )
}
