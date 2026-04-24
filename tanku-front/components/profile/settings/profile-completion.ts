import type { User } from '@/types/api'

const STEPS: { id: string; label: string; isDone: (u: User) => boolean }[] = [
  { id: 'username', label: 'Usuario (username)', isDone: (u) => Boolean(u.username?.trim()) },
  { id: 'firstName', label: 'Nombre', isDone: (u) => Boolean(u.firstName?.trim()) },
  { id: 'lastName', label: 'Apellido', isDone: (u) => Boolean(u.lastName?.trim()) },
  { id: 'email', label: 'Email', isDone: (u) => Boolean(u.email?.trim()) },
  { id: 'avatar', label: 'Foto de perfil', isDone: (u) => Boolean(u.profile?.avatar?.trim()) },
  { id: 'bio', label: 'Biografía', isDone: (u) => Boolean(u.profile?.bio?.trim()) },
  { id: 'phone', label: 'Teléfono', isDone: (u) => Boolean(u.phone?.trim()) },
  {
    id: 'social',
    label: 'Al menos una red social',
    isDone: (u) => Boolean(u.profile?.socialLinks && u.profile.socialLinks.length > 0),
  },
]

export function getProfileCompletionPercent(user: User | null | undefined): number {
  if (!user) return 0
  const n = STEPS.filter((s) => s.isDone(user)).length
  return Math.min(100, Math.round((n / STEPS.length) * 100))
}

export function getProfileMissingItems(user: User | null | undefined): string[] {
  if (!user) return STEPS.map((s) => s.label)
  return STEPS.filter((s) => !s.isDone(user)).map((s) => s.label)
}
