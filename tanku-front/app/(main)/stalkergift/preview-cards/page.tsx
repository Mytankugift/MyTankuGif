'use client'

/**
 * Demostración visual de StalkerGiftCard con datos mock (solo front, sin BD).
 * URL: /stalkergift/preview-cards
 * En producción devuelve 404.
 */

import { useMemo } from 'react'
import { notFound } from 'next/navigation'
import { StalkerGiftOrdersTab } from '@/components/profile/stalkergift-orders-tab'
import { StalkerGiftCard } from '@/components/stalkergift/stalkergift-card'
import { StalkerGiftFlowTimeline } from '@/components/stalkergift/stalkergift-flow-timeline'
import { useAuthStore } from '@/lib/stores/auth-store'
import { getMisTankusPeriodRange } from '@/lib/utils/mis-tankus-period'
import type { OrderDTO, ProductDTO, ProductVariantDTO, StalkerGiftDTO, User } from '@/types/api'

const DEMO_IMG = '/icons_tanku/tanku_logo_menu_stalkergift_verde.svg'

const variant: ProductVariantDTO = {
  id: 'var-demo',
  sku: 'SKU-DEMO',
  title: 'Talla M · Negro',
  tankuPrice: 89000,
  stock: 10,
  active: true,
  attributes: null,
}

const baseProduct: ProductDTO = {
  id: 'prod-demo',
  title: 'Poster Tanku edición demo',
  handle: 'poster-tanku-demo',
  description: null,
  images: [DEMO_IMG],
  active: true,
  category: null,
  variants: [],
}

const mockReceiver: User = {
  id: 'user-receiver',
  email: 'receptor@demo.tanku',
  firstName: 'Alex',
  lastName: 'Demo',
  username: 'alex_demo',
  phone: null,
  profile: { avatar: null, banner: null, bio: null },
}

/**
 * Órdenes mock del bloque «donde pagaste».
 * - Sin sesión: `userId` = receptor; sin `stalkerGift` → el visitante cuenta como pagador (`userId !== user?.id`).
 * - Con sesión: mismo `userId`; `stalkerGift.senderId === user.id` para marcar vista de pagador de forma estable.
 */
function buildMockSenderOrders(viewerId: string | undefined): OrderDTO[] {
  const now = new Date().toISOString()
  const receiverUserId = mockReceiver.id

  const sg = (orderId: string) =>
    viewerId
      ? {
          stalkerGift: {
            id: `sg-${orderId}`,
            senderId: viewerId,
            receiverId: receiverUserId,
            senderAlias: 'Tu alias (demo)',
            senderMessage: null,
          },
        }
      : { stalkerGift: null as OrderDTO['stalkerGift'] }

  const itemBase = {
    productId: baseProduct.id,
    variantId: variant.id,
    quantity: 1,
    price: 140000,
    finalPrice: 140000,
    product: {
      id: baseProduct.id,
      title: baseProduct.title,
      handle: baseProduct.handle,
      images: [DEMO_IMG],
    },
    variant: {
      id: variant.id,
      title: variant.title,
      price: 140000,
    },
  }

  return [
    {
      id: 'order-mock-sender-001',
      userId: receiverUserId,
      email: mockReceiver.email,
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'PSE',
      total: 155000,
      subtotal: 140000,
      shippingTotal: 15000,
      isStalkerGift: true,
      ...sg('order-mock-sender-001'),
      items: [
        {
          id: 'line-mock-1',
          ...itemBase,
        },
      ],
      address: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'order-mock-sender-002',
      userId: receiverUserId,
      email: mockReceiver.email,
      status: 'shipped',
      paymentStatus: 'paid',
      paymentMethod: 'Tarjeta',
      total: 89000,
      subtotal: 89000,
      shippingTotal: 0,
      isStalkerGift: true,
      ...sg('order-mock-sender-002'),
      items: [
        {
          id: 'line-mock-2',
          productId: baseProduct.id,
          variantId: variant.id,
          quantity: 1,
          price: 89000,
          finalPrice: 89000,
          product: {
            id: baseProduct.id,
            title: `${baseProduct.title} (enviado)`,
            handle: baseProduct.handle,
            images: [DEMO_IMG],
          },
          variant: {
            id: variant.id,
            title: variant.title,
            price: 89000,
          },
        },
      ],
      address: null,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

const MOCK_REMOTE_SENDER_ID = 'user-sender-remoto'

/**
 * Órdenes mock del bloque «vista receptor» (Mis StalkerGift → Recibidos → Órdenes).
 * `stalkerGift.senderId` ≠ quien navega ⇒ `isSender` falso ⇒ título «Regalo recibido», sin precios de pagador.
 */
function buildMockReceiverOrders(viewerId: string | undefined): OrderDTO[] {
  const now = new Date().toISOString()
  /** Receptor narrativo en la orden (coincide con tu sesión si hay login). */
  const receiverPartyId = viewerId ?? mockReceiver.id

  const sgBase = {
    stalkerGift: {
      id: '',
      senderId: MOCK_REMOTE_SENDER_ID,
      receiverId: receiverPartyId,
      senderAlias: 'Fan secreto (demo)',
      senderMessage: 'Para ti, con cariño (orden mock).',
    },
  }

  const itemLine = (lineId: string, titleSuffix: string, priceCents: number) => ({
    id: lineId,
    productId: baseProduct.id,
    variantId: variant.id,
    quantity: 1,
    price: priceCents,
    finalPrice: priceCents,
    product: {
      id: baseProduct.id,
      title: `${baseProduct.title}${titleSuffix}`,
      handle: baseProduct.handle,
      images: [DEMO_IMG],
    },
    variant: {
      id: variant.id,
      title: variant.title,
      price: priceCents,
    },
  })

  const demoAddress: NonNullable<OrderDTO['address']> = {
    firstName: mockReceiver.firstName ?? 'Alex',
    lastName: mockReceiver.lastName ?? 'Demo',
    phone: '3001234567',
    address1: 'Calle Demo 123',
    address2: null,
    city: 'Bogotá',
    state: 'Cundinamarca',
    postalCode: '110111',
    country: 'CO',
  }

  return [
    {
      id: 'order-mock-receiver-001',
      userId: receiverPartyId,
      email: mockReceiver.email,
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: '—',
      total: 165000,
      subtotal: 150000,
      shippingTotal: 15000,
      isStalkerGift: true,
      stalkerGift: { ...sgBase.stalkerGift, id: 'sg-recv-001' },
      items: [itemLine('line-recv-1', ' · en preparación', 150000)],
      address: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'order-mock-receiver-002',
      userId: receiverPartyId,
      email: mockReceiver.email,
      status: 'shipped',
      paymentStatus: 'paid',
      paymentMethod: '—',
      total: 99000,
      subtotal: 99000,
      shippingTotal: 0,
      isStalkerGift: true,
      stalkerGift: { ...sgBase.stalkerGift, id: 'sg-recv-002' },
      items: [itemLine('line-recv-2', ' · en camino', 99000)],
      address: demoAddress,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function giftBase(partial: Partial<StalkerGiftDTO> & Pick<StalkerGiftDTO, 'estado' | 'id'>): StalkerGiftDTO {
  const now = new Date().toISOString()
  return {
    id: partial.id,
    senderId: 'sender-demo',
    receiverId: partial.receiverId ?? 'user-receiver',
    externalReceiverData: partial.externalReceiverData ?? null,
    productId: baseProduct.id,
    variantId: variant.id,
    quantity: partial.quantity ?? 1,
    estado: partial.estado,
    paymentId: null,
    paymentStatus: 'mock',
    paymentMethod: 'MOCK',
    transactionId: null,
    senderAlias: partial.senderAlias ?? 'Fan StalkerGift',
    senderMessage: partial.senderMessage ?? 'Mensaje de ejemplo para la card de prueba.',
    uniqueLink: partial.uniqueLink ?? null,
    linkToken: partial.linkToken ?? null,
    orderId: partial.orderId ?? null,
    chatEnabled: partial.chatEnabled ?? false,
    conversationId: partial.conversationId ?? null,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    acceptedAt: partial.acceptedAt ?? null,
    product: partial.product ?? baseProduct,
    variant: partial.variant ?? variant,
    receiver: partial.receiver,
    sender: partial.sender,
    order: partial.order,
  }
}

export default function StalkerGiftPreviewCardsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const { user } = useAuthStore()

  const receivedPending = giftBase({
    id: 'mock-recv-wait',
    estado: 'WAITING_ACCEPTANCE',
    senderMessage: 'Pendiente: acepta o rechaza este regalo (demo).',
  })

  const receivedPaid = giftBase({
    id: 'mock-recv-paid',
    estado: 'PAID',
    senderMessage: 'Estado PAID: pagado, aún en flujo (demo).',
  })

  const receivedAccepted = giftBase({
    id: 'mock-recv-ok',
    estado: 'ACCEPTED',
    chatEnabled: true,
    conversationId: 'conv-mock-1',
    orderId: 'order-mock-uuid-1111',
    acceptedAt: new Date().toISOString(),
    senderMessage: 'Aceptado: chat y orden disponibles (demo).',
  })

  const receivedRejected = giftBase({
    id: 'mock-recv-no',
    estado: 'REJECTED',
    senderMessage: 'Este regalo fue rechazado (demo).',
  })

  const sentCreated = giftBase({
    id: 'mock-sent-draft',
    estado: 'CREATED',
    receiverId: null,
    receiver: undefined,
    externalReceiverData: { name: 'Destinatario externo', instagram: '@externo' },
  })

  const sentWaiting = giftBase({
    id: 'mock-sent-wait',
    estado: 'WAITING_ACCEPTANCE',
    uniqueLink: 'https://example.com/stalkergift/link-demo',
    receiver: mockReceiver,
    senderMessage: null,
  })

  const sentAccepted = giftBase({
    id: 'mock-sent-ok',
    estado: 'ACCEPTED',
    receiver: mockReceiver,
    chatEnabled: true,
    conversationId: 'conv-mock-2',
    orderId: 'order-mock-uuid-2222',
    acceptedAt: new Date().toISOString(),
  })

  const mockSenderOrders = useMemo(() => buildMockSenderOrders(user?.id), [user?.id])
  const mockReceiverOrders = useMemo(() => buildMockReceiverOrders(user?.id), [user?.id])
  const ordersTimeRange = useMemo(() => getMisTankusPeriodRange('30d', new Date()), [])

  return (
    <div
      className="min-h-screen px-4 py-8 md:px-8"
      style={{ backgroundColor: 'var(--color-surface-191e23-20, #1a1d22)' }}
    >
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-2 border-b border-white/10 pb-6">
          <h1 className="text-xl font-semibold text-white">Preview StalkerGift (mock, solo front)</h1>
          <p className="text-sm text-gray-400">
            Ruta{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">/stalkergift/preview-cards</code> — no usa base
            de datos. Solo visible en desarrollo.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#66DEDB]">
            Flujo regalo ⇄ orden (mock paso a paso)
          </h2>
          <StalkerGiftFlowTimeline viewerId={user?.id} />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#73FFA2]">Recibidos · pendientes</h2>
          <div className="flex w-full flex-col gap-6">
            <StalkerGiftCard gift={receivedPending} type="received" />
            <StalkerGiftCard gift={receivedPaid} type="received" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#73FFA2]">
            Recibidos · aceptado / rechazado
          </h2>
          <div className="flex w-full flex-col gap-6">
            <StalkerGiftCard gift={receivedAccepted} type="received" />
            <StalkerGiftCard gift={receivedRejected} type="received" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#73FFA2]">Enviados</h2>
          <div className="flex w-full flex-col gap-6">
            <StalkerGiftCard gift={sentCreated} type="sent" />
            <StalkerGiftCard gift={sentWaiting} type="sent" />
            <StalkerGiftCard gift={sentAccepted} type="sent" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#73FFA2]">
            Órdenes · vista de quien recibe (Mis StalkerGift → Recibidos)
          </h2>
          <p className="text-xs text-gray-500">
            <code className="rounded bg-white/5 px-1">StalkerGiftOrdersTab</code> +{' '}
            <code className="rounded bg-white/5 px-1">orderRole=&quot;receiver&quot;</code>. El remitente del regalo es
            otro usuario mock (<code className="rounded bg-white/5 px-1">{MOCK_REMOTE_SENDER_ID}</code>
            ); tú eres el receptor (<code className="rounded bg-white/5 px-1">user-receiver</code> o tu cuenta). La
            segunda orden incluye dirección de envío (visible al abrir detalle). Sin precios de pagador en línea.
          </p>
          <StalkerGiftOrdersTab
            userId="preview-mock-receiver"
            initialOrderId={null}
            providedOrders={mockReceiverOrders}
            skipFetch
            timeRange={ordersTimeRange}
            orderRole="receiver"
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#73FFA2]">
            Órdenes donde pagaste (Mis StalkerGift → Enviados)
          </h2>
          <p className="text-xs text-gray-500">
            <code className="rounded bg-white/5 px-1">StalkerGiftOrdersTab</code> +{' '}
            <code className="rounded bg-white/5 px-1">orderRole=&quot;sender&quot;</code>. Dos órdenes demo (procesando y
            enviada). Con sesión, <code className="rounded bg-white/5 px-1">stalkerGift.senderId</code> coincide con tu
            usuario para la etiqueta «Regalo enviado». Sin sesión usa el mismo criterio que la app (fallback por{' '}
            <code className="rounded bg-white/5 px-1">order.userId</code>).
          </p>
          <StalkerGiftOrdersTab
            userId="preview-mock"
            initialOrderId={null}
            providedOrders={mockSenderOrders}
            skipFetch
            timeRange={ordersTimeRange}
            orderRole="sender"
          />
        </section>
      </div>
    </div>
  )
}
