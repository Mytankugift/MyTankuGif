import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  value: unknown;
  expires: number;
}

/**
 * Caché en memoria muy simple para respuestas de analíticas.
 * Las analíticas son idénticas para cualquier admin, por lo que la clave por URL
 * (que incluye los query params from/to/granularity) es suficiente.
 * No se usa Redis porque está deshabilitado en el proyecto.
 */
const store = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos
const MAX_ENTRIES = 200;

function purgeExpired(now: number) {
  for (const [key, entry] of store) {
    if (entry.expires <= now) store.delete(key);
  }
}

/**
 * Middleware que cachea respuestas GET con status 200 por `req.originalUrl`.
 */
export function analyticsCache(ttlMs: number = DEFAULT_TTL_MS) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const key = req.originalUrl;
    const now = Date.now();
    const hit = store.get(key);

    if (hit && hit.expires > now) {
      return res.status(200).json(hit.value);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode === 200) {
        if (store.size >= MAX_ENTRIES) purgeExpired(now);
        store.set(key, { value: body, expires: Date.now() + ttlMs });
      }
      return originalJson(body);
    };

    next();
  };
}
