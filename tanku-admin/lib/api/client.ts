import axios, { AxiosInstance } from 'axios'
import { config } from '../config'

const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 60000, // 60 segundos para procesos largos
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Mejor logging de errores
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('❌ Network Error - Posibles causas:')
      console.error('  1. CORS: El backend no permite requests desde este origen')
      console.error('  2. URL incorrecta:', config.apiUrl)
      console.error('  3. Backend no accesible o caído')
      console.error('  4. Problemas de SSL/certificados')
      console.error('Error completo:', error)
    } else {
      console.error('API Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      })
    }
    return Promise.reject(error)
  }
)

export { apiClient }

