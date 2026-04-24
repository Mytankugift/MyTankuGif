'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import Script from 'next/script'
import Link from 'next/link'
import { isEpaycoSmartMode, getEpaycoScriptUrlForMode } from '@/lib/epayco/config'
import { openEpaycoSmartCheckout } from '@/lib/epayco/open-smart-checkout'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { UserAvatar } from '@/components/shared/user-avatar'
import { BaseNav } from '@/components/layout/base-nav'
import {
  CHECKOUT_TANKU_INPUT as inputClass,
  CHECKOUT_TANKU_PAGE_BG,
  CHECKOUT_TANKU_SCROLL_INNER,
  CHECKOUT_TANKU_SECTION_LABEL as sectionLabel,
  CHECKOUT_TANKU_SURFACE as surface,
} from '@/lib/checkout-tanku-design'

// Declaración para TypeScript para el objeto ePayco en window
declare global {
  interface Window {
    ePayco?: {
      checkout: {
        configure: (config: { key: string; test: boolean }) => {
          open: (options: {
            amount: number
            name: string
            description: string
            currency: string
            country: string
            external: boolean
            response: string
            confirmation: string
            name_billing: string
            mobilephone_billing: string
          }) => void
        }
      }
    }
  }
}

// Componente interno que usa useSearchParams
function GiftDirectCheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuthStore()
  
  const variantId = searchParams.get('variantId')
  const recipientIdParam = searchParams.get('recipientId') // Opcional ahora
  const quantityParam = searchParams.get('quantity')
  const quantity = quantityParam ? parseInt(quantityParam) : 1
  
  const [email, setEmail] = useState(user?.email || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productInfo, setProductInfo] = useState<any>(null)
  const [recipientInfo, setRecipientInfo] = useState<any>(null)
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(recipientIdParam)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [friends, setFriends] = useState<any[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [eligibility, setEligibility] = useState<{
    canReceive: boolean
    reason?: string
    canSendGift?: boolean
    sendGiftReason?: string
    giftProductAllowed?: boolean
    giftProductReason?: string
  } | null>(null)
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
  const [epaycoReady, setEpaycoReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Validar parámetros y cargar datos
  useEffect(() => {
    // recipientId ahora es opcional
    if (!variantId) {
      setError('Faltan parámetros requeridos (variantId)')
      setIsLoading(false)
      return
    }

    if (!isAuthenticated) {
      const redirectUrl = `/checkout/gift-direct?variantId=${variantId}&quantity=${quantity}${recipientIdParam ? `&recipientId=${recipientIdParam}` : ''}`
      sessionStorage.setItem('redirect-after-login', redirectUrl)
      router.push('/feed')
      return
    }

    loadProductInfo()
    
    // Si viene recipientId (flujo wishlist), cargar directamente
    if (recipientIdParam) {
      loadRecipientInfo(recipientIdParam)
    } else {
      // Si NO viene recipientId (flujo feed), cargar amigos para mostrar por defecto
      loadFriends()
    }
  }, [variantId, recipientIdParam, quantity, isAuthenticated])

  const loadProductInfo = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (variantId) {
        const variantResponse = await apiClient.get<any>(API_ENDPOINTS.PRODUCTS.VARIANT_BY_ID(variantId))
        if (variantResponse.success && variantResponse.data) {
          const variant = variantResponse.data
          
          // Validar stock
          const stock = variant.stock || 0
          if (stock <= 0) {
            setError('Este producto está agotado y no está disponible para regalo')
            return
          }
          if (stock < quantity) {
            setError(`Stock insuficiente. Solo hay ${stock} unidad(es) disponible(s)`)
            return
          }
          
          const price = variant.tankuPrice || variant.price || 0
          setProductInfo({
            variant: {
              id: variant.id,
              title: variant.title,
            },
            product: {
              id: variant.product.id,
              title: variant.product.title,
              thumbnail: variant.product.images?.[0] || null,
            },
            price,
          })
          setTotal(price * quantity)
        } else {
          throw new Error('No se pudo cargar la información del producto')
        }
      }
    } catch (err: any) {
      console.error('Error cargando información:', err)
      setError(err.message || 'Error al cargar la información')
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecipientInfo = async (recipientId: string) => {
    try {
      const recipientResponse = await apiClient.get<any>(API_ENDPOINTS.USERS.BY_ID(recipientId))
      if (recipientResponse.success && recipientResponse.data) {
        const user = (recipientResponse.data as any).user || recipientResponse.data
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
        setRecipientInfo({
          id: user.id,
          name: fullName || user.username || 'Usuario',
          username: user.username,
          avatar: user.profile?.avatar || user.avatar || null,
        })
        setSelectedRecipientId(recipientId)
        
        // Validar elegibilidad cuando se carga el receptor
        await checkEligibility(recipientId)
      }
    } catch (err: any) {
      console.error('Error cargando información del receptor:', err)
      setError(err.message || 'Error al cargar la información del receptor')
    }
  }

  const loadFriends = async () => {
    setIsLoadingFriends(true)
    try {
      const response = await apiClient.get<{ friends: any[]; count: number }>(API_ENDPOINTS.FRIENDS.LIST)
      if (response.success && response.data) {
        // Transformar la estructura de amigos al formato que necesitamos
        const friendsList = (response.data.friends || []).map((friend: any) => {
          const friendUser = friend.friend || friend
          return {
            id: friendUser.id,
            firstName: friendUser.firstName,
            lastName: friendUser.lastName,
            username: friendUser.username,
            email: friendUser.email,
            avatar: friendUser.profile?.avatar || friendUser.avatar || null,
            profile: friendUser.profile || null,
          }
        })
        setFriends(friendsList)
      }
    } catch (err: any) {
      console.error('Error cargando amigos:', err)
    } finally {
      setIsLoadingFriends(false)
    }
  }

  const searchRecipients = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await apiClient.get<any>(`${API_ENDPOINTS.USERS.SEARCH}?q=${encodeURIComponent(query)}`)
      if (response.success && response.data) {
        setSearchResults(response.data.users || response.data || [])
      }
    } catch (err: any) {
      console.error('Error buscando usuarios:', err)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Efecto para buscar cuando cambia el texto de búsqueda
  useEffect(() => {
    if (recipientSearch.length >= 2) {
      searchRecipients(recipientSearch)
    } else {
      setSearchResults([])
    }
  }, [recipientSearch, searchRecipients])

  const checkEligibility = async (recipientId: string) => {
    if (!recipientId || !user?.id) return

    setIsCheckingEligibility(true)
    setEligibility(null)
    
    try {
      const variantQuery = variantId
        ? `&variantId=${encodeURIComponent(variantId)}`
        : ''
      const response = await apiClient.get<any>(
        `${API_ENDPOINTS.GIFTS.VALIDATE_RECIPIENT}?recipientId=${recipientId}&senderId=${user.id}${variantQuery}`
      )
      
      if (response.success && response.data) {
        const d = response.data
        setEligibility(d)

        if (!d.canReceive || d.canSendGift === false) {
          setError(d.reason || d.sendGiftReason || 'El destinatario no puede recibir regalos')
        } else if (d.giftProductAllowed === false) {
          setError(null)
        } else {
          setError(null)
        }
      }
    } catch (err: any) {
      console.error('Error validando elegibilidad:', err)
      setEligibility({
        canReceive: false,
        reason: err.message || 'Error al validar elegibilidad'
      })
      setError(err.message || 'Error al validar elegibilidad')
    } finally {
      setIsCheckingEligibility(false)
    }
  }

  const handleRecipientSelect = async (recipient: any) => {
    setRecipientSearch('')
    setSearchResults([])
    await loadRecipientInfo(recipient.id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError('El email es requerido')
      return
    }

    const finalRecipientId = selectedRecipientId || recipientIdParam
    if (!variantId || !finalRecipientId) {
      setError('Debes seleccionar un destinatario')
      return
    }

    // Validar elegibilidad antes de continuar (incl. producto +18 y destinatario menor)
    if (
      !eligibility ||
      !eligibility.canReceive ||
      eligibility.canSendGift === false ||
      eligibility.giftProductAllowed === false
    ) {
      setError(
        eligibility?.giftProductAllowed === false
          ? eligibility?.giftProductReason ||
              'Este producto no puede enviarse a un destinatario menor de edad'
          : eligibility?.reason ||
              eligibility?.sendGiftReason ||
              'El destinatario no puede recibir regalos'
      )
      return
    }

    setIsSubmitting(true)

    try {
      if (isEpaycoSmartMode()) {
        const smartRes = await apiClient.post<{ sessionId: string }>(
          API_ENDPOINTS.CHECKOUT.EPAYCO_SMART_SESSION,
          {
            flow: 'gift_direct',
            variant_id: variantId,
            quantity,
            recipient_id: finalRecipientId,
            email,
            payment_method: 'epayco',
          }
        )
        if (!smartRes.success || !smartRes.data?.sessionId) {
          setError(
            (smartRes as { error?: { message?: string } }).error?.message ||
              'No se pudo crear la sesión de pago'
          )
          return
        }
        openEpaycoSmartCheckout(smartRes.data.sessionId)
        return
      }

      const response = await apiClient.post<any>(API_ENDPOINTS.CHECKOUT.GIFT_DIRECT, {
        variant_id: variantId,
        quantity,
        recipient_id: finalRecipientId,
        email,
        payment_method: 'epayco',
      })

      if (response.success && response.data) {
        const data = response.data as any
        
        if (data.orderId) {
          await openEpaycoCheckout(data)
        }
      } else {
        setError(response.error?.message || 'Error al procesar el regalo')
      }
    } catch (err: any) {
      console.error('Error procesando regalo:', err)
      setError(err.message || 'Error al procesar el regalo')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEpaycoCheckout = async (orderData: any) => {
    try {
      if (typeof window.ePayco === 'undefined') {
        throw new Error('ePayco no está cargado. Por favor, recarga la página.')
      }

      const container = document.createElement('div')
      container.style.display = 'none'
      container.id = 'epayco-container'
      document.body.appendChild(container)

      const epaycoKey = process.env.NEXT_PUBLIC_EPAYCO_KEY
      if (!epaycoKey) {
        throw new Error('NEXT_PUBLIC_EPAYCO_KEY no está configurada en las variables de entorno')
      }
      const epaycoTestMode = process.env.NEXT_PUBLIC_EPAYCO_TEST_MODE !== 'false'
      const handler = window.ePayco.checkout.configure({
        key: epaycoKey,
        test: epaycoTestMode,
      })

      if (!handler) {
        throw new Error('No se pudo configurar el checkout de ePayco')
      }

      const webhookResponse = await apiClient.get<{ webhookUrl: string }>(
        `/api/v1/checkout/webhook-url?orderId=${orderData.orderId}`
      )

      if (!webhookResponse.success || !webhookResponse.data?.webhookUrl) {
        throw new Error('No se pudo obtener la URL del webhook desde el backend')
      }

      const webhookUrl = webhookResponse.data.webhookUrl
      console.log('[GIFT-DIRECT-CHECKOUT] URL de webhook obtenida:', webhookUrl)

      const epaycoOptions = {
        amount: orderData.total,
        name: `Regalo Tanku ${orderData.orderId.slice(0, 8)}`,
        description: `Regalo Tanku - ${productInfo?.product?.title || 'Producto'}`,
        currency: 'cop',
        country: 'co',
        external: false,
        response: `${window.location.origin}/checkout/success`,
        confirmation: webhookUrl,
        name_billing: user?.firstName || '',
        mobilephone_billing: user?.phone || '',
      }

      console.log('[GIFT-DIRECT-CHECKOUT] Abriendo pasarela de pago...')
      handler.open(epaycoOptions)
      console.log('[GIFT-DIRECT-CHECKOUT] Pasarela de pago abierta exitosamente')
    } catch (epaycoError: any) {
      console.error('[GIFT-DIRECT-CHECKOUT] Error abriendo Epayco:', epaycoError)
      setError(epaycoError.message || 'Error al abrir la pasarela de pago')
    }
  }

  const navBack = (
    <Link
      href="/feed"
      aria-label="Volver"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
    >
      <Image
        src="/icons_tanku/mobile_tanku_menu_ir_atras_Universal.svg"
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 object-contain"
        unoptimized
      />
    </Link>
  )

  if (isLoading && !productInfo) {
    return (
      <>
        <BaseNav
          showStories={false}
          pageTitle="Regala un TANKU"
          pageTitleColor="#FFFFFF"
          startContent={navBack}
          mobileBackCenterTitleCartOnly
          mobileTranslucentNav
        />
        <div
          className="min-h-screen overflow-x-hidden overflow-y-auto px-4 pb-8 pt-24 sm:px-6 sm:pt-28 md:min-h-0 md:h-full md:max-h-full md:overflow-visible md:px-8 md:pt-32"
          style={CHECKOUT_TANKU_PAGE_BG}
        >
          <div className="mx-auto max-w-4xl text-center text-zinc-500">
            <div className={`${surface} mx-auto max-w-md px-8 py-14`}>
              <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#73FFA2] border-t-transparent" />
              <span className="text-sm">Cargando…</span>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error && !variantId) {
    return (
      <>
        <BaseNav
          showStories={false}
          pageTitle="Regala un TANKU"
          pageTitleColor="#FFFFFF"
          startContent={navBack}
          mobileBackCenterTitleCartOnly
          mobileTranslucentNav
        />
        <div
          className="min-h-screen overflow-x-hidden overflow-y-auto px-4 pb-8 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pt-32"
          style={CHECKOUT_TANKU_PAGE_BG}
        >
          <div className="mx-auto max-w-4xl text-center">
            <div className={`${surface} mx-auto max-w-md`}>
              <p className="mb-5 text-sm text-red-400/95">{error}</p>
              <Link href="/feed">
                <Button className="rounded-full bg-[#73FFA2] px-6 font-semibold text-[#1a1a1a] hover:brightness-95">
                  Volver al feed
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <BaseNav
        showStories={false}
        canHide={false}
        isVisible={true}
        pageTitle="Regala un TANKU"
        pageTitleColor="#FFFFFF"
        startContent={navBack}
        mobileBackCenterTitleCartOnly
        mobileTranslucentNav
      />
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden" id="gift-direct-scroll-root">
        <div
          className={CHECKOUT_TANKU_SCROLL_INNER}
          style={CHECKOUT_TANKU_PAGE_BG}
        >
        <div className="mx-auto max-w-4xl">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 lg:items-start">
          {/* Columna principal */}
          <div className="space-y-8 lg:col-span-7">
            {/* Selector de destinatario - Solo mostrar si NO viene recipientId */}
            {!recipientInfo && !recipientIdParam ? (
              <div className={surface}>
                <p className={sectionLabel}>Destinatario</p>
                <div className="space-y-4">
                  {/* Buscador más pequeño */}
                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-[#B8C4CC]"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.3-4.3" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        className={`${inputClass} pl-10`}
                        placeholder="Buscar usuario o amigo..."
                      />
                    </div>
                  </div>
                  
                  {/* Mostrar amigos por defecto o resultados de búsqueda */}
                  {isLoadingFriends && recipientSearch.length < 2 && (
                    <div className="py-6 text-center text-sm text-zinc-500">
                      <div className="mx-auto inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#73FFA2] border-t-transparent" />
                    </div>
                  )}
                  
                  {isSearching && recipientSearch.length >= 2 && (
                    <div className="py-6 text-center text-sm text-zinc-500">
                      <div className="mx-auto inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#73FFA2] border-t-transparent" />
                    </div>
                  )}
                  
                  {/* Mostrar amigos cuando no hay búsqueda */}
                  {!isLoadingFriends && recipientSearch.length < 2 && friends.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3 max-h-80 overflow-y-auto custom-scrollbar">
                      {friends.map((friend) => {
                        const userName = friend.firstName && friend.lastName
                          ? `${friend.firstName} ${friend.lastName}`
                          : friend.username || friend.email?.split('@')[0] || 'Usuario'
                        
                        return (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() => handleRecipientSelect(friend)}
                            className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.04] px-2.5 py-2 ring-1 ring-inset ring-white/[0.03] backdrop-blur-sm transition-all hover:border-[#66DEDB]/25 hover:ring-[#66DEDB]/20"
                          >
                            <UserAvatar
                              user={{
                                avatar: friend.avatar || friend.profile?.avatar || null,
                                firstName: friend.firstName,
                                lastName: friend.lastName,
                                email: friend.email,
                                username: friend.username,
                              }}
                              size={42}
                            />
                            <div className="min-w-0 text-left">
                              <p className="text-white text-xs md:text-sm max-w-full truncate font-medium">
                                {userName}
                              </p>
                              {friend.username && (
                                <p className="text-gray-400 text-[11px] md:text-xs max-w-full truncate">
                                  @{friend.username}
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  
                  {/* Mostrar resultados de búsqueda cuando hay búsqueda */}
                  {!isSearching && recipientSearch.length >= 2 && searchResults.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3 max-h-80 overflow-y-auto custom-scrollbar">
                      {searchResults.map((result) => {
                        const userName = result.firstName && result.lastName
                          ? `${result.firstName} ${result.lastName}`
                          : result.username || result.email?.split('@')[0] || 'Usuario'
                        
                        return (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => handleRecipientSelect(result)}
                            className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.04] px-2.5 py-2 ring-1 ring-inset ring-white/[0.03] backdrop-blur-sm transition-all hover:border-[#66DEDB]/25 hover:ring-[#66DEDB]/20"
                          >
                            <UserAvatar
                              user={{
                                avatar: result.avatar || result.profile?.avatar || null,
                                firstName: result.firstName,
                                lastName: result.lastName,
                                email: result.email,
                                username: result.username,
                              }}
                              size={42}
                            />
                            <div className="min-w-0 text-left">
                              <p className="text-white text-xs md:text-sm max-w-full truncate font-medium">
                                {userName}
                              </p>
                              {result.username && (
                                <p className="text-gray-400 text-[11px] md:text-xs max-w-full truncate">
                                  @{result.username}
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  
                  {/* Mensajes cuando no hay resultados */}
                  {!isLoadingFriends && !isSearching && recipientSearch.length < 2 && friends.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-8">
                      No tienes amigos aún. Usa el buscador para encontrar usuarios.
                    </div>
                  )}
                  
                  {!isSearching && recipientSearch.length >= 2 && searchResults.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-8">
                      No se encontraron usuarios
                    </div>
                  )}
                </div>
              </div>
            ) : recipientInfo ? (
              <div className={`${surface} border-l-[3px] border-l-[#73FFA2]`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className={sectionLabel}>Destinatario</p>
                  {!recipientIdParam && (
                    <button
                      type="button"
                      className="shrink-0 text-xs font-medium text-[#66DEDB] transition-opacity hover:opacity-80"
                      onClick={() => {
                        setRecipientInfo(null)
                        setSelectedRecipientId(null)
                        setEligibility(null)
                        setError(null)
                      }}
                    >
                      Cambiar
                    </button>
                  )}
                </div>
                <div className="flex items-start gap-4">
                  {recipientInfo.avatar ? (
                    <div className="flex-shrink-0">
                      <img
                        src={recipientInfo.avatar}
                        alt={recipientInfo.name}
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10"
                      />
                    </div>
                  ) : (
                    <span className="flex-shrink-0 text-2xl">🎁</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-medium text-zinc-100">{recipientInfo.name}</p>
                    {recipientInfo.username && (
                      <p className="text-sm text-zinc-500">@{recipientInfo.username}</p>
                    )}
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                      La dirección de envío la tomamos del destinatario.
                    </p>
                  </div>
                </div>
                
                {/* Estado de elegibilidad */}
                {isCheckingEligibility ? (
                  <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 ring-1 ring-inset ring-white/[0.04] backdrop-blur-sm">
                    <p className="text-sm text-zinc-500">Validando elegibilidad…</p>
                  </div>
                ) : eligibility ? (
                  (() => {
                    const recipientFlowOk =
                      eligibility.canReceive && eligibility.canSendGift !== false
                    const productRecipientOk = eligibility.giftProductAllowed !== false
                    const allOk = recipientFlowOk && productRecipientOk
                    return (
                      <div
                        className={`mt-5 rounded-xl px-3 py-2.5 text-sm ring-1 ${
                          allOk
                            ? 'bg-[#73FFA2]/[0.07] text-[#73FFA2] ring-[#73FFA2]/25'
                            : 'bg-red-950/40 text-red-400 ring-red-500/30'
                        }`}
                      >
                        {allOk ? (
                          <p>Puede recibir este regalo.</p>
                        ) : (
                          <div className="space-y-2 text-sm">
                            {(!eligibility.canReceive || eligibility.canSendGift === false) && (
                              <p className="text-red-400">
                                ✗{' '}
                                {eligibility.reason ||
                                  eligibility.sendGiftReason ||
                                  'No puede recibir regalos'}
                              </p>
                            )}
                            {recipientFlowOk && eligibility.giftProductAllowed === false && (
                              <p className="text-red-400">
                                ✗{' '}
                                {eligibility.giftProductReason ||
                                  'Este producto no puede enviarse a un destinatario menor de edad'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()
                ) : null}
              </div>
            ) : null}

            {/* Información del producto */}
            {productInfo && (
              <div className={surface}>
                <p className={sectionLabel}>Producto</p>
                <div className="flex gap-5">
                  {productInfo.product?.thumbnail && (
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/25 ring-1 ring-inset ring-white/[0.04] backdrop-blur-sm">
                      <Image
                        src={productInfo.product.thumbnail}
                        alt={productInfo.product.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-zinc-100">{productInfo.product?.title}</h3>
                    {productInfo.variant?.title && (
                      <p className="mt-1 text-sm text-zinc-500">{productInfo.variant.title}</p>
                    )}
                    <p className="mt-3 text-lg font-semibold tabular-nums text-[#66DEDB]">
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                      }).format(productInfo.price || 0)}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">Cantidad · {quantity}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Información de contacto */}
            <div className={surface}>
              <p className={sectionLabel}>Contacto</p>
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-500">
                  Correo (facturación)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-2xl bg-red-950/25 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/25">
                {error}
              </div>
            )}
          </div>

          {/* Columna pago / total */}
          <div className="lg:col-span-5">
            <div className="space-y-6 lg:sticky lg:top-28">
              <div className={surface}>
                <p className={sectionLabel}>Resumen</p>
                {productInfo ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4 text-zinc-400">
                      <span>Subtotal</span>
                      <span className="tabular-nums text-zinc-200">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0,
                        }).format(total)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-white/[0.08] pt-3">
                      <span className="font-medium text-zinc-100">Total</span>
                      <span className="text-lg font-semibold tabular-nums text-[#73FFA2]">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0,
                        }).format(total)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600">Envío incluido en el precio.</p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">Cargando…</p>
                )}
              </div>

              <div className={surface}>
                <p className={sectionLabel}>Pago</p>
                <p className="text-sm text-zinc-500">
                  Pasarela segura con Epayco.
                </p>
                <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 ring-1 ring-inset ring-white/[0.04] backdrop-blur-sm">
                  <p className="text-sm font-medium text-[#66DEDB]">Epayco</p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !epaycoReady ||
                  !productInfo ||
                  isLoading ||
                  (!selectedRecipientId && !recipientIdParam) ||
                  !eligibility ||
                  !eligibility.canReceive ||
                  eligibility.canSendGift === false ||
                  eligibility.giftProductAllowed === false
                }
                className="w-full py-2.5 font-semibold text-sm sm:py-3 sm:text-base hover:!bg-[#5ac8c4] disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: '#66DEDB',
                  color: '#2C3137',
                  borderRadius: '25px',
                  boxShadow: '0px 4px 4px 0px #00000040 inset',
                }}
              >
                {isLoading ? 'Cargando...' : isSubmitting ? 'Procesando...' : 'Completar pedido'}
              </Button>
            </div>
          </div>
        </div>
      </form>

        {/* Script de Epayco */}
        <Script
          id="epayco-script"
          src={getEpaycoScriptUrlForMode()}
          strategy="afterInteractive"
          onLoad={() => {
            console.log('[EPAYCO] Script cargado exitosamente')
            setEpaycoReady(true)
          }}
          onError={(e) => {
            console.error('[EPAYCO] Error cargando script:', e)
            setEpaycoReady(false)
          }}
          onReady={() => {
            console.log('[EPAYCO] Script listo')
            if (typeof window.ePayco !== 'undefined') {
              setEpaycoReady(true)
            }
          }}
        />
        </div>
      </div>
      </div>
    </>
  )
}

// Componente principal con Suspense boundary
export default function GiftDirectCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-gray-400">Cargando...</div>
      </div>
    }>
      <GiftDirectCheckoutContent />
    </Suspense>
  )
}
