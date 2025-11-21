import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * Callback de Google OAuth
 * Recibe el código de autorización y lo intercambia por tokens
 * Esta ruta está fuera de /store/ para evitar la validación de publishable API key
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { code, state, error } = req.query
  // Asegurar que siempre tengamos una URL válida del frontend
  const clientUrl = (process.env.MEDUSA_CLIENT_URL && process.env.MEDUSA_CLIENT_URL.trim() !== "") 
    ? process.env.MEDUSA_CLIENT_URL 
    : "http://localhost:8000"
  const callbackUrl = `${clientUrl}/auth/google/callback`

  // Si hay un error de Google
  if (error) {
    console.error("Error en autenticación de Google:", error)
    return res.redirect(`${callbackUrl}?error=${encodeURIComponent(error as string)}`)
  }

  if (!code) {
    return res.redirect(`${callbackUrl}?error=missing_code`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${process.env.MEDUSA_BACKEND_URL}/auth/google/callback`

  if (!clientId || !clientSecret) {
    return res.redirect(`${callbackUrl}?error=config_error`)
  }

  try {
    // Intercambiar el código por tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Error obteniendo tokens de Google:", errorData)
      return res.redirect(`${callbackUrl}?error=token_exchange_failed`)
    }

    const tokens = await tokenResponse.json()
    const { access_token } = tokens

    // Obtener información del usuario de Google
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!userResponse.ok) {
      return res.redirect(`${callbackUrl}?error=user_info_failed`)
    }

    const userInfo = await userResponse.json()
    const { email, name, picture, id: googleId } = userInfo

    if (!email) {
      return res.redirect(`${callbackUrl}?error=no_email`)
    }

    // Obtener el servicio de Customer de Medusa
    // En Medusa v2, usamos el módulo de customer
    let customer
    try {
      const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
      
      // Buscar customer existente por email
      // El método listCustomers puede requerir un filtro diferente
      const existingCustomers = await customerModuleService.listCustomers({
        email: email,
      })

      if (existingCustomers && existingCustomers.length > 0) {
        customer = existingCustomers[0]
        // Si el customer existe pero no tiene cuenta, actualizarlo
        if (!customer.has_account) {
          customer = await customerModuleService.updateCustomers(customer.id, {
            has_account: true,
            metadata: {
              ...customer.metadata,
              google_id: googleId,
              google_picture: picture,
              auth_provider: "google",
            },
          })
          customer = Array.isArray(customer) ? customer[0] : customer
        }
      } else {
        // Crear nuevo customer como registrado (has_account: true)
        const newCustomer = await customerModuleService.createCustomers({
          email: email,
          first_name: name?.split(" ")[0] || "",
          last_name: name?.split(" ").slice(1).join(" ") || "",
          has_account: true, // IMPORTANTE: Marcar como registrado
          metadata: {
            google_id: googleId,
            google_picture: picture,
            auth_provider: "google",
          },
        })
        // createCustomers puede devolver un array o un objeto
        customer = Array.isArray(newCustomer) ? newCustomer[0] : newCustomer
      }
    } catch (error: any) {
      console.error("Error creando/buscando customer:", error)
      console.error("Error stack:", error?.stack)
      console.error("Error message:", error?.message)
      console.error("Error completo:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
      return res.redirect(`${callbackUrl}?error=customer_creation_failed&details=${encodeURIComponent(error?.message || "unknown")}`)
    }

    // Usar nuestro endpoint personalizado para generar el token
    // Esto asegura que el token tenga el actor_id correcto
    // Redirigir al frontend con el customer_id
    // El frontend llamará a /auth/google/complete para generar el token
    return res.redirect(`${callbackUrl}?customer_id=${encodeURIComponent(customer.id)}`)
  } catch (error: any) {
    console.error("Error en callback de Google:", error)
    console.error("Error stack:", error?.stack)
    console.error("Error message:", error?.message)
    console.error("Error completo:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
    return res.redirect(`${callbackUrl}?error=server_error&details=${encodeURIComponent(error?.message || "unknown")}`)
  }
}

