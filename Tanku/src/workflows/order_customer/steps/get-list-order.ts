import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_TANKU_MODULE } from "../../../modules/order_tanku";
import OrderTankuModuleService from "../../../modules/order_tanku/service";

// Definir interfaces para los tipos
interface OrderTankuData {
  id: string;
  cart_id: string;
  email: string;
  payment_method: string;
  total_amount: number;
  status_id: string;
  status?: { id: string };
  shipping_address_id: string;
  shipping_address?: { id: string };
  [key: string]: any; // Para permitir otras propiedades
}

interface OrderLink {
  customer_id: string;
  order_tanku_id: string;
  order_tanku: OrderTankuData;
  [key: string]: any;
}

interface OrderWithVariant {
  order_tanku: OrderTankuData & {
    variant: any;
    customer_id: string;
  };
}

const getListOrderStep = createStep(
  "get-list-order-step",
  async (
    { customer_id }: { customer_id: string },
    { container }
  ) => {
    const orderModuleService: OrderTankuModuleService = container.resolve(
      ORDER_TANKU_MODULE
    );
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: [
        "order_tanku_link.order_tanku.*",
      ],
      filters: {
        id: customer_id,
      },
      pagination: {
        order: {
          created_at: "desc",
        },
      },
    });

    if (!customers || customers.length === 0 || !customers[0].order_tanku_link) {
      return new StepResponse([]);
    }

    const orders = customers[0].order_tanku_link || [];
    const ordersDataWithVariant: OrderWithVariant[] = [];

    for (const order of orders) {
      if (!order) continue;
      
      const variant = await orderModuleService.listAndCountOrderVariantTankus({
        order_id: order.order_tanku_id
      });
      
      const orderData = order as unknown as OrderLink;
      
      const orderWithVariant: OrderWithVariant = {
        order_tanku: {
          ...(orderData.order_tanku || {}),
          variant,
          customer_id: orderData.customer_id
        }
      };
      
      ordersDataWithVariant.push(orderWithVariant);
    }
    
    
    return new StepResponse(ordersDataWithVariant.reverse());
  }
)

export default getListOrderStep