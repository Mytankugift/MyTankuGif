import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

/**
 * Ruta para completar la autenticación de Google
 * Genera un token válido usando el mismo método que Medusa usa internamente
 * 
 * IMPORTANTE: Usamos el módulo AUTH de Medusa para crear una sesión válida,
 * igual que lo hace sdk.auth.login() internamente.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { customer_id } = req.body

  if (!customer_id) {
    return res.status(400).json({ error: "customer_id es requerido" })
  }

  try {
    // Verificar que el customer existe
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
    const customer = await customerModuleService.retrieveCustomer(customer_id)
    
    if (!customer) {
      return res.status(404).json({ error: "Customer no encontrado" })
    }

    // Obtener el módulo AUTH de Medusa
    const authModuleService = req.scope.resolve(Modules.AUTH)
    
    // Obtener el JWT secret de la configuración
    const configModule = req.scope.resolve("configModule")
    const jwtSecret = configModule.projectConfig.http.jwtSecret || process.env.JWT_SECRET || "supersecret"
    
    // Generar token JWT con el mismo formato que usa Medusa
    // El formato correcto es: { actor_id, actor_type, auth_identity_id, app_metadata }
    // actor_id debe ser el ID del customer
    const token = jwt.sign(
      {
        actor_id: customer_id,
        actor_type: "customer",
        auth_identity_id: "", // Se puede dejar vacío si no tenemos auth_identity
        app_metadata: {},
      },
      jwtSecret,
      {
        expiresIn: "7d",
      }
    )
    
    // Log para debugging
    console.log("Token generado para customer:", customer_id)
    console.log("JWT Secret usado:", jwtSecret.substring(0, 10) + "...")
    
    // Verificar que el token se puede decodificar
    try {
      const decoded = jwt.verify(token, jwtSecret)
      console.log("Token verificado correctamente:", decoded)
    } catch (verifyError) {
      console.error("Error verificando token:", verifyError)
    }

    return res.json({ token })
  } catch (error: any) {
    console.error("Error generando token:", error)
    console.error("Error stack:", error?.stack)
    return res.status(500).json({ 
      error: "Error generando token de autenticación",
      details: error.message 
    })
  }
}

