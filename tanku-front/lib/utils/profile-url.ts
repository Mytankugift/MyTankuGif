/**
 * Utilidad para obtener URLs de perfiles usando username
 */

export function getProfileUrl(user: { username?: string | null; id?: string } | null | undefined): string {
  if (!user) return '/profile'
  
  // Si tiene username, usar username
  if (user.username) {
    return `/profile/${user.username}`
  }
  
  // Fallback a ID si no tiene username (para compatibilidad temporal)
  if (user.id) {
    return `/profile/${user.id}`
  }
  
  return '/profile'
}

