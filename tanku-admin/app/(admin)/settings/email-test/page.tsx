'use client'

import { useEffect, useState } from 'react'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { AdminSettingsLayout } from '@/components/admin/AdminSettingsLayout'
import { AdminCollapsibleCard } from '@/components/admin/AdminCollapsibleCard'
import { AdminFormSection } from '@/components/admin/AdminFormSection'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { extractApiErrorMessage } from '@/lib/api/errors'
import { emailPublicAssetsBase, publicSiteUrl } from '@/lib/config'
import { showNotification } from '@/components/notifications'
import { EnvelopeIcon, EyeIcon, GiftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

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
  const [giftRecipientAvatarUrl, setGiftRecipientAvatarUrl] = useState(
    demoAssetUrl('tanku-email-icon-user.png')
  )
  const [giftProductTitle, setGiftProductTitle] = useState('Tenis Nike Retro')
  const [giftMessage, setGiftMessage] = useState(
    'Espero que te gusten, los elegí pensando en ti. ¡Disfrútalos!'
  )
  const [giftCta, setGiftCta] = useState(`${publicSiteUrl}/products/demo-producto`)
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
    setGiftRecipientAvatarUrl(demoAssetUrl('tanku-email-icon-user.png'))
    setGiftProductTitle('Tenis Nike Retro')
    setGiftMessage('Espero que te gusten, los elegí pensando en ti. ¡Disfrútalos!')
    setGiftCta(`${publicSiteUrl}/products/demo-producto`)
    setGiftAssetBase(emailPublicAssetsBase)
    showNotification('Valores demo restaurados (URL pública configurada)', 'success')
  }

  const getGiftPreviewRequestBody = () => ({
    senderDisplayName: giftSenderName.trim() || 'Danna',
    senderAvatarUrl: giftAvatarUrl.trim(),
    recipientAvatarUrl: giftRecipientAvatarUrl.trim(),
    productTitle: giftProductTitle.trim(),
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
    <AdminSettingsLayout>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <AdminCollapsibleCard
          title="Correo simple (SMTP)"
          summary="Prueba mínima de entrega"
          defaultOpen
        >
          <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
            <EnvelopeIcon className="w-5 h-5 text-blue-600 shrink-0" />
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
        </AdminCollapsibleCard>

        <AdminCollapsibleCard
          title="Plantilla regalo (HTML)"
          summary={giftProductTitle}
          defaultOpen={false}
        >
          <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
            <GiftIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            HTML de regalo recibido con datos de prueba (requiere PNG y URLs públicas en producción).
          </p>

          <div className="space-y-3">
            <AdminFormSection
              title="Notas técnicas"
              summary="PNG, CORS, Gmail y localhost"
              defaultOpen={false}
            >
              <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                <li>
                  PNG público <code className="text-xs bg-gray-100 px-1">tanku-email-card.png</code> en{' '}
                  <code className="text-xs bg-gray-100 px-1">tanku-front/public/email</code>.
                </li>
                <li>Sesión ERP (JWT admin) para vista previa y envío.</li>
                <li>
                  CORS: agregar <code className="text-xs">http://localhost:3001</code> a{' '}
                  <code className="text-xs">CORS_ORIGINS</code> en el backend si hace falta.
                </li>
              </ul>
              {(mentionsLocalHost(giftAssetBase) ||
                mentionsLocalHost(giftAvatarUrl) ||
                mentionsLocalHost(giftRecipientAvatarUrl)) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950 text-sm p-3 leading-relaxed">
                  <strong>Gmail no puede usar localhost.</strong> Usá URLs públicas (
                  <code className="text-xs break-all">{emailPublicAssetsBase}</code>) o «Restaurar demo».
                </div>
              )}
            </AdminFormSection>

            <AdminFormSection title="Destinatario" summary={giftTo || 'Correo de prueba'} defaultOpen>
              <label className="block text-xs font-medium text-gray-500 mb-1">Correo de destino</label>
              <input
                type="email"
                value={giftTo}
                onChange={(e) => setGiftTo(e.target.value)}
                placeholder="tu@ejemplo.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </AdminFormSection>

            <AdminFormSection
              title="Contenido del regalo"
              summary={`${giftSenderName} · ${giftProductTitle}`}
              defaultOpen
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="block text-xs font-medium text-gray-500 mb-1">Título producto</label>
                  <input
                    type="text"
                    value={giftProductTitle}
                    onChange={(e) => setGiftProductTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje (cita)</label>
                  <textarea
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[100px] resize-y"
                  />
                </div>
              </div>
            </AdminFormSection>

            <AdminFormSection title="URLs e imágenes" summary="Avatars, CTA y carpeta /email" defaultOpen={false}>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">URL avatar remitente</label>
                  <input
                    type="url"
                    value={giftAvatarUrl}
                    onChange={(e) => setGiftAvatarUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">URL avatar destinatario</label>
                  <input
                    type="url"
                    value={giftRecipientAvatarUrl}
                    onChange={(e) => setGiftRecipientAvatarUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Botón «Ver producto» (URL)</label>
                  <input
                    type="url"
                    value={giftCta}
                    onChange={(e) => setGiftCta(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Base pública <code className="text-xs bg-gray-100 px-1">/email</code>
                  </label>
                  <input
                    type="url"
                    value={giftAssetBase}
                    onChange={(e) => setGiftAssetBase(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Por defecto: <strong>{emailPublicAssetsBase}</strong>
                  </p>
                </div>
              </div>
            </AdminFormSection>

            <AdminFormSection title="Enviar o previsualizar" defaultOpen>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleOpenGiftHtmlPreview}
                  disabled={previewLoading || sendingGift}
                  className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg border border-emerald-600 bg-white text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                >
                  <EyeIcon className="w-4 h-4" />
                  {previewLoading ? 'Generando…' : 'Vista previa'}
                </button>
                <button
                  type="button"
                  onClick={handleSendGiftPreview}
                  disabled={sendingGift || previewLoading}
                  className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  {sendingGift ? 'Enviando…' : 'Enviar plantilla'}
                </button>
                <button
                  type="button"
                  onClick={resetGiftDemoDefaults}
                  className="inline-flex px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Restaurar demo
                </button>
              </div>
              <p className="text-xs text-gray-500">
                La vista previa usa el mismo HTML que el correo enviado.
              </p>
            </AdminFormSection>
          </div>
        </AdminCollapsibleCard>
      </div>
    </AdminSettingsLayout>
  )
}
