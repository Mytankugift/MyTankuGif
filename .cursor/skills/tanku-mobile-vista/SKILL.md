---
name: tanku-mobile-vista
description: >-
  Aplica el patrón Tanku para vistas móviles (< md) con scroll en un contenedor
  interno (no en main), nav superior translúcido opcional, reserva de espacio
  bajo chrome fijo y coherencia con el bottom nav. Usar al crear o ajustar
  páginas tipo /feed, /events o nuevas rutas en app/(main).
---

# Vista móvil Tanku (scroll + nav + safe areas)

## Objetivo

En **móvil** (`< md`), el scroll principal de la app **no** debe vivir en `<main id="app-main">` cuando la página necesita scroll fino, nav fijo translúcido y contenido que pasa “por detrás” del menú inferior. Eso ya está resuelto en **`/feed`** y **`/events`**: replicar el mismo contrato en nuevas páginas.

En **tablet/desktop** (`md+`), `<main>` puede seguir scrolleando con `pb-0` y el nav usa fondo opaco salvo que la página pida otra cosa.

## 1. Registrar la ruta en el layout principal

**Archivo:** `tanku-front/app/(main)/layout.tsx`

- Añade una bandera por ruta, junto a `isFeedOverlayScroll`:

```tsx
const isFeedOverlayScroll = pathname === '/feed'
const isEventsInnerScroll = pathname === '/events' // ejemplo
const mainOverlayScroll = isFeedOverlayScroll || isEventsInnerScroll || isTuRutaInnerScroll
```

- Usa `mainOverlayScroll` en la `className` de `<main>`:

  - **Si entra en la lista:** `overflow-hidden pb-0` (el scroll es interno a la página).
  - **Si no:** `overflow-y-auto overscroll-y-contain pb-20 md:pb-0` (scroll global + hueco para `MobileBottomNav`).

**Importante:** cada nueva ruta “tipo feed” debe sumarse a `mainOverlayScroll` o el `main` seguirá scrolleando y habrá doble scroll o contenido mal alineado con el bottom nav.

## 2. Estructura de la página (patrón contenedor)

**Shell exterior** (hijo directo de lo que renderiza la página):

- `flex min-h-0 w-full flex-1 flex-col overflow-hidden` (o equivalente) para ocupar el alto útil bajo el layout sin fugas de scroll.
- Opcional: `id="…-scroll-root"` para documentar el nodo raíz del scroll interno.

**Capa que scrollea** (solo esta lleva `overflow-y-auto`):

- Clases típicas: `min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain custom-scrollbar`.

## 3. Padding móvil bajo chrome fijo

Sobre la capa con `overflow-y-auto`, en **`max-md:`**:

- **Superior:** reservar altura del **nav fijo** + safe area, por ejemplo:

  `max-md:pt-[max(6.25rem,calc(env(safe-area-inset-top,0px)+5.25rem))]`

  Ajustar valores si el nav de esa página es más alto (tiras, categorías, etc.).

- **Inferior:** reservar el **MobileBottomNav** (~50px + safe area), por ejemplo:

  `max-md:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]`

- **Horizontal:** `max-md:px-3` (o `px-4` según diseño).

En **`md+`**, volver a paddings normales (`md:pt-28`, `md:px-8`, etc.) según la página.

**Referencias en repo:**

- Feed: `tanku-front/app/(main)/feed/page.tsx` (`#feed-scroll-root`, `scrollAreaPaddingTop`, nav fijo).
- Eventos: `tanku-front/app/(main)/events/page.tsx` (`#events-scroll-root`, mismas ideas de `max-md:pt-*` / `max-md:pb-*`).

## 4. Nav superior translúcido solo en móvil (BaseNav)

**Archivo:** `tanku-front/components/layout/base-nav.tsx`  
**Prop:** `mobileTranslucentNav` (opcional).

- En la página, pasa `mobileTranslucentNav` en `<BaseNav />` cuando quieras el mismo cristal que en feed en **&lt; md** (`rgba` + `backdrop-blur`), y fondo opaco desde **`md`**.
- No hace falta en páginas que ya usan otro nav (ej. `FeedNav` solo en `/feed`).

## 5. Nav fijo propio de la página (no BaseNav)

Si la página usa un **header `fixed`** propio (como el feed):

- En **móvil:** `max-md:` blur + fondo translúcido.
- En **tablet/desktop:** `md:` fondo sólido (`var(--color-surface-191e23-20)` o similar), sin blur; extender `md:right-0` si debe pegar al borde derecho del área de contenido.

## 6. Checklist rápido al añadir una ruta nueva

1. [ ] ¿El scroll debe ser solo interno? → Añadir ruta a `mainOverlayScroll` en `layout.tsx`.
2. [ ] Shell `overflow-hidden` + hijo `min-h-0 flex-1 overflow-y-auto`.
3. [ ] `max-md:pt-*` y `max-md:pb-*` con safe areas.
4. [ ] ¿Usa `BaseNav`? → Valorar `mobileTranslucentNav`.
5. [ ] Probar en viewport &lt; 768px: no doble scroll, nada crítico tapado por nav inferior o superior.

## 7. Z-index de modales globales

Modales que deben quedar por encima del bottom nav (`z-[999999]`) deben usar **z-index ≥ 1000000** en overlay (ver `EventsModal`, menú central móvil).

## 8. Variante Safari UX (scroll nativo del documento)

Cuando la prioridad sea que Safari/Chrome móvil minimicen su UI al bajar (barra superior/inferior del navegador), usar esta variante en **móvil**:

- En `app/(main)/layout.tsx`, para esa ruta usar:
  - contenedor principal: `min-h-screen overflow-visible` (en móvil),
  - `<main>`: `overflow-y-auto overscroll-y-contain pb-0 md:overflow-hidden` si en `md+` quieres mantener scroll interno.
- En la página, evitar `max-md:overflow-y-auto` en el contenedor interno; dejar `max-md:overflow-visible` para que el scroll real ocurra en documento/window.
- Los hooks que dependen de scroll deben soportar `window` en móvil:
  - nav por scroll: leer `window.scrollY`,
  - infinite scroll: `IntersectionObserver` con `root: null` (viewport) en móvil.
- Mantener `max-md:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]` para reservar espacio del `MobileBottomNav`.

Úsala en rutas donde el gesto nativo del navegador sea requisito UX. Si la prioridad es control fino del header/overlay, mantener el patrón de scroll interno.
