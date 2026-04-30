'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { extractApiErrorMessage } from '@/lib/api/errors'
import { emailPublicAssetsBase, publicSiteUrl } from '@/lib/config'
import { showNotification } from '@/components/notifications'
import { ArrowLeftIcon, EnvelopeIcon, EyeIcon, GiftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

interface EmailTestResponse {
  success: boolean
  error?: string
}

interface GiftPreviewResponse {
  success: boolean
  data?: { message?: string }
  error?: string
}

interface GiftPreviewRenderApiResponse {
  success: boolean
  data?: { html?: string; text?: string }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function demoAssetUrl(fileName: string) {
  return `${emailPublicAssetsBase}/${encodeURIComponent(fileName)}`
}

function mentionsLocalHost(s: string) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(s)
}

export default function EmailTestSettingsPage() {
  const { isAuthenticated, user, _hasHydrated: hasHydrated } = useAdminAuthStore()

  const [to, setTo] = useState('')
  const [sendingSimple, setSendingSimple] = useState(false)

  const [giftTo, setGiftTo] = useState('')
  const [giftSenderName, setGiftSenderName] = useState('Danna')
  const [giftAvatarUrl, setGiftAvatarUrl] = useState(demoAssetUrl('tanku-email-icon-user.png'))
  const [giftProductTitle, setGiftProductTitle] = useState('Tenis Nike Retro')
  const [giftProductImg, setGiftProductImg] = useState(demoAssetUrl('tennis.png'))
  const [giftPrice, setGiftPrice] = useState('$200.000')
  const [giftMessage, setGiftMessage] = useState(
    'Espero que te gusten, los elegí pensando en ti. ¡Disfrútalos!'
  )
  const [giftCta, setGiftCta] = useState(`${publicSiteUrl}/profile?tab=MIS_TANKUS`)
  const [giftAssetBase, setGiftAssetBase] = useState(emailPublicAssetsBase)
  const [sendingGift, setSendingGift] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (!user?.email) return
    setTo((prev) => (prev ? prev : user.email))
    setGiftTo((prev) => (prev ? prev : user.email))
  }, [user?.email])

  const resetGiftDemoDefaults = () => {
    setGiftSenderName('Danna')
    setGiftAvatarUrl(demoAssetUrl('tanku-email-icon-user.png'))
    setGiftProductTitle('Tenis Nike Retro')
    setGiftProductImg(demoAssetUrl('tennis.png'))
    setGiftPrice('$200.000')
    setGiftMessage('Espero que te gusten, los elegí pensando en ti. ¡Disfrútalos!')
    setGiftCta(`${publicSiteUrl}/profile?tab=MIS_TANKUS`)
    setGiftAssetBase(emailPublicAssetsBase)
    showNotification('Valores demo restaurados (URL pública configurada)', 'success')
  }

  const getGiftPreviewRequestBody = () => ({
    senderDisplayName: giftSenderName.trim() || 'Danna',
    senderAvatarUrl: giftAvatarUrl.trim(),
    productTitle: giftProductTitle.trim(),
    productImageUrl: giftProductImg.trim(),
    productPriceLabel: giftPrice.trim(),
    messageBody: giftMessage.trim(),
    ctaUrl: giftCta.trim(),
    assetBase: giftAssetBase.trim(),
  })

  const handleOpenGiftHtmlPreview = async () => {
    try {
      setPreviewLoading(true)
      const response = await apiClient.post<GiftPreviewRenderApiResponse>(
        API_ENDPOINTS.ADMIN.SYSTEM.EMAIL_GIFT_PREVIEW_RENDER,
        getGiftPreviewRequestBody()
      )

      const html = response.data?.success ? response.data.data?.html : undefined
      if (!html) {
        showNotification('No se pudo generar la vista previa HTML', 'error')
        return
      }

      const blob = new Blob([html], { type: 'text/html;charset=UTF-8' })
      const blobUrl = URL.createObjectURL(blob)
      const w = window.open(blobUrl, '_blank', 'noopener,noreferrer')

      if (!w) {
        URL.revokeObjectURL(blobUrl)
        showNotification('Permití ventanas emergentes para ver la vista previa', 'error')
        return
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000)
    } catch (err: unknown) {
      showNotification(extractApiErrorMessage(err), 'error')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSendTestEmail = async () => {
    const trimmedEmail = to.trim()
    if (!trimmedEmail) {
      showNotification('Ingresa un correo de destino', 'error')
      return
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      showNotification('Ingresa un correo válido', 'error')
      return
    }

    try {
      setSendingSimple(true)
      const response = await apiClient.post<EmailTestResponse>(API_ENDPOINTS.EMAIL.TEST, {
        to: trimmedEmail,
      })

      if (response.data.success) {
        showNotification(`Correo simple de prueba enviado a ${trimmedEmail}`, 'success')
      } else {
        showNotification(response.data.error || 'No se pudo enviar el correo de prueba', 'error')
      }
    } catch (err: unknown) {
      showNotification(extractApiErrorMessage(err) || 'Error al enviar el correo de prueba', 'error')
    } finally {
      setSendingSimple(false)
    }
  }

  const handleSendGiftPreview = async () => {
    const trimmed = giftTo.trim()
    if (!trimmed) {
      showNotification('Ingresa el correo de destino para la plantilla regalo', 'error')
      return
    }
    if (!EMAIL_RE.test(trimmed)) {
      showNotification('Correo de destino inválido', 'error')
      return
    }

    try {
      setSendingGift(true)
      const response = await apiClient.post<GiftPreviewResponse>(API_ENDPOINTS.ADMIN.SYSTEM.EMAIL_GIFT_PREVIEW, {
        to: trimmed,
        ...getGiftPreviewRequestBody(),
      })

      if (response.data.success) {
        showNotification(response.data.data?.message || `Plantilla enviada a ${trimmed}`, 'success')
      } else {
        showNotification(response.data.error || 'No se pudo enviar la plantilla regalo', 'error')
      }
    } catch (err: unknown) {
      showNotification(extractApiErrorMessage(err), 'error')
    } finally {
      setSendingGift(false)
    }
  }

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Volver a ajustes
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <EnvelopeIcon className="w-6 h-6 text-blue-600" />
            Correo simple (SMTP / proveedor)
          </h1>
          <p className="text-sm text-gray-600 mb-5">
            Plantilla interna mínima para confirmar credenciales y entrega sin HTML complejo.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label htmlFor="email-test-to" className="block text-xs font-medium text-gray-500 mb-1">
                Correo de destino
              </label>
              <input
                id="email-test-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="cuenta donde recibirás la prueba"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={sendingSimple}
              className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              {sendingSimple ? 'Enviando...' : 'Enviar prueba simple'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <GiftIcon className="w-6 h-6 text-emerald-600" />
            Plantilla regalo recibido (HTML)
          </h2>
          <p className="text-sm text-gray-600 mb-5">
            Previsualización con datos falsos configurable. Por defecto usa imágenes publicadas en{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">{emailPublicAssetsBase}</code> — tenis{' '}
            <code className="text-xs bg-gray-100 px-1">tennis.png</code>, avatar{' '}
            <code className="text-xs bg-gray-100 px-1">tanku-email-icon-user.png</code> e iconos{' '}
            <code className="text-xs bg-gray-100 px-1">tanku-email-icon-*.png</code>.
            Requiere sesión ERP (JWT admin). El correo sólo usa el backend; las imágenes las pide Gmail desde internet usando la URL absoluta HTTPS que indiques (archivos del{' '}
            <code className="text-xs bg-gray-100 px-1">tanku-front/public/email</code> cuando ese front está online). Si ves error de
            red/CORS en consola: en <code className="text-xs">tanku-backend/.env</code> agrega{' '}
            <code className="text-xs">http://localhost:3001</code> a <code className="text-xs">CORS_ORIGINS</code>.
          </p>

          {(mentionsLocalHost(giftAssetBase) ||
            mentionsLocalHost(giftAvatarUrl) ||
            mentionsLocalHost(giftProductImg)) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950 text-sm p-3 mb-4 leading-relaxed">
              <strong>Gmail no puede abrir localhost.</strong> Pegaste o usás URLs con{' '}
              <code className="text-xs">localhost</code>: los servidores de Google intentan descargarlas desde ellos mismos,
              no desde tu PC. Poné como base URLs públicas donde ya esté desplegado el front (
              <code className="text-xs break-all">{emailPublicAssetsBase}</code>) o configurá{' '}
              <code className="text-xs">NEXT_PUBLIC_EMAIL_PUBLIC_ASSETS_BASE</code> /{' '}
              <code className="text-xs">NEXT_PUBLIC_PUBLIC_SITE_URL</code> en <code className="text-xs">tanku-admin</code>{' '}
              y pulsá «Restaurar demo».
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Correo de destino (cuenta)</label>
              <input
                type="email"
                value={giftTo}
                onChange={(e) => setGiftTo(e.target.value)}
                placeholder="tu@ejemplo.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre quien envía</label>
                <input
                  type="text"
                  value={giftSenderName}
                  onChange={(e) => setGiftSenderName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Precio mostrado (texto)</label>
                <input
                  type="text"
                  value={giftPrice}
                  onChange={(e) => setGiftPrice(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Título producto</label>
              <input
                type="text"
                value={giftProductTitle}
                onChange={(e) => setGiftProductTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">URL imagen avatar (remitente)</label>
              <input
                type="url"
                value={giftAvatarUrl}
                onChange={(e) => setGiftAvatarUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">URL imagen producto</label>
              <input
                type="url"
                value={giftProductImg}
                onChange={(e) => setGiftProductImg(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje (cita)</label>
              <textarea
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Botón «Ver mi regalo» → URL</label>
              <input
                type="url"
                value={giftCta}
                onChange={(e) => setGiftCta(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Base pública donde están los <code className="text-xs bg-gray-100 px-1">tanku-email-*</code> (Next{' '}
                <code className="text-xs bg-gray-100 px-1">public/email</code>)
              </label>
              <input
                type="url"
                value={giftAssetBase}
                onChange={(e) => setGiftAssetBase(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ejemplo público por defecto: <strong>{emailPublicAssetsBase}</strong>. Para otro dominio configurá{' '}
                <code className="text-xs">NEXT_PUBLIC_EMAIL_PUBLIC_ASSETS_BASE</code>.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenGiftHtmlPreview}
                disabled={previewLoading || sendingGift}
                className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg border border-emerald-600 bg-white text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
              >
                <EyeIcon className="w-4 h-4" />
                {previewLoading ? 'Generando…' : 'Vista previa en navegador'}
              </button>
              <button
                type="button"
                onClick={handleSendGiftPreview}
                disabled={sendingGift || previewLoading}
                className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                {sendingGift ? 'Enviando…' : 'Enviar plantilla regalo (prueba ERP)'}
              </button>
              <button
                type="button"
                onClick={resetGiftDemoDefaults}
                className="inline-flex px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                Restaurar demo www.mytanku.com
              </button>
            </div>
            <p className="text-xs text-gray-500 pt-1">
              La vista previa abre el mismo HTML que se envía por correo. Si las URLs de imágenes son públicas (p. ej.{' '}
              mytanku.com), se verán igual que en Gmail; con localhost solo se verán en tu máquina al abrir la pestaña.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
