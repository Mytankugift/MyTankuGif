import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ORDER_TANKU_MODULE } from "../../../modules/order_tanku";
import OrderTankuModuleService from "../../../modules/order_tanku/service";
import { CreateOrderInput } from "..";

const createOrderStep = createStep(
  "create-order-step",
  async (
    { orderData, orderVariantsData }: CreateOrderInput,
    { container }
  ) => {

    
    const orderModuleService: OrderTankuModuleService = container.resolve(
      ORDER_TANKU_MODULE
    );
    const dataShippingAddress = {
      first_name: orderData.first_name,
      last_name: orderData.last_name,
      address_1: orderData.address_1,
      address_2: orderData.address_2,
      company: orderData.company,
      postal_code: orderData.postal_code,
      city: orderData.city,
      country_code: orderData.country_code,
      province: orderData.province,
      phone: orderData.phone
    };
    const shippingAddress = await orderModuleService.createShippingAddressTankus(dataShippingAddress);
    const order = await orderModuleService.createOrderTankus({...orderData, shipping_address_id: shippingAddress.id});
    
    const orderVariantsDataWithOrderId = orderVariantsData.map(v => ({
      ...v,
      order_id: order.id,
      status_id: order.status_id
    }));
    const orderVariants = await orderModuleService.createOrderVariantTankus(orderVariantsDataWithOrderId);

    return new StepResponse(order, order.id);
  },
  async (orderId: string, { container }) => {
    const orderModuleService: OrderTankuModuleService = container.resolve(
      ORDER_TANKU_MODULE
    );

    // Implementar lógica de compensación (rollback) si es necesario
    await orderModuleService.deleteOrderTankus(orderId);
  }
);

export default createOrderStep;
