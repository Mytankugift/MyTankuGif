/** Jobs terminados a conservar por cada DropiJobType (SYNC_STOCK, RAW, …). */
export function getDropiJobRetentionPerType(): number {
  const raw = process.env.DROPI_JOB_RETENTION_PER_TYPE
  if (raw == null || raw === '') return 10
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return 10
  return Math.min(n, 50)
}

export const DROPI_JOB_LIST_DEFAULT_LIMIT = 10
export const DROPI_JOB_LIST_MAX_LIMIT = 10
