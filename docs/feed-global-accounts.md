# Cuentas globales del feed

## Qué hace

Permite designar usuarios de la app (por correo) desde el ERP para que su contenido se muestre a **todos** los usuarios, como si fueran amigos, sin crear filas en la tabla `friends`.

| Superficie | Comportamiento |
|------------|----------------|
| `/feed` (autenticado) | Posts e historias de cuentas globales + amigos + propios |
| Landing `/` (anónimo) | Productos del ranking intercalados con posts globales (1 post cada 5 productos) |
| Historias en landing | No aplica (landing no muestra historias) |

## Gestión en ERP

1. Ir a **Configuración → Cuentas del feed** (`/settings/feed-global-accounts`).
2. Introducir el **correo** del usuario de la app y pulsar **Añadir**.
3. **Desactivar** deja de mostrar la cuenta sin borrar el registro (se puede reactivar).

API admin (requiere JWT admin):

- `GET /api/v1/admin/feed-global-accounts`
- `POST /api/v1/admin/feed-global-accounts` — body: `{ "email": "..." }`
- `PATCH /api/v1/admin/feed-global-accounts/:id` — body: `{ "active": false }` o `{ "sortOrder": 0 }`

## Supuestos de producto

- **Bloqueos:** si un usuario bloqueó una cuenta global, **sigue viendo** su contenido (cuentas editoriales/oficiales).
- **Intercalación landing:** misma regla que `/feed` — 1 post cada 5 productos.
- **Caché:** lista de IDs globales en memoria ~60s; al guardar en ERP se invalida de inmediato.

## Modelo de datos

Tabla `feed_global_accounts` (`FeedGlobalAccount` en Prisma), FK a `users` con `onDelete: Cascade`.

## Archivos principales

| Área | Ruta |
|------|------|
| Helper autores visibles | `tanku-backend/src/modules/feed-global-accounts/resolve-visible-poster-authors.ts` |
| Servicio + caché | `tanku-backend/src/modules/feed-global-accounts/global-feed-accounts.service.ts` |
| Feed / público | `tanku-backend/src/modules/feed/feed.service.ts` |
| Historias | `tanku-backend/src/modules/stories/stories.service.ts` |
| Admin API | `tanku-backend/src/modules/admin/admin-feed-global-accounts/` |
| ERP UI | `tanku-admin/app/(admin)/settings/feed-global-accounts/page.tsx` |
| Landing | `tanku-front/lib/hooks/use-landing-feed.ts`, `components/feed/landing-grid.tsx` |

## Migración

```bash
cd tanku-backend
npx prisma migrate deploy
npx prisma generate
```

Migración: `20260604120000_feed_global_accounts`.
