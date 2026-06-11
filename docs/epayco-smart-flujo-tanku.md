# ePayco Smart Checkout — Flujo Tanku

Documentación interna del proyecto **MyTankuGif**: qué hacemos, cómo, qué enviamos/recibimos, tokens y ubicación del código.

---

## 1. Modos de integración

| Modo | Script frontend | Inicialización |
|------|-----------------|----------------|
| **Smart** (predeterminado) | `checkout-v2.js` | Backend crea **sesión Apify** → devuelve `sessionId` → `ePayco.checkout.configure({ sessionId, type: 'onpage', test })` → `open()` |
| **Classic** | `checkout.js` | `ePayco.checkout.configure({ key: NEXT_PUBLIC_EPAYCO_KEY, test })` → `handler.open({ … montos, webhook, etc. })` |

- **Frontend**: Smart si `NEXT_PUBLIC_EPAYCO_CHECKOUT_MODE` **no** es `classic`. Ver `tanku-front/lib/epayco/config.ts`.
- **Backend**: `EPAYCO_CHECKOUT_MODE` en `env` (por defecto `smart`); la sesión Smart la crea siempre el endpoint dedicado cuando el front está en Smart.

---

## 2. Visión general del flujo Smart

1. Usuario autenticado (JWT de la app) confirma pago con método ePayco en modo Smart.
2. El **frontend** llama `POST /api/v1/checkout/epayco-smart-session` con `flow` y el body correspondiente.
3. El **backend**:
   - según el flujo, prepara carrito / crea orden regalo / prepara StalkerGift;
   - obtiene **token Apify** (Basic con llaves ePayco);
   - crea **sesión** en Apify → recibe `sessionId`;
   - devuelve `{ sessionId, test }`.
4. El **frontend** carga `checkout-v2.js`, ejecuta `openEpaycoSmartCheckout(sessionId, …)`.
5. El usuario paga en el widget embebido (**onpage**).
6. **ePayco** notifica el resultado al **webhook** `POST …/webhook/epayco/:identifier` y redirige al usuario a la URL de **response** configurada en la sesión.
7. La página de éxito puede consultar `https://secure.epayco.co/validation/v1/reference/{ref_payco}` para mostrar estado al usuario.

---

## 3. Tokens y autenticación Apify (solo Smart)

No es el JWT de Tanku: es el flujo oficial **Apify** de ePayco.

| Paso | Endpoint | Headers | Qué devuelve |
|------|----------|---------|--------------|
| Login | `POST https://apify.epayco.co/login` | `Authorization: Basic base64(EPAYCO_PUBLIC_KEY:EPAYCO_PRIVATE_KEY)`<br>`Content-Type: application/json` | JSON con **`token`** (JWT). |
| Crear sesión | `POST https://apify.epayco.co/payment/session/create` | `Authorization: Bearer <token>`<br>`Content-Type: application/json` | JSON con `data.sessionId`. |

**Implementación**: `tanku-backend/src/modules/checkout/epayco-apify.service.ts`

- El servicio **cachea el token en memoria** y renueva si falta menos de 1 minuto para expirar (o usa `exp` del JWT si se puede decodificar).
- Las llaves **no** van al frontend para Smart; solo el `sessionId` devuelto por el backend.

**Autenticación Tanku**: el endpoint `epayco-smart-session` va protegido con `authenticate` (JWT de usuario). Código: `tanku-backend/src/modules/checkout/checkout.routes.ts`.

---

## 4. Endpoint principal: crear sesión Smart

**`POST /api/v1/checkout/epayco-smart-session`**  
**Auth**: Bearer (usuario logueado).

### Respuesta exitosa (envoltorio estándar del API)

```json
{
  "success": true,
  "data": {
    "sessionId": "<string de ePayco>",
    "test": true
  }
}
```

`test` refleja `EPAYCO_TEST_MODE` del backend y el front lo puede usar para alinear el flag `test` del widget.

### Payload enviado a Apify (`createSmartSession`)

Campos que arma Tanku (resumen):

| Campo | Valor típico |
|-------|----------------|
| `checkout_version` | `"2"` |
| `name` | `"Tanku"` |
| `currency` | `"COP"` |
| `amount` | Total redondeado (`Math.round`) |
| `description` | Texto según flujo |
| `lang` | `"ES"` |
| `country` | `"CO"` |
| `invoice` | **Identificador del cobro** (ver abajo) |
| `response` | URL de redirección post-pago en el front |
| `confirmation` | URL del webhook del backend |
| `method` | `"POST"` |
| `extras.extra1` | Igual que `invoice` (`order.ref` en `cart` y `gift_direct`) |
| `extras.extra2` | `flow`: `cart` \| `gift_direct` \| `stalker_gift` |
| `extras.extra3` | Solo `cart`: `cartId` (vaciar carrito en webhook) |

**Webhook URL** (confirmation):

```text
{WEBHOOK_BASE_URL}/api/v1/webhook/epayco/{orderId}   # cart y gift_direct (nuevo)
{WEBHOOK_BASE_URL}/api/v1/webhook/epayco/{cartId}    # stalker_gift; cart legacy
```

Si `WEBHOOK_BASE_URL` no está definida, el código usa un fallback hardcodeado en `buildEpaycoWebhookUrl` — revisar `tanku-backend/src/modules/checkout/checkout.controller.ts`.

---

## 5. Los tres flujos (`flow`)

### 5.1 `cart` — Checkout normal con carrito

**Body requerido**: `dataForm`, `dataCart` (misma forma que checkout).

**Backend** (desde 2026-06-11):

1. `prepareEpaycoCartOrder` → `prepareEpaycoCheckout` (metadata en carrito) + **Order `awaiting`** con `ORD-…`.
2. Sesión Apify: `description` / `invoice` / `extra1` = `order.ref`; `extra2` = `cart`; `extra3` = `cartId`.
3. `confirmation` = `…/webhook/epayco/{orderId}` (CUID opaco en URL).
4. `responseUrl` = `{FRONTEND_URL}/checkout/success?orderRef=…&orderId=…`.

**Webhook `paid`**: branch orden existente → `paid` + Dropi + vaciar carrito (`extra3`) + regalo si aplica.

**Legacy**: sesiones antiguas con `…/webhook/epayco/{cartId}` siguen creando la Order en el webhook.

**Código**: `createEpaycoSmartSession` rama `cart` → `checkout.service.ts` (`prepareEpaycoCartOrder`).

**Idempotencia reenvíos:** ver [epayco-idempotencia-y-saldo-a-favor.md](./epayco-idempotencia-y-saldo-a-favor.md).

---

### 5.2 `gift_direct` — Regalo desde wishlist (orden ya creada)

**Body requerido**: `variant_id`, `quantity`, `recipient_id`, `email`, `payment_method: 'epayco'`.

**Backend**:

1. `createDirectGiftOrder` — la **orden ya existe** en BD antes del pago.
2. `confirmation` = `…/webhook/epayco/{orderId}`.
3. `invoice` / `extra1` = `order.ref` (`ORD-…`).
4. `responseUrl` = `{FRONTEND_URL}/checkout/success?orderRef=…&orderId=…`.

**Webhook**: si encuentra orden por `id === identifier`, actualiza `paymentStatus`, Dropi, notificaciones de regalo, etc. **No** pasa por la rama “carrito + metadata checkout_data”.

---

### 5.3 `stalker_gift` — Modal StalkerGift

**Body**: `productId`, `senderAlias`, `receiverId` **o** `externalReceiverData`, opcionalmente `variantId`, `quantity`, `senderMessage`.

**Backend**:

1. `stalkerGiftService.checkoutStalkerGift` prepara carrito/metadata con `isStalkerGift`, etc.
2. `identifier` = `cartId` del flujo StalkerGift.
3. `responseUrl` = `{FRONTEND_URL}/stalkergift/success?stalkerGiftId=…&cartId=…`.

**Webhook**: lee `cart.metadata`; si `isStalkerGift`, actualiza el StalkerGift pagado (links, notificaciones) en lugar de crear una orden “checkout normal”.

---

## 6. Webhook ePayco

**Ruta**: `POST /api/v1/webhook/epayco/:orderId`  
(`orderId` en la ruta es en la práctica **`identifier`**: `cartId` o `orderId` real.)

**Montaje**: `tanku-backend/src/app.ts` → prefijo `/api/v1/webhook/epayco`.

**Parser**: Express debe aceptar **urlencoded** antes de JSON (`app.ts` lo documenta); ePayco puede enviar `application/x-www-form-urlencoded`.

**Datos**: el controlador fusiona `req.query` y `req.body` y lee campos típicos:

- `ref_payco`, `x_ref_payco`, `x_transaction_id`, `x_response`, `x_amount`, `x_currency_code`, `x_signature`, `x_test_request`, `x_extra1`, `x_extra2`, etc.

**Firma `x_signature`** (flujo carrito / cuando aplica):

```text
SHA256( EPAYCO_CUSTOMER_ID + "^" + EPAYCO_P_KEY + "^" + x_ref_payco + "^" + x_transaction_id + "^" + x_amount + "^" + x_currency_code )
```

- Si faltan `EPAYCO_CUSTOMER_ID` o `EPAYCO_P_KEY`, en producción responde error de configuración; en desarrollo o test puede omitir validación (ver condiciones en código).

**Estados `x_response`** → `paymentStatus` interno: Aceptada/Aprobada/1 → `paid`; Pendiente/2 → `pending`; Rechazada/Fallida/3/4 → `cancelled`, etc.

**Código**: `tanku-backend/src/modules/orders/epayco.controller.ts`, rutas `tanku-backend/src/modules/orders/epayco.routes.ts`.

---

## 7. Frontend Smart: qué cargamos y qué abrimos

| Recurso | Variable / default |
|---------|-------------------|
| Script Smart | `NEXT_PUBLIC_EPAYCO_SMART_SCRIPT` o `https://checkout.epayco.co/checkout-v2.js` |
| Script Classic | `NEXT_PUBLIC_EPAYCO_CHECKOUT_URL` o `https://checkout.epayco.co/checkout.js` |
| Modo test widget | `NEXT_PUBLIC_EPAYCO_TEST_MODE` (`!== 'false'` → test true). Smart puede sobrescribir con `test` del API. |
| Llave pública (Classic) | `NEXT_PUBLIC_EPAYCO_KEY` |

**Función central Smart**: `openEpaycoSmartCheckout` en `tanku-front/lib/epayco/open-smart-checkout.ts`:

- `ePayco.checkout.configure({ sessionId, type: 'onpage', test }).open()`
- Registra `onClosed`, `onCreated`, `onErrors` si el SDK los expone.

**Páginas que llaman al endpoint de sesión**:

- `tanku-front/app/(main)/checkout/page.tsx` — `flow: 'cart'`
- `tanku-front/app/(main)/checkout/gift/page.tsx` — regalo carrito
- `tanku-front/app/(main)/checkout/gift-direct/page.tsx` — `flow: 'gift_direct'`
- `tanku-front/components/stalkergift/stalkergift-modal.tsx` — `flow: 'stalker_gift'`

**Constante del path**: `API_ENDPOINTS.CHECKOUT.EPAYCO_SMART_SESSION` → `/api/v1/checkout/epayco-smart-session` en `tanku-front/lib/api/endpoints.ts`.

---

## 8. Páginas de éxito y API de validación ePayco

Tras el pago, ePayco redirige con query params (incl. `ref_payco`). Las páginas:

- `tanku-front/app/(main)/checkout/success/page.tsx`
- `tanku-front/app/stalkergift/success/page.tsx`

hacen **GET** público (sin token Tanku):

```text
https://secure.epayco.co/validation/v1/reference/{ref_payco}
```

para mostrar al usuario si la transacción fue aceptada, pendiente o rechazada. El **fulfillment** definitivo (orden, Dropi, carrito) lo hace el **webhook** en el backend.

---

## 9. Variables de entorno relevantes

### Backend (`tanku-backend/src/config/env.ts`)

| Variable | Uso |
|----------|-----|
| `EPAYCO_PUBLIC_KEY` | Basic Auth → Apify login |
| `EPAYCO_PRIVATE_KEY` | Basic Auth → Apify login |
| `EPAYCO_TEST_MODE` | `true`/`false` → respuesta `test` al front |
| `EPAYCO_CONFIRMATION_URL` | Validación env (documentación ePayco legado si aplica) |
| `EPAYCO_CUSTOMER_ID` | Firma webhook |
| `EPAYCO_P_KEY` | Firma webhook |
| `EPAYCO_CHECKOUT_MODE` | `smart` \| `classic` (referencia servidor) |
| `WEBHOOK_BASE_URL` | Base URL pública del webhook ePayco |
| `FRONTEND_URL` | Construcción de `response` en sesión Apify |

### Frontend

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_EPAYCO_CHECKOUT_MODE` | `classic` fuerza checkout.js; otro valor → Smart |
| `NEXT_PUBLIC_EPAYCO_SMART_SCRIPT` | URL checkout-v2.js |
| `NEXT_PUBLIC_EPAYCO_TEST_MODE` | Flag test del widget |
| `NEXT_PUBLIC_EPAYCO_KEY` | Solo checkout **classic** |

Ejemplo adicional: `tanku-backend/.env.example` comenta llaves y modo.

---

## 10. Mapa de archivos (referencia rápida)

| Área | Archivo |
|------|---------|
| Apify login + crear sesión | `tanku-backend/src/modules/checkout/epayco-apify.service.ts` |
| Crear sesión Smart por flujo | `tanku-backend/src/modules/checkout/checkout.controller.ts` (`createEpaycoSmartSession`) |
| Rutas checkout | `tanku-backend/src/modules/checkout/checkout.routes.ts` |
| Preparar carrito ePayco | `tanku-backend/src/modules/checkout/checkout.service.ts` (`prepareEpaycoCheckout`) |
| Webhook | `tanku-backend/src/modules/orders/epayco.controller.ts`, `epayco.routes.ts` |
| Abrir widget Smart | `tanku-front/lib/epayco/open-smart-checkout.ts` |
| Modo Smart/Classic | `tanku-front/lib/epayco/config.ts` |
| Endpoint API front | `tanku-front/lib/api/endpoints.ts` |

---

## 11. Doc oficial ePayco en el repo

En la raíz existe **`epayco.md`** (exportación de la documentación de Smart Checkout ePayco). Este archivo **`docs/epayco-smart-flujo-tanku.md`** describe solo **cómo está cableado Tanku**, no sustituye los PDFs/Wiki de ePayco.

---

*Última revisión según código del repositorio (mayo 2026).*
