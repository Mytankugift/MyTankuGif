/**
 * Helpers compartidos para /stalkergift/preview-cards (sin BD).
 */
import type { OrderDTO, ProductDTO, ProductVariantDTO, StalkerGiftDTO, User } from '@/types/api'

export const DEMO_IMG = '/icons_tanku/tanku_logo_menu_stalkergift_verde.svg'

export const FLOW_VARIANT: ProductVariantDTO = {
  id: 'var-demo-flow',
  sku: 'SKU-FLOW',
  title: 'Talla M · Negro',
  tankuPrice: 89000,
  stock: 10,
  active: true,
  attributes: null,
}

export const FLOW_BASE_PRODUCT: ProductDTO = {
  id: 'prod-demo-flow',
  title: 'Poster Tanku · flujo demo',
  handle: 'poster-flow',
  description: null,
  images: [DEMO_IMG],
  active: true,
  category: null,
  variants: [],
}

export const mockReceiverUser: User = {
  id: 'user-receiver',
  email: 'receptor@demo.tanku',
  firstName: 'Alex',
  lastName: 'Demo',
  username: 'alex_demo',
  phone: null,
  profile: { avatar: null, banner: null, bio: null },
}

export const MOCK_REMOTE_SENDER_ID = 'user-sender-remoto'

const nowIso = () => new Date().toISOString()

export function giftBaseFlow(partial: Partial<StalkerGiftDTO> & Pick<StalkerGiftDTO, 'estado' | 'id'>): StalkerGiftDTO {
  const now = nowIso()
  return {
    id: partial.id,
    senderId: partial.senderId ?? 'sender-demo',
    receiverId: partial.receiverId ?? mockReceiverUser.id,
    externalReceiverData: partial.externalReceiverData ?? null,
    productId: FLOW_BASE_PRODUCT.id,
    variantId: FLOW_VARIANT.id,
    quantity: partial.quantity ?? 1,
    estado: partial.estado,
    paymentId: null,
    paymentStatus: 'mock',
    paymentMethod: 'MOCK',
    transactionId: null,
    senderAlias: partial.senderAlias ?? 'Fan StalkerGift',
    senderMessage: partial.senderMessage ?? 'Mensaje demo del flujo.',
    uniqueLink: partial.uniqueLink ?? null,
    linkToken: partial.linkToken ?? null,
    orderId: partial.orderId ?? null,
    chatEnabled: partial.chatEnabled ?? false,
    conversationId: partial.conversationId ?? null,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    acceptedAt: partial.acceptedAt ?? null,
    product: partial.product ?? FLOW_BASE_PRODUCT,
    variant: partial.variant ?? FLOW_VARIANT,
    receiver: partial.receiver,
    sender: partial.sender,
    order: partial.order,
  }
}

/** Línea de orden mínima (regalo Dropi opcional por ítem). */
export function mockOrderPiece(opts: {
  id: string
  viewerAsReceiverPartyId: string
  status: OrderDTO['status']
  titleSuffix?: string
  stalkerSg: Omit<NonNullable<OrderDTO['stalkerGift']>, 'senderMessage'> & { senderMessage?: string | null }
  dropiStatus?: string | null
  address?: OrderDTO['address']
  price?: number
}): OrderDTO {
  const now = nowIso()
  const price = opts.price ?? 150000
  const sg: NonNullable<OrderDTO['stalkerGift']> = {
    ...opts.stalkerSg,
    senderMessage: opts.stalkerSg.senderMessage ?? null,
  }
  return {
    id: opts.id,
    userId: opts.viewerAsReceiverPartyId,
    email: mockReceiverUser.email,
    status: opts.status,
    paymentStatus: 'paid',
    paymentMethod: 'mock',
    total: price,
    subtotal: price,
    shippingTotal: 0,
    isStalkerGift: true,
    stalkerGift: sg,
    items: [
      {
        id: `${opts.id}-line`,
        productId: FLOW_BASE_PRODUCT.id,
        variantId: FLOW_VARIANT.id,
        quantity: 1,
        price,
        finalPrice: price,
        dropiStatus: opts.dropiStatus ?? null,
        dropiOrderId: null,
        dropiShippingCost: null,
        dropiDropshipperWin: null,
        product: {
          id: FLOW_BASE_PRODUCT.id,
          title: `${FLOW_BASE_PRODUCT.title}${opts.titleSuffix ?? ''}`,
          handle: FLOW_BASE_PRODUCT.handle,
          images: [DEMO_IMG],
        },
        variant: {
          id: FLOW_VARIANT.id,
          title: FLOW_VARIANT.title,
          price,
        },
      },
    ],
    address: opts.address ?? null,
    createdAt: now,
    updatedAt: now,
  }
}

/** Orden vistas que pagó (sender) — `stalkerGift.senderId === viewerSenderId`. */
export function mockOrderSenderView(opts: {
  id: string
  viewerSenderId: string
  receiverPartyId: string
  status: OrderDTO['status']
  suffix?: string
  price?: number
}): OrderDTO {
  const price = opts.price ?? 150000
  const now = nowIso()
  return {
    id: opts.id,
    userId: opts.receiverPartyId,
    email: mockReceiverUser.email,
    status: opts.status,
    paymentStatus: 'paid',
    paymentMethod: 'PSE demo',
    total: price,
    subtotal: price,
    shippingTotal: 0,
    isStalkerGift: true,
    stalkerGift: {
      id: `sg-${opts.id}`,
      senderId: opts.viewerSenderId,
      receiverId: opts.receiverPartyId,
      senderAlias: 'Yo (demo)',
      senderMessage: null,
    },
    items: [
      {
        id: `${opts.id}-line`,
        productId: FLOW_BASE_PRODUCT.id,
        variantId: FLOW_VARIANT.id,
        quantity: 1,
        price,
        finalPrice: price,
        dropiStatus:
          ['delivered', 'entregado'].includes(opts.status.toLowerCase())
            ? 'DELIVERED'
            : opts.status.toLowerCase() === 'shipped'
              ? 'SHIPPED'
              : 'PROCESSING',
        product: {
          id: FLOW_BASE_PRODUCT.id,
          title: `${FLOW_BASE_PRODUCT.title}${opts.suffix ?? ''}`,
          handle: FLOW_BASE_PRODUCT.handle,
          images: [DEMO_IMG],
        },
        variant: {
          id: FLOW_VARIANT.id,
          title: FLOW_VARIANT.title,
          price,
        },
      },
    ],
    address: null,
    createdAt: now,
    updatedAt: now,
  }
}
