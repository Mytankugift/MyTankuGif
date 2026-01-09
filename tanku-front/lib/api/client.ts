/**
 * Cliente API centralizado
 * Control total sobre peticiones HTTP
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'

export class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor() {
    this.baseURL = API_URL
    // Inicializar token desde localStorage si existe
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth-token')
      if (storedToken) {
        this.token = storedToken
      }
    }
  }

  setToken(token: string | null) {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth-token', token)
      } else {
        localStorage.removeItem('auth-token')
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth-token')
    }
    return null
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data: T; error?: { code: string; message: string } }> {
    const url = `${this.baseURL}${endpoint}`
    const token = this.getToken()
    
    // Logging en desarrollo
    if (process.env.NODE_ENV === 'development') {
      const cursorHeader = options.headers && 'X-Feed-Cursor' in options.headers 
        ? ` (Cursor: ${(options.headers['X-Feed-Cursor'] as string).substring(0, 20)}...)` 
        : ''
      console.log(`[API] ${options.method || 'GET'} ${url}${cursorHeader}`)
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }

    // Agregar headers personalizados (incluyendo X-Feed-Cursor)
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (value) {
          headers[key] = value as string
        }
      })
    }

    try {
      // Crear AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: { code: 'HTTP_ERROR', message: `HTTP ${response.status}: ${response.statusText}` } 
        }))
        return {
          success: false,
          data: null as T,
          error: errorData.error || { code: 'HTTP_ERROR', message: `HTTP ${response.status}: ${response.statusText}` }
        }
      }

      // Manejar respuestas 204 (No Content) o respuestas vacías
      const contentType = response.headers.get('content-type')
      const isJSON = contentType && contentType.includes('application/json')
      const hasContent = response.status !== 204 && response.status !== 202

      let data: any
      if (hasContent && isJSON) {
        const text = await response.text()
        data = text ? JSON.parse(text) : {}
      } else if (hasContent) {
        const text = await response.text()
        data = text ? JSON.parse(text) : { data: {}, success: true }
      } else {
        // 204 No Content - respuesta exitosa sin body
        data = { data: {}, success: true }
      }

      // Logging detallado para debugging
      if (process.env.NODE_ENV === 'development' && endpoint.includes('/feed')) {
        console.log('[API] Respuesta raw del feed:', {
          endpoint,
          hasData: !!data.data,
          hasItems: !!data.data?.items,
          hasNextCursorToken: !!data.data?.nextCursorToken,
          dataKeys: Object.keys(data),
          dataDataKeys: data.data ? Object.keys(data.data) : null,
        })
      }

      // Verificar estructura de respuesta
      if (data.data) {
        // Respuesta normalizada: { data: {...}, error?: {...} }
        // Si data.data tiene items, es el feed
        if (data.data.items && Array.isArray(data.data.items)) {
          return {
            success: true,
            data: data.data, // { items: [...], nextCursorToken: ... }
          }
        }
        return {
          success: true,
          data: data.data,
        }
      } else if (data.items && Array.isArray(data.items)) {
        // Respuesta directa del feed: { items: [...], nextCursorToken: ... }
        return {
          success: true,
          data: data,
        }
      } else {
        // Respuesta inesperada
        console.warn('[API] Estructura de respuesta inesperada:', data)
        return {
          success: false,
          data: null as T,
          error: { code: 'INVALID_RESPONSE', message: 'Estructura de respuesta inválida' }
        }
      }
    } catch (error: any) {
      console.error('[API] Error:', error)
      
      // Manejar diferentes tipos de errores
      if (error.name === 'AbortError') {
        return {
          success: false,
          data: null as T,
          error: { code: 'TIMEOUT_ERROR', message: 'La solicitud tardó demasiado tiempo' }
        }
      }
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        return {
          success: false,
          data: null as T,
          error: { 
            code: 'NETWORK_ERROR', 
            message: `No se pudo conectar al servidor. Verifica que el backend esté corriendo en ${this.baseURL}` 
          }
        }
      }

      return {
        success: false,
        data: null as T,
        error: { code: 'UNKNOWN_ERROR', message: error.message || 'Error desconocido' }
      }
    }
  }

  get<T>(endpoint: string, headers?: HeadersInit) {
    return this.request<T>(endpoint, { method: 'GET', headers })
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()

