---
name: tanku-mobile-vista
description: >-
  Patrón Tanku para móvil (< md): scroll en documento/ventana (Safari) o scroll
  interno en md+; layout en app/(main)/layout.tsx, paddings, BaseNav, bottom
  nav. Referencia: /, /feed, /profile. Usar al crear o ajustar rutas en
  app/(main).
---

# Vista móvil Tanku (scroll + nav + safe areas)

## Objetivo

- **&lt; md**: priorizar el **gesto de scroll del navegador** (minimizar barra de URL en Safari) y un solo eje de desplazamiento: el **documento** (o mezcla `max(#app-main, window)`), no un `<div>` con `overflow-y-auto` atrapado en `main` sin necesidad.
- **md+**: en rutas “tipo feed / perfil”, el scroll pasa a un **contenedor interno** de la página (`#feed-scroll-root`, `#profile-scroll-root`…); en `<main>`: `md:overflow-hidden`.

Rutas ya alineadas en **`tanku-front/app/(main)/layout.tsx`** (banderas `isSafariDocumentMainRoute`):

- `/` (landing)
- `/feed`, `/events`, `/friends`
- `/profile`, `/profile/[username]`, … (todo lo que bajo `/profile/*`)

Otras (checkout gift-direct, notifications) siguen con **scroll solo interno** y `<main> overflow-hidden`.

## 1. `layout.tsx`: clase de `<main id="app-main">`

No duplicar lógica a mano: añade la ruta a la **bandera** que corresponda.

- **Rutas `isSafariDocumentMainRoute`** (landing va aparte con `pb-20` móvil):

  `max-md:overflow-x-hidden max-md:overflow-visible overscroll-y-contain pb-0 md:overflow-hidden md:pb-0`

  En móvil **no** uses `max-md:overflow-y-auto` en `main` (el scroll pasa a documento/ventana). En **md+** el scroll vive en la página.

- **Rutas `mainOverlayScroll`** (p. ej. gift-direct, notifications): `overflow-hidden pb-0`.

- **Resto** (p. ej. términos): `overflow-y-auto overscroll-y-contain pb-20 …`.

- Contenedor **padre** de `main` (Sidebar + `main` + `MobileBottomNav`), en esas mismas rutas: `min-h-screen overflow-visible` (móvil).

## 2. Página: dos patrones (móvil = documento, md+ = caja)

### A) `/feed` (y similars con **un** `id` tipo `#…-scroll-root`)

- **max-md** en el nodo de contenido: `max-md:overflow-y-visible` (nunca `max-md:overflow-y-auto` como único scroller; evita rueda solo en el nav).
- **md+**: `md:overflow-y-auto`, `md:flex-1`, `md:basis-0`, `min-h-0` en la cadena flex.

Referencia: `tanku-front/app/(main)/feed/page.tsx` (`#feed-scroll-root`).

### B) `/profile` (mi perfil) y `/profile/[username]`

- **Shell** del layout de página: `max-md:overflow-y-visible max-md:overflow-x-hidden` y `md:overflow-hidden` en el **outer** y en el nodo con `id="profile-scroll-root"` o `id="profile-public-scroll-root"`.
- **Capa con padding** (`max-md:pt-*` / `max-md:pb-[calc(5.25rem+…)]`): en **móvil** `max-md:overflow-y-visible max-md:flex-none`; en **md+** `md:overflow-y-auto` + `flex-1 basis-0` para el scroll interno.

Referencia: `tanku-front/app/(main)/profile/page.tsx`, `…/profile/[username]/page.tsx`.

## 3. Padding bajo nav fijo y bottom bar

- **Superior (móvil)**: p. ej. `max-md:pt-[max(6.25rem,calc(env(safe-area-inset-top,0px)+5.25rem))]` (ajustar si el header es más alto).
- **Inferior (móvil)**: `max-md:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]`.
- **Horizontal**: `max-md:px-3` (o el que use la vista).

## 4. `BaseNav` translúcido (móvil)

**`mobileTranslucentNav`** en `components/layout/base-nav.tsx` (perfil, etc.): cristal en &lt; md, sólido en md+.

## 5. Nav fijo de página (FeedNav, etc.)

Móvil: blur; md+: sólido, `md:left-36 md:right-0` si aplica al área de contenido.

## 6. Checklist al tocar o crear una ruta

1. [ ] Decidir: **¿Safari / documento en móvil?** → sumar a `isSafariDocumentMainRoute` o `isLandingRoute` (ver `layout.tsx`), **no** dejar `main` con `overflow-y-auto` solo en móvil para esas rutas.
2. [ ] En la página, **&lt; md** el bloque bajo el nav: `overflow-y-visible` (o equivalente) para no atrapar el scroll.
3. [ ] Paddings `max-md:pt` / `max-md:pb` + safe areas; hueco reservado bottom nav.
4. [ ] Hooks de scroll: `use-feed-scroll-nav` con lectura `max(#app-main, window)` en “outer scroll” (ver hook).
5. [ ] Probar ancho &lt; 768: una sola “correa” de scroll, nada crítico tapado por el bottom nav.

## 7. Z-index de modales

Overlays encima del bottom nav: `z-index ≥ 1000000` si el nav usa 999999.

## 8. Resumen: variante “Safari” (móvil)

- **`layout.tsx`**: en rutas de la bandera, `<main>` con **`max-md:overflow-visible`** (y `md:overflow-hidden` para ceder el scroll a la página en escritorio).
- **Páginas**: en **&lt; md** no crees un contenedor con **solo** `overflow-y-auto` que sea el scroller mientras el usuario espera el gesto de documento. Coherente con **`/feed`**, **landing** y **perfil** actuales.
- **Infinite / intersection**: con scroll en documento, `root: null` (viewport) en móvil si aplica.

Si una vista necesita **obligatoriedad** de scroll anclado a un contenedor (p. ej. modales, drag), documentar la excepción y valorar añadirla a `mainOverlayScroll` en el layout.
