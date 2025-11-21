import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Inicia el flujo de autenticación con Google
 * Redirige al usuario a la página de autenticación de Google
 * Esta ruta está fuera de /store/ para evitar la validación de publishable API key
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${(process.env.MEDUSA_BACKEND_URL && process.env.MEDUSA_BACKEND_URL.trim() !== "") ? process.env.MEDUSA_BACKEND_URL : "http://localhost:9000"}/auth/google/callback`
  // Asegurar que siempre tengamos una URL válida del frontend
  const clientUrl = (process.env.MEDUSA_CLIENT_URL && process.env.MEDUSA_CLIENT_URL.trim() !== "") 
    ? process.env.MEDUSA_CLIENT_URL 
    : "http://localhost:8000"
  
  if (!clientId) {
    return res.status(500).json({ 
      error: "Google Client ID no configurado" 
    })
  }

  // Generar un state aleatorio para seguridad
  const state = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15)
  
  // Guardar el state en la sesión o cookie para verificación posterior
  // Por ahora, lo pasamos como query param
  const scope = "email profile"
  const responseType = "code"
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=${responseType}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `state=${encodeURIComponent(state)}&` +
    `access_type=offline&` +
    `prompt=consent`

  // Redirigir al usuario a Google
  res.redirect(googleAuthUrl)
}

