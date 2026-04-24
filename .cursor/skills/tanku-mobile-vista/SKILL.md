---
name: tanku-mobile-vista
description: >-
  Patrón Tanku para móvil (< md): un solo `overflow-y-auto` en `#…-scroll-root`
  (como /cart); `<main id="app-main">` con `overflow-hidden`, paddings, BaseNav,
  bottom nav. Referencia: /feed, /profile, /notifications. Usar al crear o
  ajustar rutas en app/(main).
---

# Vista móvil Tanku (scroll + nav + safe areas)

## Objetivo

- **&lt; md**: el scroll vertical vive en **un nodo** de la página (p. ej. `#feed-scroll-root`, `#profile-scroll-root`) con `flex-1 min-h-0 basis-0 overflow-y-auto touch-pan-y overscroll-y-contain`. Eso mantiene **un único contenedor con scroll**; **Chrome en Android** y el inspector reaccionan bien; **iOS** sigue usando `-webkit-overflow-scrolling: touch` en el mismo nodo.
- **`<main>`** en esas rutas: **`overflow-hidden pb-0`** (bandera en `layout.tsx`); el `main` **no** hace scroll; evita doble eje y gestos “muertos”.

- **Excepción** `/` (landing): el `main` y el wrapper usan `overflow-visible` y el flujo de documento para invitados/SEO; no es el mismo patrón que el feed.

Rutas con `main` bloqueado y scroll en página (`isAppMainInnerScroll` + checkout en `tanku-front/app/(main)/layout.tsx`):

- `/feed`, `/events`, `/friends`
- `/profile/*`
- `/notifications`, `/messages`
- `/cart`, `/checkout/*`, `gift-direct`, etc. (`isCheckoutInnerScroll`)

## 1. `layout.tsx`

- Añade la ruta a **`isAppMainInnerScroll`** (misma idea que carrito) si la página aporta su `#…-scroll-root` con scroll.
- **`main`**: en esas rutas → `min-h-0 overflow-hidden pb-0`.
- **Wrapper** (no landing): `h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden` para acotar altura.

## 2. Página: shell + un solo scroller

- **Outer** de la página: `flex flex-1 min-h-0 flex-col overflow-hidden` (hijos: nav fijo + `#…-scroll-root`).
- **Scroll root**: `id="…-scroll-root"` (opcional), clases tipo  
  `flex-1 basis-0 min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y`  
  y paddings `pt` bajo el nav fijo, `pb` bajo el bottom bar.

Referencia: `tanku-front/app/(main)/feed/page.tsx`, `cart` (`CHECKOUT_TANKU_SCROLL_INNER`).

## 3. Padding bajo nav fijo y bottom bar

- Arriba (móvil): p. ej. `pt-[max(6.25rem,calc(env(safe-area-inset-top,0px)+5.25rem))]`
- Abajo: `pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]`

## 4. `BaseNav` / nav fijo

- `mobileTranslucentNav` donde toque; nav en capa fija, **sin** el scroll dentro del nav.

## 5. `useFeedScrollNav` (feed, friends, …)

- Pasar `useWindowScroll: false` y anclar el `scroll` al nodo con `overflow-y-auto` (`#feed-scroll-root`).

## 6. Checklist

1. [ ] Ruta añadida a la bandera de layout si hace scroll interno.
2. [ ] Ningún `max-md:overflow-y-visible` en el único cuerpo scrolleable; debe ser `overflow-y-auto` en móvil.
3. [ ] Paddings + safe areas; hueco bajo `MobileBottomNav`.
4. [ ] Probar ancho &lt; 768 en Chrome Android o inspector: el gesto/rueda mueve el contenido, no solo el nav.

## 7. Z-index

Modales por encima del bottom nav: `z-index` alto (ver `MobileBottomNav` en layout).
