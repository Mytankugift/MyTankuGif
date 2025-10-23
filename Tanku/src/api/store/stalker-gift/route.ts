import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createStalkerGiftWorkflow } from "../../../workflows/stalker_gift"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {

  try {
    const {
      total_amount,
      first_name,
      phone,
      email,
      alias,
      recipient_name,
      contact_methods,
      products,
      message,
      customer_giver_id,
      customer_recipient_id,
      payment_method = "epayco",
      payment_status = "pending"
    } = req.body as {
      total_amount: number
      first_name: string
      phone: string
      email: string
      alias: string
      recipient_name: string
      contact_methods: any[]
      products: any[]
      message?: string
      customer_giver_id?: string
      customer_recipient_id?: string
      payment_method?: string
      payment_status?: string
    }

    // Validaciones básicas
    if (!total_amount || !first_name || !email || !alias || !recipient_name) {
      console.error('Faltan campos requeridos')
      return res.status(400).json({
        error: "Faltan campos requeridos: total_amount, first_name, email, alias, recipient_name"
      })
    }

    console.log('Ejecutando workflow createStalkerGiftWorkflow...')

    // Ejecutar el workflow
    const { result } = await createStalkerGiftWorkflow(req.scope).run({
      input: {
        total_amount,
        first_name,
        phone,
        email,
        alias,
        recipient_name,
        contact_methods,
        products,
        message,
        customer_giver_id,
        customer_recipient_id,
        payment_method,
        payment_status
      }
    })

    console.log('Workflow ejecutado exitosamente:', result)

    // Generar texto de invitación con la URL
    const invitationUrl = `http://mytanku.com/stalkergift/${result.id}`
    const invitationText = `🎁 ¡Tienes un regalo sorpresa esperándote! 🎁

Alguien que te aprecia mucho te ha enviado un regalo anónimo a través de MyTanku.

Para ver tu regalo y conocer más detalles, visita:
${invitationUrl}

¡No te lo pierdas! 💝

---
MyTanku - Regalos que conectan corazones`

    console.log('URL de invitación generada:', invitationUrl)
    console.log('Texto de invitación:', invitationText)

    res.status(201).json({
      success: true,
      stalkerGift: result,
      invitationUrl,
      invitationText,
      message: "StalkerGift creado exitosamente"
    })

  } catch (error) {
    console.error('Error en POST /store/stalker-gift:', error)
    
    res.status(500).json({
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    })
  }
}
