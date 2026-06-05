import type { StoryDTO } from '@/lib/hooks/use-stories'

/** Duración por defecto para historias con imagen o wishlist */
export const STORY_IMAGE_DURATION_MS = 5000

export const STORY_VIDEO_MIN_MS = 1000
/** Historias manuales pueden ser más largas que 60s */
export const STORY_VIDEO_MAX_MS = 180_000

export function isStoryVideoFileType(fileType: string | undefined): boolean {
  if (!fileType) return false
  const normalized = fileType.toLowerCase()
  return normalized === 'video' || normalized.startsWith('video/')
}

export function isWishlistStoryItem(story: StoryDTO): boolean {
  return story.storyType === 'WISHLIST' && Boolean(story.productId)
}

/** Primer archivo reproducible (orden API) */
export function getStoryPrimaryFile(story: StoryDTO) {
  if (!story.files?.length) return null
  const sorted = [...story.files].sort((a, b) => a.orderIndex - b.orderIndex)
  return sorted.find((f) => Boolean(f.fileUrl)) ?? null
}

/** Solo historias que el visor puede mostrar (manual con media o wishlist con producto) */
export function filterPlayableStories(stories: StoryDTO[]): StoryDTO[] {
  return stories.filter((story) => {
    if (isWishlistStoryItem(story)) return true
    return Boolean(getStoryPrimaryFile(story))
  })
}

/** Más antigua primero, como sesión tipo Instagram */
export function sortStoriesForPlayback(stories: StoryDTO[]): StoryDTO[] {
  return [...stories].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

/** `StoryFile.duration` en API: segundos */
export function storyMediaDurationMs(
  fileType: string | undefined,
  fileDurationSeconds: number | null | undefined,
  videoElementDurationSeconds?: number,
): number {
  if (!isStoryVideoFileType(fileType)) {
    return STORY_IMAGE_DURATION_MS
  }

  const fromDb =
    fileDurationSeconds != null && fileDurationSeconds > 0
      ? fileDurationSeconds * 1000
      : null
  const fromVideo =
    videoElementDurationSeconds != null &&
    Number.isFinite(videoElementDurationSeconds) &&
    videoElementDurationSeconds > 0
      ? videoElementDurationSeconds * 1000
      : null

  const raw = fromDb ?? fromVideo ?? STORY_IMAGE_DURATION_MS
  return Math.min(Math.max(raw, STORY_VIDEO_MIN_MS), STORY_VIDEO_MAX_MS)
}

/** Agrupa historias del feed por usuario (caché del visor) */
export function groupPlayableStoriesByUser(stories: StoryDTO[]): Map<string, StoryDTO[]> {
  const map = new Map<string, StoryDTO[]>()
  for (const story of filterPlayableStories(stories)) {
    const uid = story.userId
    const list = map.get(uid) ?? []
    if (!list.some((s) => s.id === story.id)) list.push(story)
    map.set(uid, list)
  }
  for (const [uid, list] of map) {
    map.set(uid, sortStoriesForPlayback(list))
  }
  return map
}

export function getStoryViewerPrefersMuted(): boolean {
  if (typeof window === 'undefined') return true
  return false
}
