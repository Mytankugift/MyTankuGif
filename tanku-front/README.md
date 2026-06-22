# 🚀 Tanku Front

Frontend de Tanku - E-commerce Social construido con Next.js 15 + React 19

## 📋 Stack Tecnológico

- **Framework:** Next.js 16.1.1 (App Router)
- **React:** 19.2.3
- **TypeScript:** 5.x
- **Tailwind CSS:** 4.x
- **Data Fetching:** @tanstack/react-query
- **Estado Global:** Zustand
- **Realtime:** Socket.IO Client
- **Validación:** Zod

## 🚀 Inicio Rápido

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

Abre [http://localhost:8000](http://localhost:8000) en tu navegador.

### Build

```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
tanku-front/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación
│   ├── (main)/            # Rutas principales
│   └── layout.tsx         # Root layout
├── components/             # Componentes reutilizables
│   ├── ui/                # Componentes base
│   ├── layout/            # Nav, Sidebar, Footer
│   ├── feed/              # Componentes del feed
│   └── ...
├── lib/                    # Utilidades y configuración
│   ├── api/               # Cliente API
│   ├── stores/            # Zustand stores
│   ├── hooks/             # Custom hooks
│   └── providers/         # React Query provider
├── types/                  # TypeScript types
└── public/                # Assets estáticos
```

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_SOCKET_URL=http://localhost:9000
```

## 📚 Documentación

Ver `ROADMAP_FRONTEND.md` para el plan completo de desarrollo.

Documentación interna del equipo (carpeta `_meta`, no en git): abre **`_meta/README.md`** → tabla **«Resumen de features»** con estado, fechas y pendientes de analíticas, feed, notificaciones, tracking, etc.

### Rendimiento en desarrollo local

Al abrir el **modal de producto** desde el feed, `GET /api/v1/products/:handle` puede tardar más en local que en producción. En prod el comportamiento observado es rápido. Causas habituales en dev: API + PostgreSQL en la misma máquina, queries secuenciales del backend y ausencia de la red del deploy.

El front ya hace **prefetch** al tocar la card (`pointerDown`/`touchStart`/hover) y cachea 10 min (`lib/hooks/use-product.ts`). Si la segunda apertura del mismo producto es instantánea, el cuello es la petición inicial, no el render.

Detalle completo: `_meta/README.md` → sección «Notas: rendimiento local vs producción».

## 🎯 Estado Actual

- ✅ FASE 0: Setup inicial completado
- ⏳ FASE 1: Estructura base y layout (en progreso)
