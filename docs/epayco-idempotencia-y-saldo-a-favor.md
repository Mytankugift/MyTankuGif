# ePayco — Idempotencia, reenvíos y saldo a favor

Documentación interna para diseñar pagos robustos en Tanku: evitar duplicados al reenviar webhooks, y evaluar **saldo a favor** (cobrar solo el excedente en una nueva compra) para reducir devoluciones.

**Relacionado:** [epayco-smart-flujo-tanku.md](./epayco-smart-flujo-tanku.md)

---

## 1. Problema observado (caso real)

Orden `ORD-2026-0000013` / `cmq1co1zy00333qr8m4y0xpqc` — flujo `gift_direct`:

1. Pago ePayco **Aceptada** → webhook OK → `paymentStatus: paid`.
2. Dropi **rechazó** la orden: *"monto a ganar es menor o igual a cero"*.
3. Desde el panel ePayco se **reenvió la confirmación** (`x_manual=1` en el webhook).
4. El backend volvió a:
   - marcar `paid` (innocuo),
   - **reintentar Dropi**,
   - **crear otra notificación de regalo**,
   - **enviar otro correo** al destinatario.

**Conclusión:** el webhook de ePayco **no es idempotente** hoy. Reenviar desde ePayco es útil para reconciliar, pero puede duplicar efectos secundarios.

---

## 2. Estado actual del código

### 2.1 Cambio de flujo `cart` (2026-06-11) — **sin idempotencia aún**

Desde 2026-06-11, el checkout `cart` (Smart y classic) **alinea** el modelo de `gift_direct`:

| Momento | Qué pasa |
|---------|----------|
| Antes del pago | `prepareEpaycoCartOrder` → metadata en carrito + **Order `awaiting`** con `ORD-…` |
| Sesión ePayco | `description` / `invoice` / `extra1` = `order.ref`; `extra2` = `cart`; `extra3` = `cartId`; `confirmation` = `/webhook/epayco/{orderId}` |
| Webhook `paid` | Branch **orden existente** (mismo que `gift_direct`): `paid` → Dropi → notif/email si regalo → vaciar carrito vía `extra3` |
| Webhook rechazado | Marca `cancelled`; la orden **sigue en Mis pedidos** (sin filtro `awaiting`/`cancelled`) |
| `stalker_gift` | **Sin cambios** (sigue `cartId` temporal en URL) |

**Compatibilidad:** cobros viejos con URL `…/webhook/epayco/{cartId}` siguen entrando por la rama legacy (crea Order en el webhook). Las sesiones nuevas usan `orderId`.

**Idempotencia:** este cambio **no** implementa guards; solo evita que un reenvío con URL nueva **cree otra Order Tanku** en `cart`. Sigue duplicando Dropi / email / notificación al reenviar (igual que `gift_direct`).

### 2.2 Webhook ePayco (`epayco.controller.ts`)

| Flujo | Orden en BD antes del pago | URL webhook (nuevo) | Comportamiento al webhook `paid` |
|-------|----------------------------|---------------------|----------------------------------|
| `cart` | Sí (`awaiting`) | `{orderId}` | Actualiza pago + **siempre** Dropi + side-effects + vaciar carrito (`extra3`) |
| `gift_direct` | Sí (`awaiting`) | `{orderId}` | Actualiza pago + **siempre** Dropi + notif + email |
| `stalker_gift` | StalkerGift `CREATED` + carrito temp. | `{cartId}` temp. | Actualiza StalkerGift (sin Order hasta aceptación) |
| `cart` (legacy) | No (solo `checkout_data`) | `{cartId}` | Crea Order + Dropi + side-effects |

Para `cart` y `gift_direct` con orden **ya `paid`**, el código **no corta** antes de Dropi/notificaciones/email.

**Archivos:**

- `tanku-backend/src/modules/orders/epayco.controller.ts`
- `tanku-backend/src/modules/checkout/checkout.service.ts` — `prepareEpaycoCartOrder`
- `tanku-backend/src/modules/checkout/checkout.controller.ts` — sesión Apify / `add-order` epayco
- `tanku-backend/src/modules/orders/dropi-orders.service.ts` — no omite items que ya tienen `dropiOrderId`
- `tanku-backend/src/modules/notifications/notifications.service.ts` — `createGiftNotification` sin dedupe
- `tanku-backend/src/modules/email/gift-email.service.ts` — `sendGiftReceivedEmailAfterPayment` sin dedupe

### 2.3 Referencia: Dropi webhook sí tiene idempotencia

En `dropi-webhook.controller.ts`, si el estado del item **no cambió**, responde 200 y no repite trabajo innecesario. **Usar este patrón como modelo** para ePayco.

### 2.4 TODO sin implementar (idempotencia)

En `epayco.controller.ts` hay un comentario para deduplicar por `x_transaction_id`; **no está implementado**.

---

## 3. Qué debe ser idempotente (y qué no)

### 3.1 Claves de deduplicación

| Clave | Uso | Notas |
|-------|-----|-------|
| `x_transaction_id` | Idempotencia **global** del pago | Único por transacción ePayco; ideal para tabla `PaymentEvent` |
| `x_ref_payco` | Referencia numérica ePayco | Guardada en `order.metadata.refPayco` |
| `identifier` (path) | `orderId` (cart/gift_direct nuevos) o `cartId` (legacy cart / stalker_gift) | Correlación webhook |
| `invoice` / `x_id_factura` | `order.ref` (`ORD-…`) en cart y gift_direct | Legible en panel ePayco |
| `x_extra1` | Igual que `invoice` en cart y gift_direct | Soporte / reconciliación manual |
| `x_extra2` | `cart` \| `gift_direct` \| `stalker_gift` | Rama del webhook |
| `x_extra3` | `cartId` solo en flujo `cart` | Vaciar carrito tras Dropi OK |

**Regla:** un `x_transaction_id` procesado con éxito **no debe** volver a ejecutar efectos secundarios.

### 3.2 Efectos por evento de pago exitoso

| Efecto | ¿Idempotente hoy? | Comportamiento deseado |
|--------|-------------------|----------------------|
| Actualizar `paymentStatus → paid` | Parcial | OK repetir (mismo estado) |
| Guardar `transactionId` / `refPayco` | Parcial | OK repetir |
| Crear orden Tanku (flujo `cart` **nuevo**) | **Sí** en reenvío webhook | Orden pre-creada `awaiting`; webhook no llama `createOrderFromCheckout` |
| Crear orden Tanku (flujo `cart` **legacy** / `cartId` en URL) | **No** | Solo si aún no existe orden para ese pago |
| Crear orden Tanku (doble clic “Pagar”) | **No** | Cada sesión puede crear otra Order `awaiting` (huérfana si no paga) |
| Crear orden Dropi | **No** | Solo si `orderItem.dropiOrderId` es null |
| Notificación regalo | **No** | Una por orden pagada |
| Email regalo | **No** | Uno por orden pagada |
| Vaciar carrito (`cart`, `extra3`) | Parcial | Solo tras Dropi OK; sin guard si ya se vació |

### 3.3 Reenvío manual desde ePayco (`x_manual=1`)

**Permitido y deseable:**

- Reintentar **Dropi** si falló y no hay `dropiOrderId`.
- Reconciliar orden `cart` si el webhook original nunca llegó (orden no creada).

**Debe bloquearse si ya ocurrió:**

- Segunda orden Dropi para el mismo `OrderItem`.
- Segundo email / notificación de regalo.
- Segunda orden Tanku para el mismo pago (reenvío webhook con misma `orderId` / `x_transaction_id`).

**Ya mitigado (2026-06-11):** reenvío con URL `…/webhook/epayco/{orderId}` en `cart` y `gift_direct` **no** crea otra Order Tanku.

---

## 4. Diseño propuesto (fases)

### Fase A — Guards rápidos (sin migración)

En `epayco.controller.ts`, rama `existingOrder` (aplica a **`cart` y `gift_direct`** desde 2026-06-11):

```
SI paymentStatus === 'paid' Y transactionId ya coincide:
  SI todos los items tienen dropiOrderId → return 200 "already_processed"
  SI NO → solo reintentar Dropi (sin email/notif)
SI paymentStatus === 'paid' Y transactionId distinto:
  → log alerta fraude / doble cobro; no procesar automáticamente
```

En `createOrderInDropi`:

```
Para cada OrderItem:
  SI item.dropiOrderId != null → skip (log "already_in_dropi")
```

Side-effects regalo:

```
SI metadata.giftNotificationSentAt → skip notificación
SI metadata.giftEmailSentAt → skip email
SINO → enviar y persistir timestamps en metadata
```

### Fase B — Tabla `PaymentEvent` (recomendado)

```prisma
model PaymentEvent {
  id              String   @id @default(cuid())
  provider        String   // "epayco"
  transactionId   String   @unique
  refPayco        String?
  identifier      String   // cartId | orderId | order.ref
  flow            String   // cart | gift_direct | stalker_gift
  amount          Int
  currency        String   @default("COP")
  status          String   // paid | failed | ...
  orderId         String?  // orden Tanku resultante
  rawPayload      Json?
  processedAt     DateTime @default(now())
  sideEffects     Json?    // { dropi: true, giftEmail: true, ... }
}
```

**Al entrar al webhook:**

1. Validar firma.
2. `upsert` / `findUnique` por `transactionId`.
3. Si `sideEffects` completos → **200 OK sin trabajo**.
4. Si incompletos → ejecutar solo lo pendiente (patrón **outbox** / saga).

Ventaja: auditoría, soporte, reconciliación manual, métricas.

### Fase C — Idempotency-Key en sesión Apify

Al crear sesión Smart, guardar `sessionId` + `identifier` + monto en BD. Correlacionar con webhook aunque cambie el path.

---

## 5. Flujos Tanku (recordatorio)

```text
cart (actual, desde 2026-06-11):
  prepareEpaycoCartOrder → Order awaiting + checkout_data en carrito
  ePayco: invoice/extra1 = ORD-…, extra3 = cartId, confirmation = /webhook/epayco/{orderId}
  webhook paid → actualiza paid + Dropi + vaciar carrito (extra3) + regalo si aplica

cart (legacy, sesiones antiguas):
  prepare → invoice=cartId → confirmation = /webhook/epayco/{cartId}
  webhook paid → crea Order + Dropi + side-effects

gift_direct:
  create Order (awaiting) → invoice/extra1 = ORD-…, confirmation = /webhook/epayco/{orderId}
  webhook paid → paid + Dropi + notif + email

stalker_gift (sin cambios):
  StalkerGift CREATED + carrito temp. → invoice = cartId temp.
  webhook paid → actualiza StalkerGift (Order se crea al aceptar)
```

**Órdenes `awaiting` / `cancelled`:** se muestran en Mis pedidos (p. ej. “Pago pendiente”); no hay filtro oculto. Un pago rechazado deja la Order en BD con `cancelled`.

**Doble intento de pago:** cada “Pagar” puede generar **otra** Order `awaiting` (nuevo `ORD-…`); es distinto del reenvío de webhook sobre la misma orden.

---

## 6. Saldo a favor y “cobrar solo el excedente”

### 6.1 Idea de negocio

Escenarios donde aparece:

- Pago exitoso pero **Dropi falló** → el cliente pagó pero no hay envío; soporte quiere cambiar producto sin devolver todo vía ePayco.
- **Sobre-pago** o ajuste de precio post-checkout.
- **Cambio de producto** más caro/barato en un caso de soporte.
- Reducir **devoluciones** (reversos PSE/tarjeta son lentos y costosos).

**Propuesta:** ledger interno **saldo a favor** por usuario; en checkout nuevo, aplicar saldo y cobrar en ePayco **solo la diferencia**.

### 6.2 Opinión técnica

**Tiene sentido como producto Tanku**, pero **no es lo mismo que idempotencia** y **ePayco no lo resuelve solo**:

- Cada cobro ePayco es una transacción nueva con monto fijo en la sesión Apify.
- No hay “wallet ePayco” reutilizable entre checkouts sin integración explícita de saldo (no está en el flujo Smart actual).
- El **saldo a favor debe vivir en Tanku** (BD), no inferirse reenviando webhooks.

**Recomendación:** implementar idempotencia **antes** que saldo a favor. Si no, un reenvío de webhook podría acreditar saldo dos veces.

### 6.3 Modelo sugerido (futuro)

```text
UserWallet o AccountCredit
  userId
  balanceCents (o balanceCop)
  currency: COP

WalletTransaction (ledger append-only)
  id, userId, amount (+/-), reason, orderId?, supportCaseId?, createdAt
  reasons: OVERPAYMENT | SUPPORT_ADJUSTMENT | CHECKOUT_APPLIED | REFUND_TO_WALLET | ...
```

**Checkout con saldo:**

```text
total_carrito = 30.000
saldo_usuario = 12.000
cargo_epayco  = 18.000   ← solo esto va a createSmartSession.amount

metadata.checkout:
  walletApplied: 12000
  epaycoAmount: 18000
```

**Webhook:**

1. Verificar que ePayco cobró `epaycoAmount` (no el total).
2. Debitar saldo en la **misma transacción** que confirma el pago.
3. Idempotencia por `transaction_id` antes de debitar.

### 6.4 Casos borde importantes

| Caso | Riesgo | Mitigación |
|------|--------|------------|
| Webhook duplicado | Doble débito de saldo o doble crédito | `PaymentEvent` + unique `transactionId` |
| Usuario abandona checkout tras aplicar saldo | Saldo “reservado” | Reserva temporal (TTL 15 min) o aplicar solo en webhook |
| Devolución parcial vs saldo | Confusión contable | Política clara: reembolso a wallet vs reverso ePayco |
| Regalo (paga el sender) | ¿Saldo de quién? | Solo `giftSenderId` puede usar su wallet |
| Fraude | Saldo inflado | Créditos solo vía admin/soporte con caso auditado |

### 6.5 Alternativas más simples (antes del wallet completo)

1. **Reintento Dropi / cambio de ítem en soporte** — sin nuevo cobro si el monto es similar; admin ajusta orden y re-dispara Dropi.
2. **Nota de crédito manual** — tabla simple `user_credit_balance` solo para soporte, sin checkout automático al inicio.
3. **Nueva orden vinculada** — caso soporte cierra orden A (pagada, Dropi fallido) y crea orden B con pago **cero** + flag `paidViaSupportTransfer` (sin pasar por ePayco).

Estas opciones evitan devoluciones **sin** la complejidad del checkout con excedente.

### 6.6 ¿Cuándo sí vale “cobrar solo el excedente”?

Cuando tengáis:

- [ ] Idempotencia de webhooks (Fase A/B).
- [ ] Ledger de saldo con auditoría.
- [ ] UI checkout que muestre: subtotal, saldo aplicado, total ePayco.
- [ ] Webhook que valide `x_amount === epaycoAmount` esperado.
- [ ] Proceso de soporte para **acreditar** saldo (caso Dropi fallido, etc.).

---

## 7. Checklist de implementación (idempotencia)

### Prioridad alta

- [ ] Skip Dropi si `orderItem.dropiOrderId` ya existe.
- [ ] Skip email/notif regalo si flags en `order.metadata`.
- [ ] Si `paid` + mismos IDs de pago → no repetir side-effects; solo Dropi pendiente.
- [ ] Log estructurado cuando se detecta reenvío (`x_manual`, `transaction_id` duplicado).

### Prioridad media

- [ ] Tabla `PaymentEvent` con unique en `transactionId`.
- [ ] Endpoint admin: “reintentar Dropi” sin pasar por ePayco.
- [ ] Tests: doble POST webhook → una sola orden Dropi, un solo email.

### Prioridad baja / producto

- [x] `invoice` / `extra1` = `order.ref` en sesión Apify (`cart` y `gift_direct`, 2026-06-11).
- [ ] Wallet / saldo a favor (sección 6).

---

## 8. Operaciones: reenvío desde ePayco

**Cuándo usarlo:**

- Webhook original 404 (nginx) y pago confirmado en panel ePayco.
- Dropi falló y se corrigió precio/producto — **preferir** botón admin “Reintentar Dropi” cuando exista (aún no existe).
- Primera confirmación nunca llegó y la Order `awaiting` ya existe (`cart`/`gift_direct` nuevos): reenviar a `…/webhook/epayco/{orderId}`.

**Cuándo evitarlo:**

- Orden ya `paid` + Dropi OK + email enviado → duplica email, notificación y puede duplicar Dropi.

**Después de reenviar:** revisar logs `[EPAYCO-WEBHOOK]` y confirmar que no aparecen duplicados de email/Dropi. La Order Tanku no debería duplicarse si la URL usa `orderId`.

---

## 9. Mapa de archivos

| Área | Archivo |
|------|---------|
| Webhook ePayco | `tanku-backend/src/modules/orders/epayco.controller.ts` |
| Pre-orden cart + checkout | `tanku-backend/src/modules/checkout/checkout.service.ts` (`prepareEpaycoCartOrder`) |
| Creación Dropi | `tanku-backend/src/modules/orders/dropi-orders.service.ts` |
| Idempotencia Dropi (referencia) | `tanku-backend/src/modules/orders/dropi-webhook.controller.ts` |
| Sesión Smart / response URL | `tanku-backend/src/modules/checkout/checkout.controller.ts` |
| Checkout classic epayco | `tanku-front/app/(main)/checkout/page.tsx`, `checkout/gift/page.tsx` |
| Success page | `tanku-front/app/(main)/checkout/success/page.tsx` |
| Flujo ePayco general | `docs/epayco-smart-flujo-tanku.md` |

---

## 10. Resumen ejecutivo

1. **Idempotencia:** sigue **pendiente**. Reenviar webhook ePayco puede duplicar emails, notificaciones y órdenes Dropi (`gift_direct` y `cart` nuevo).
2. **Cart alineado con gift_direct (2026-06-11):** Order `awaiting` antes del pago; ePayco muestra `ORD-…`; webhook por `orderId`. El reenvío **no** duplica Order Tanku; sí puede repetir side-effects.
3. **Primero (cuando se implemente):** idempotencia por `x_transaction_id` + guards en Dropi y side-effects (Fases A/B).
4. **Saldo a favor / cobrar excedente:** segundo proyecto; requiere ledger en Tanku.
5. **Atajo operativo:** reintentar Dropi desde admin sin reenviar ePayco, mientras no exista wallet ni idempotencia.

---

*Última actualización: 2026-06-11 — flujo `cart` con pre-orden y `order.ref` en ePayco; idempotencia aún no implementada. Caso de referencia: ORD-2026-0000013 (`gift_direct`), reenvío manual ePayco.*
