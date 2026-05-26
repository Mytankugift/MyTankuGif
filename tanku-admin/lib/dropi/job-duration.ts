export function computeJobDurationMs(job: {
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}): number | null {
  const startMs = job.startedAt
    ? new Date(job.startedAt).getTime()
    : new Date(job.createdAt).getTime()
  if (!job.finishedAt) return null
  const endMs = new Date(job.finishedAt).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null
  return Math.max(0, endMs - startMs)
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  if (totalSec < 60) return `${totalSec} s`

  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min < 60) {
    return sec > 0 ? `${min} min ${sec} s` : `${min} min`
  }

  const h = Math.floor(min / 60)
  const remMin = min % 60
  return remMin > 0 ? `${h} h ${remMin} min` : `${h} h`
}
