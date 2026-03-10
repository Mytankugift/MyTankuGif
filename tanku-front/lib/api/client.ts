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
    // Primero verificar token en memoria
    if (this.token) return this.token
    
    // Luego verificar localStorage
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth-token')
      if (storedToken) {
        this.token = storedToken // Sincronizar con memoria
        return storedToken
      }
    }
    
    return null
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data: T; error?: { code: string; message: string } }> {
    const url = `${this.baseURL}${endpoint}`
    // Obtener token fresco en cada request para asegurar sincronización
    const token = this.getToken()
    
    // Logging en desarrollo
    if (process.env.NODE_ENV === 'development') {
      const cursorHeader = options.headers && 'X-Feed-Cursor' in options.headers 
        ? ` (Cursor: ${(options.headers['X-Feed-Cursor'] as string).substring(0, 20)}...)` 
        : ''
      const authHeader = token ? ' (Auth: ✓)' : ' (Auth: ✗)'
      console.log(`[API] ${options.method || 'GET'} ${url}${authHeader}${cursorHeader}`)
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
      // ✅ Aumentar timeout a 60 segundos para endpoints de Dropi (pueden tardar más)
      const isDropiEndpoint = endpoint.includes('/dropi/')
      const timeout = isDropiEndpoint ? 60000 : 30000 // 60 segundos para Dropi, 30 para otros
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.warn(`[API] Timeout después de ${timeout}ms para ${endpoint}`)
        controller.abort()
      }, timeout)

      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] Iniciando petición a ${endpoint} con timeout de ${timeout}ms`)
      }

      let response: Response
      try {
        response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
          signal: controller.signal,
        })
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        // Error de red (CORS, conexión rechazada, etc.)
        if (fetchError.name === 'AbortError') {
          throw new Error(`Timeout: La petición a ${endpoint} excedió el tiempo límite de ${timeout}ms`)
        }
        if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
          // Solo lanzar error si hay token (usuario autenticado debería poder conectarse)
          // Si no hay token, es probable que el usuario no esté autenticado y el error es esperado
          if (token) {
            throw new Error(`No se pudo conectar al servidor en ${this.baseURL}. Verifica que el backend esté corriendo y que la URL sea correcta.`)
          } else {
            // Usuario no autenticado, error silencioso
            throw new Error('NETWORK_ERROR_SILENT')
          }
        }
        throw fetchError
      }

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorData: any = {};
        const isAuthError = response.status === 401 || response.status === 403;
        let isNotFoundError = false;
        let isConnectionTimeoutError = false;
        
        try {
          const text = await response.text();
          
          // ✅ Solo loggear errores si no es un error de autenticación común o NOT_FOUND
          if (text && text.trim()) {
            try {
              errorData = JSON.parse(text);
              
              // Verificar si es un error NOT_FOUND o DIFFERENT_RECIPIENT (esperados)
              isNotFoundError = errorData.error?.code === 'NOT_FOUND' || 
                               errorData.error?.message?.includes('no encontrado') ||
                               response.status === 404;
              
              const isDifferentRecipient = errorData.error?.code === 'BAD_REQUEST' && 
                                          errorData.error?.message === 'DIFFERENT_RECIPIENT';
              
              // Verificar si es un error de timeout de conexión de base de datos
              isConnectionTimeoutError = errorData.error?.code === 'INTERNAL_ERROR' && 
                                        (errorData.error?.message?.includes('Connection terminated') ||
                                         errorData.error?.message?.includes('connection timeout') ||
                                         errorData.error?.message?.includes('Connection terminated due to connection timeout'));
              
              // Verificar si es un error de CONFLICT (como "Ya le diste like a este producto")
              const isConflictError = errorData.error?.code === 'CONFLICT' || 
                                     (errorData.error?.message?.includes('Ya le diste like') ||
                                      errorData.error?.message?.includes('ya existe'));
              
              // ✅ Solo loggear si no es un error de autenticación esperado, NOT_FOUND, DIFFERENT_RECIPIENT, CONFLICT o timeout de conexión
              if (!isAuthError && !isNotFoundError && !isDifferentRecipient && !isConnectionTimeoutError && !isConflictError) {
                console.error('[API] Error response body:', text);
              }
            } catch (parseError) {
              if (!isAuthError && !isNotFoundError && !isConnectionTimeoutError) {
                console.error('[API] Error parsing JSON:', parseError);
              }
              // Si el parseo falla, crear un objeto de error con el texto raw
              errorData = {
                error: {
                  code: 'PARSE_ERROR',
                  message: `Error al parsear respuesta: ${text.substring(0, 100)}`
                }
              };
            }
          } else {
            // Si el texto está vacío, crear un error por defecto
            errorData = {
              error: {
                code: 'HTTP_ERROR',
                message: `HTTP ${response.status}: ${response.statusText}`
              }
            };
          }
        } catch (readError) {
          if (!isAuthError && !isNotFoundError && !isConnectionTimeoutError) {
            console.error('[API] Error reading error response:', readError);
          }
          errorData = { 
            error: { 
              code: 'HTTP_ERROR', 
              message: `HTTP ${response.status}: ${response.statusText}` 
            } 
          };
        }
        
        // ✅ Mejorar el manejo de errores
        // El backend devuelve { success: false, error: { code, message } }
        // Pero también puede devolver directamente { error: { code, message } }
        let errorObj = errorData.error || errorData;
        
        // Verificar si es DIFFERENT_RECIPIENT (error esperado)
        const isDifferentRecipient = errorObj?.code === 'BAD_REQUEST' && 
                                    errorObj?.message === 'DIFFERENT_RECIPIENT';
        
        // Verificar nuevamente si es un error de timeout de conexión (por si no se detectó antes)
        if (!isConnectionTimeoutError) {
          isConnectionTimeoutError = errorObj?.code === 'INTERNAL_ERROR' && 
                                     (errorObj?.message?.includes('Connection terminated') ||
                                      errorObj?.message?.includes('connection timeout') ||
                                      errorObj?.message?.includes('Connection terminated due to connection timeout'));
        }
        
        // ✅ Solo loggear detalles si no es un error de autenticación esperado, NOT_FOUND, DIFFERENT_RECIPIENT o timeout de conexión
        if (!isAuthError && !isNotFoundError && !isDifferentRecipient && !isConnectionTimeoutError) {
          console.error('[API] Error data parsed:', errorData);
          console.error('[API] Error obj extracted:', errorObj);
        }
        
        // Si errorObj es un objeto vacío o no tiene code/message, usar valores por defecto
        if (!errorObj || typeof errorObj !== 'object' || Object.keys(errorObj).length === 0) {
          if (!isAuthError && !isNotFoundError && !isConnectionTimeoutError) {
            console.warn('[API] Error object is empty, using default error');
          }
          errorObj = { 
            code: 'HTTP_ERROR', 
            message: `HTTP ${response.status}: ${response.statusText}` 
          };
        } else if (!errorObj.code || !errorObj.message) {
          // Si tiene propiedades pero no code/message, construir un mensaje
          if (!isAuthError && !isNotFoundError && !isConnectionTimeoutError) {
            console.warn('[API] Error object missing code or message, constructing error');
          }
          errorObj = {
            code: errorObj.code || 'HTTP_ERROR',
            message: errorObj.message || errorObj.toString() || `HTTP ${response.status}: ${response.statusText}`
          };
        }
        
        return {
          success: false,
          data: null as T,
          error: errorObj
        };
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
      // Manejar diferentes tipos de errores
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        // Solo loggear timeout si hay token (usuario autenticado)
        if (token) {
          console.error('[API] Request aborted - posible timeout o cancelación')
        }
        return {
          success: false,
          data: null as T,
          error: { 
            code: 'TIMEOUT_ERROR', 
            message: 'La solicitud tardó demasiado tiempo o fue cancelada. Verifica tu conexión.' 
          }
        }
      }
      
      // Error silencioso para usuarios no autenticados
      if (error.message === 'NETWORK_ERROR_SILENT') {
        return {
          success: false,
          data: null as T,
          error: { 
            code: 'NETWORK_ERROR', 
            message: 'No se pudo conectar al servidor' 
          }
        }
      }
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('No se pudo conectar al servidor')) {
        // Solo loggear si hay token (usuario autenticado debería poder conectarse)
        if (token) {
          console.error('[API] Network error:', error)
        }
        return {
          success: false,
          data: null as T,
          error: { 
            code: 'NETWORK_ERROR', 
            message: `No se pudo conectar al servidor. Verifica que el backend esté corriendo en ${this.baseURL}` 
          }
        }
      }

      // Solo loggear otros errores si hay token
      if (token) {
        console.error('[API] Error:', error)
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

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()

