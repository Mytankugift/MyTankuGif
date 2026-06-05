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

### 2.1 Webhook ePayco (`epayco.controller.ts`)

| Flujo | Orden en BD antes del pago | Comportamiento al webhook `paid` |
|-------|----------------------------|----------------------------------|
| `cart` | No (solo `cart.metadata.checkout_data`) | Crea orden + Dropi + side-effects |
| `gift_direct` | Sí (`awaiting`) | Actualiza pago + **siempre** Dropi + notif + email |
| `stalker_gift` | No (StalkerGift en carrito) | Actualiza StalkerGift |

Para `gift_direct` con orden **ya `paid`**, el código **no corta** antes de Dropi/notificaciones/email.

**Archivos:**

- `tanku-backend/src/modules/orders/epayco.controller.ts`
- `tanku-backend/src/modules/orders/dropi-orders.service.ts` — no omite items que ya tienen `dropiOrderId`
- `tanku-backend/src/modules/notifications/notifications.service.ts` — `createGiftNotification` sin dedupe
- `tanku-backend/src/modules/email/gift-email.service.ts` — `sendGiftReceivedEmailAfterPayment` sin dedupe

### 2.2 Referencia: Dropi webhook sí tiene idempotencia

En `dropi-webhook.controller.ts`, si el estado del item **no cambió**, responde 200 y no repite trabajo innecesario. **Usar este patrón como modelo** para ePayco.

### 2.3 TODO sin implementar

En `epayco.controller.ts` hay un comentario para deduplicar por `x_transaction_id`; **no está implementado**.

---

## 3. Qué debe ser idempotente (y qué no)

### 3.1 Claves de deduplicación

| Clave | Uso | Notas |
|-------|-----|-------|
| `x_transaction_id` | Idempotencia **global** del pago | Único por transacción ePayco; ideal para tabla `PaymentEvent` |
| `x_ref_payco` | Referencia numérica ePayco | Guardada en `order.metadata.refPayco` |
| `identifier` (path) | `cartId` u `orderId` | Una sesión de cobro Tanku |
| `invoice` / `x_id_factura` | Mismo valor que `identifier` hoy | Futuro: migrar a `order.ref` |

**Regla:** un `x_transaction_id` procesado con éxito **no debe** volver a ejecutar efectos secundarios.

### 3.2 Efectos por evento de pago exitoso

| Efecto | ¿Idempotente hoy? | Comportamiento deseado |
|--------|-------------------|----------------------|
| Actualizar `paymentStatus → paid` | Parcial | OK repetir (mismo estado) |
| Guardar `transactionId` / `refPayco` | Parcial | OK repetir |
| Crear orden (flujo `cart`) | **No** | Solo si aún no existe orden para ese `cartId` / `transaction_id` |
| Crear orden Dropi | **No** | Solo si `orderItem.dropiOrderId` es null |
| Notificación regalo | **No** | Una por orden pagada |
| Email regalo | **No** | Uno por orden pagada |
| Vaciar carrito | Parcial | Solo una vez tras Dropi OK (cart) |

### 3.3 Reenvío manual desde ePayco (`x_manual=1`)

**Permitido y deseable:**

- Reintentar **Dropi** si falló y no hay `dropiOrderId`.
- Reconciliar orden `cart` si el webhook original nunca llegó (orden no creada).

**Debe bloquearse si ya ocurrió:**

- Segunda orden Dropi para el mismo `OrderItem`.
- Segundo email / notificación de regalo.
- Segunda orden Tanku para el mismo pago.

---

## 4. Diseño propuesto (fases)

### Fase A — Guards rápidos (sin migración)

En `epayco.controller.ts`, rama `existingOrder` + flujo `cart`:

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
cart:
  prepare → invoice=cartId → webhook crea Order

gift_direct:
  create Order (awaiting) → invoice=orderId → webhook marca paid + Dropi

stalker_gift:
  prepare carrito → invoice=cartId → webhook actualiza StalkerGift
```

**Identificadores legibles:** las órdenes tienen `ref` (`ORD-2026-0000013`). Hoy ePayco usa CUID en `invoice`; conviene migrar a `ref` cuando el flujo cree la orden antes del pago.

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

- [ ] `invoice` = `order.ref` en sesión Apify.
- [ ] Wallet / saldo a favor (sección 6).

---

## 8. Operaciones: reenvío desde ePayco

**Cuándo usarlo:**

- Webhook original 404 (nginx) y pago confirmado en panel ePayco.
- Dropi falló y se corrigió precio/producto — **preferir** botón admin “Reintentar Dropi” cuando exista.

**Cuándo evitarlo:**

- Orden ya `paid` + Dropi OK + email enviado → solo duplica ruido.

**Después de reenviar:** revisar logs `[EPAYCO-WEBHOOK]` y confirmar que no aparecen duplicados de email/Dropi.

---

## 9. Mapa de archivos

| Área | Archivo |
|------|---------|
| Webhook ePayco | `tanku-backend/src/modules/orders/epayco.controller.ts` |
| Creación Dropi | `tanku-backend/src/modules/orders/dropi-orders.service.ts` |
| Idempotencia Dropi (referencia) | `tanku-backend/src/modules/orders/dropi-webhook.controller.ts` |
| Sesión Smart / response URL | `tanku-backend/src/modules/checkout/checkout.controller.ts` |
| Success page | `tanku-front/app/(main)/checkout/success/page.tsx` |
| Flujo ePayco general | `docs/epayco-smart-flujo-tanku.md` |

---

## 10. Resumen ejecutivo

1. **Hoy:** reenviar webhook ePayco puede duplicar emails, notificaciones y órdenes Dropi.
2. **Primero:** idempotencia por `x_transaction_id` + guards en Dropi y side-effects.
3. **Saldo a favor / cobrar excedente:** buena idea de negocio para **reducir devoluciones**, pero es un **segundo proyecto** que requiere ledger en Tanku; no confiar en ePayco para “recordar” saldo entre compras.
4. **Atajo operativo:** reintentar Dropi desde admin sin reenviar ePayco, mientras no exista wallet.

---

*Última actualización: 2026-06-05 — incidente ORD-2026-0000013, Dropi “monto a ganar ≤ 0”, reenvío manual ePayco.*
