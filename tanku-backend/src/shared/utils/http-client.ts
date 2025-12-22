/**
 * Cliente HTTP con timeout de 30 segundos usando fetch nativo
 * Nunca confiar en timeouts largos
 */

export async function httpRequest(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout después de ${timeoutMs}ms`);
    }
    throw error;
  }
}
