import type { SocialLink } from '../dto/auth.dto';
import { BadRequestError } from '../errors/AppError';

/**
 * Convierte texto de usuario/@handle en URL absoluta antes de persistir.
 * Si ya llega una URL http(s), se conserva (compatibilidad con datos antiguos).
 */
export function normalizeSocialProfileUrl(platform: string, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new BadRequestError('El usuario o perfil no puede estar vacío');
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new BadRequestError('URL inválida');
      }
      return trimmed;
    } catch (e) {
      if (e instanceof BadRequestError) throw e;
      throw new BadRequestError('URL inválida');
    }
  }

  const handle = trimmed.replace(/^@+/, '').trim();
  if (!handle) {
    throw new BadRequestError('Usuario inválido');
  }

  const p = platform.toLowerCase();

  switch (p) {
    case 'facebook':
      return `https://www.facebook.com/${encodeURIComponent(handle)}`;
    case 'instagram':
      return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
    case 'twitter':
    case 'x':
      return `https://twitter.com/${encodeURIComponent(handle)}`;
    case 'youtube':
      return `https://www.youtube.com/@${encodeURIComponent(handle)}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
    case 'linkedin':
      return `https://www.linkedin.com/in/${encodeURIComponent(handle)}/`;
    default:
      throw new BadRequestError(`Plataforma no soportada: ${platform}`);
  }
}

export function normalizeSocialLinksForStorage(links: SocialLink[]): SocialLink[] {
  return links.map((link) => ({
    platform: link.platform,
    url: normalizeSocialProfileUrl(link.platform, link.url),
  }));
}
