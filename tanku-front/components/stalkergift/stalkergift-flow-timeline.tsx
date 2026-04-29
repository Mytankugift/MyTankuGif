'use client'

/**
 * Cronología demo del producto — misma URL que otros previews.
 * Dos columnas: vista receptora vs vista de quien paga/comparte link.
 */

import React, { useMemo } from 'react'
import { StalkerGiftOrdersTab } from '@/components/profile/stalkergift-orders-tab'
import { StalkerGiftCard } from '@/components/stalkergift/stalkergift-card'
import { getMisTankusPeriodRange } from '@/lib/utils/mis-tankus-period'
import {
  giftBaseFlow,
  mockReceiverUser,
  mockOrderPiece,
  mockOrderSenderView,
  MOCK_REMOTE_SENDER_ID,
} from '@/components/stalkergift/stalkergift-preview-mocks'

interface FlowStepDefinition {
  step: number
  title: string
  caption: string
  gift?: React.ReactNode
  order?: React.ReactNode
  proposal: string
}

export function StalkerGiftFlowTimeline({ viewerId }: { viewerId?: string }) {
  const receiverPartyId = viewerId ?? mockReceiverUser.id
  const senderViewerId = viewerId ?? 'preview-sender-session'
  /** Incluye fechas ISO recientes del mock (`now()`). */
  const timeRange = useMemo(() => getMisTankusPeriodRange('30d', new Date()), [])

  const receiverOrders = useMemo(
    () => [
      mockOrderPiece({
        id: 'flow-recv-processing',
        viewerAsReceiverPartyId: receiverPartyId,
        status: 'processing',
        titleSuffix: ' · paso orden',
        stalkerSg: {
          id: 'sg-flow-1',
          senderId: MOCK_REMOTE_SENDER_ID,
          receiverId: receiverPartyId,
          senderAlias: 'Fan anónimo',
        },
      }),
      mockOrderPiece({
        id: 'flow-recv-ship',
        viewerAsReceiverPartyId: receiverPartyId,
        status: 'shipped',
        titleSuffix: ' · en camino',
        stalkerSg: {
          id: 'sg-flow-2',
          senderId: MOCK_REMOTE_SENDER_ID,
          receiverId: receiverPartyId,
          senderAlias: 'Fan anónimo',
        },
        dropiStatus: 'SHIPPED',
        address: {
          firstName: 'Alex',
          lastName: 'Demo',
          phone: '3000000000',
          address1: 'Calle Demo 123',
          address2: null,
          city: 'Bogotá',
          state: 'Cundinamarca',
          postalCode: '111',
          country: 'CO',
        },
        price: 165000,
      }),
      mockOrderPiece({
        id: 'flow-recv-delivered',
        viewerAsReceiverPartyId: receiverPartyId,
        status: 'delivered',
        titleSuffix: ' · entregado',
        stalkerSg: {
          id: 'sg-flow-3',
          senderId: MOCK_REMOTE_SENDER_ID,
          receiverId: receiverPartyId,
          senderAlias: 'Fan anónimo',
        },
        dropiStatus: 'DELIVERED',
        address: {
          firstName: 'Alex',
          lastName: 'Demo',
          phone: '3000000000',
          address1: 'Calle Demo 123',
          address2: null,
          city: 'Bogotá',
          state: 'Cundinamarca',
          postalCode: '111',
          country: 'CO',
        },
        price: 165000,
      }),
    ],
    [receiverPartyId],
  )

  const senderOrders = useMemo(
    () => [
      mockOrderSenderView({
        id: 'flow-snd-processing',
        viewerSenderId: senderViewerId,
        receiverPartyId: mockReceiverUser.id,
        status: 'processing',
        suffix: ' · orden nueva',
      }),
      mockOrderSenderView({
        id: 'flow-snd-shipped',
        viewerSenderId: senderViewerId,
        receiverPartyId: mockReceiverUser.id,
        status: 'shipped',
        suffix: ' · en ruta',
        price: 165000,
      }),
      mockOrderSenderView({
        id: 'flow-snd-done',
        viewerSenderId: senderViewerId,
        receiverPartyId: mockReceiverUser.id,
        status: 'delivered',
        suffix: ' · completado',
        price: 165000,
      }),
    ],
    [senderViewerId],
  )

  const receiverSteps: FlowStepDefinition[] = [
    {
      step: 1,
      title: 'Decisión del regalo (sin orden de tienda aún)',
      caption: 'Solo fichas de «Regalo»: aceptar o rechazar. La orden física aparece después de aceptar y que el sistema genere pedido.',
      gift: (
        <StalkerGiftCard
          gift={giftBaseFlow({
            id: 'flow-recv-step1',
            estado: 'WAITING_ACCEPTANCE',
            senderMessage: 'Cuando pulses Aceptar, el flujo creará/recuperará la orden Demo.',
          })}
          type="received"
        />
      ),
      proposal:
        'En producción ideal: mismo `stalkergift_id` enlaza card + orden cuando exista.',
    },
    {
      step: 2,
      title: 'Rechazo',
      caption: 'Ya no hay pedido fulfilment por este regalo.',
      gift: (
        <StalkerGiftCard
          gift={giftBaseFlow({
            id: 'flow-recv-step2',
            estado: 'REJECTED',
            senderMessage: 'No se genera orden de envío.',
          })}
          type="received"
        />
      ),
      proposal: 'Mostrar sólo historia / razón rechazo según política.',
    },
    {
      step: 3,
      title: 'Aceptado pero pedido pendiente',
      caption: `Regalo ACCEPTED sin \`orderId\` hasta que Dropship/tienda emita orden.`,
      gift: (
        <StalkerGiftCard
          gift={giftBaseFlow({
            id: 'flow-recv-step3',
            estado: 'ACCEPTED',
            acceptedAt: new Date().toISOString(),
            orderId: null,
            senderMessage: 'Pronto verás aquí Ver orden cuando exista número.',
          })}
          type="received"
        />
      ),
      proposal: 'Aquí UX: loader o “Creando orden…”.',
    },
    {
      step: 4,
      title: 'Orden tienda · preparación',
      caption:
        'Aquí aparece el bloque de órdenes (verde receptor). Pedido Dropi cuando backend mande webhook.',
      order: (
        <StalkerGiftOrdersTab
          userId={`flow-rc-${receiverPartyId}`}
          initialOrderId={null}
          providedOrders={[receiverOrders[0]]}
          skipFetch
          orderRole="receiver"
          timeRange={timeRange}
        />
      ),
      proposal: 'Filtrado por mismo stalkerGift/order id en cliente.',
    },
    {
      step: 5,
      title: 'Envío registrado · Dropi sincronizado',
      caption:
        'Misma orden con estado shipped + chip Dropi; dirección sólo receptor en modal/lista donde aplique política.',
      order: (
        <StalkerGiftOrdersTab
          userId={`flow-rc-${receiverPartyId}`}
          initialOrderId={null}
          providedOrders={[receiverOrders[1]]}
          skipFetch
          orderRole="receiver"
          timeRange={timeRange}
        />
      ),
      proposal: 'Única fila de verdad sobre `order`; la card del regalo podría resumir o enlazar.',
    },
    {
      step: 6,
      title: 'Entregado = Regalo recibido',
      caption: 'Título de orden cambia cuando `delivered`; chat ya permitido antes si configuraste.',
      order: (
        <StalkerGiftOrdersTab
          userId={`flow-rc-${receiverPartyId}`}
          initialOrderId={null}
          providedOrders={[receiverOrders[2]]}
          skipFetch
          orderRole="receiver"
          timeRange={timeRange}
        />
      ),
      proposal: 'Opcional cerrar ciclo Dropi.',
    },
  ]

  const senderSteps: FlowStepDefinition[] = [
    {
      step: 1,
      title: 'Borrador · sin pagar',
      caption: 'Aún no hay link público válido hasta completar checkout.',
      gift: (
        <StalkerGiftCard
          gift={giftBaseFlow({
            id: 'flow-sender-step1',
            estado: 'CREATED',
            receiverId: null,
            receiver: undefined,
            externalReceiverData: {
              name: mockReceiverUser.firstName ?? 'Destinatario',
              instagram: '@tu_fan',
            },
          })}
          type="sent"
        />
      ),
      proposal: 'Orden ecommerce no existe; sólo estado interno StalkerGift.',
    },
    {
      step: 2,
      title: 'Pagado · receptor aún no abre/enlaza link',
      caption: 'Útil cuando el receptor no ha claim-eal flujo WAITING_ACCEPTANCE desde app.',
      gift: (
        <StalkerGiftCard
          gift={giftBaseFlow({
            id: 'flow-sender-step2',
            estado: 'PAID',
            receiverId: mockReceiverUser.id,
            receiver: mockReceiverUser,
          })}
          type="sent"
        />
      ),
      proposal: 'Mantén CTA revisar estado de envío hasta transición WAITING_ACCEPTANCE.',
    },
    {
      step: 3,
      title: 'Esperando aceptación — Ver link destacado',
      caption:
        'Producto solicita mantener Ver link hasta aceptación o cancelación tras ventana configurable.',
      gift: (
        <StalkerGiftCard
          gift={giftBaseFlow({
            id: 'flow-sender-step3',
            estado: 'WAITING_ACCEPTANCE',
            uniqueLink: 'https://tanku.app/stalkergift/mock-link-shared',
            receiver: mockReceiverUser,
          })}
          type="sent"
        />
      ),
      proposal: 'Opcional mostrar também link en orden cuando exista paralelo backend.',
    },
    {
      step: 4,
      title: 'Aceptaron · orden creada (sin ver dirección envío)',
      caption: 'Mismo modelo que Órdenes sender: total y Dropi proceso; ocultamos dirección.',
      order: (
        <StalkerGiftOrdersTab
          userId={`flow-s-${senderViewerId}`}
          initialOrderId={null}
          providedOrders={[senderOrders[0]]}
          skipFetch
          orderRole="sender"
          timeRange={timeRange}
        />
      ),
      proposal:
        'Tras handshake aceptación, destacar nueva tarjeta de orden y reducir prioridad visual del botón Ver link.',
    },
    {
      step: 5,
      title: 'Enviado físico · seguimiento',
      caption: 'Dropi webhook alimenta estados intermedios hasta entrega.',
      order: (
        <StalkerGiftOrdersTab
          userId={`flow-s-${senderViewerId}`}
          initialOrderId={null}
          providedOrders={[senderOrders[1]]}
          skipFetch
          orderRole="sender"
          timeRange={timeRange}
        />
      ),
      proposal: '',
    },
    {
      step: 6,
      title: 'Completado',
      caption:
        'Cierre: Ver link puede archivarse; chat + recordatorio de soporte hasta X días post-entrega.',
      order: (
        <StalkerGiftOrdersTab
          userId={`flow-s-${senderViewerId}`}
          initialOrderId={null}
          providedOrders={[senderOrders[2]]}
          skipFetch
          orderRole="sender"
          timeRange={timeRange}
        />
      ),
      proposal: '',
    },
  ]

  return (
    <div className="space-y-10">
      <div className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm leading-relaxed text-gray-400">
        <p className="font-medium text-[#73FFA2]">Propuesta consolidada</p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 marker:text-[#66DEDB]">
          <li>
            Una sola <strong className="text-gray-300">familia datos</strong> por regalo (<code className="text-xs">stalkergiftId</code>): la UI
            mezcla <strong className="text-gray-300">tarjeta de regalo</strong> hasta que exista orden; luego muestra orden de tienda enlazada
            (o sólo orden si decidís pivotar después de aceptar).
          </li>
          <li>
            <strong className="text-gray-300">Ver link</strong> queda visible hasta que exista resultado claro (
            rechazado · envío completado si queréis archivo). Entre medio baja protagonismo cuando aparezcan totales órden.
          </li>
          <li>
            <strong className="text-gray-300">Sin pago:</strong> enviados se quedan en borrador CREATED. Pasada pasarela, PAID/WAIT_ACCEPT según webhook.
          </li>
          <li>
            <strong className="text-gray-300">Receptor</strong> sólo órdenes post-confirmación física donde exista orden; antes interactúan con fichas solo regalo (
            aceptar/rechazar).
          </li>
        </ul>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <FlowColumn hue="receive" heading="Recibe · paso a paso" steps={receiverSteps} />
        <FlowColumn hue="send" heading="Pagador / envía · paso a paso" steps={senderSteps} />
      </div>
    </div>
  )
}

function FlowColumn({
  hue,
  heading,
  steps,
}: {
  hue: 'receive' | 'send'
  heading: string
  steps: FlowStepDefinition[]
}) {
  const ring = hue === 'receive' ? 'ring-[#73FFA2]/25' : 'ring-[#66DEDB]/22'
  const badge = hue === 'receive' ? 'bg-[#73FFA2]/14 text-[#73FFA2]' : 'bg-[#66DEDB]/12 text-[#66DEDB]'

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">{heading}</h2>
      <div className="space-y-4">
        {steps.map((row) => (
          <article
            key={`${hue}-${row.step}`}
            className={`rounded-2xl border border-white/[0.08] bg-[#14181e] p-4 shadow-xl ring-1 ${ring}`}
          >
            <div className="mb-3 flex flex-wrap items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${badge}`}
              >
                {row.step}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-base font-semibold text-white">{row.title}</h3>
                <p className="text-xs text-gray-500">{row.caption}</p>
                {row.proposal ? (
                  <p className="text-[11px] leading-snug text-gray-600">
                    <span className="text-gray-500">Producto / API:</span> {row.proposal}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="space-y-3">
              {row.gift}
              {row.order}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
