import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { createOrderTankuWorkflow } from "../../../../workflows/order_tanku";

interface CheckoutOrderRequest {
  shipping_address: AddressPayload
  billing_address: AddressPayload
  email: string
  payment_method: string
  cart_id?: string
}

interface AddressPayload {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  company?: string
  postal_code?: string
  city?: string
  country_code?: string
  province?: string
  phone?: string
}

interface DataCart {
customer_id: string
  cart_id: string
  producVariants: Array<{
    variant_id: string
    quantity: number
    original_total: number
    unit_price: number
  }>
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { dataForm, dataCart } = req.body as { dataForm: CheckoutOrderRequest; dataCart: DataCart };


    // Transformar los datos de CheckoutOrderRequest al formato de OrderData
    const orderData = {
      cart_id: dataCart.cart_id,
      email: dataForm.email,
      payment_method: dataForm.payment_method,
      total_amount: dataCart.producVariants.reduce((total, variant) => total + variant.original_total, 0),
      first_name: dataForm.shipping_address.first_name || "",
      last_name: dataForm.shipping_address.last_name || "",
      address_1: dataForm.shipping_address.address_1 || "",
      address_2: dataForm.shipping_address.address_2 || "",
      company: dataForm.shipping_address.company || "",
      postal_code: dataForm.shipping_address.postal_code || "",
      city: dataForm.shipping_address.city || "",
      country_code: dataForm.shipping_address.country_code || "",
      province: dataForm.shipping_address.province || "",
      phone: dataForm.shipping_address.phone || "",
      status_id: "status_pending_id"
    };
    
    const { result: order } = await createOrderTankuWorkflow(req.scope).run({
      input: {
        orderData,
        orderVariantsData: dataCart.producVariants,
        customerId: dataCart.customer_id
      }
    });
    

    
    return res.status(200).json({
      success: true,
      message: "Orden creada exitosamente",
      order: order
    });
  } catch (error) {
    console.error("Error al crear la orden:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear la orden",
      error: error.message,
    });
  }
};