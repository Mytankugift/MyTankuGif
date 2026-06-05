const TTL_MS = 60_000;

let cachedUserIds: string[] | null = null;
let cachedAt = 0;
let cacheVersion = 0;

export function getGlobalAccountsCacheVersion(): number {
  return cacheVersion;
}

export function bumpGlobalAccountsCacheVersion(): void {
  cacheVersion += 1;
  cachedUserIds = null;
  cachedAt = 0;
}

export function getCachedActiveUserIds(): string[] | null {
  if (cachedUserIds === null) return null;
  if (Date.now() - cachedAt > TTL_MS) {
    cachedUserIds = null;
    return null;
  }
  return cachedUserIds;
}

export function setCachedActiveUserIds(ids: string[]): void {
  cachedUserIds = ids;
  cachedAt = Date.now();
}
