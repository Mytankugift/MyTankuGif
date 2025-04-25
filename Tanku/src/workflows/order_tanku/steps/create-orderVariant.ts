import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ORDER_TANKU_MODULE } from "../../../modules/order_tanku";
import OrderTankuModuleService from "../../../modules/order_tanku/service";
import { CreateOrderInput } from "..";

const createOrderVariantStep = createStep(
  "create-order-variant-step",
  async (
    { orderVariantsData, orderId }: CreateOrderInput & { orderId: string },
    { container }
  ) => {
    const orderModuleService: OrderTankuModuleService = container.resolve(
      ORDER_TANKU_MODULE
    );

    const orderVariantsDataWithOrderId = orderVariantsData.map(v => ({
      ...v,
      order_id: orderId
    }));

    // Crear los variantes de la orden
    const orderVariants = await orderModuleService.createOrderVariantTankus(orderVariantsDataWithOrderId);

    return new StepResponse(orderVariants, orderVariants.map(v => v.id));
  },
  async (orderVariantIds: string[], { container }) => {
    const orderModuleService: OrderTankuModuleService = container.resolve(
      ORDER_TANKU_MODULE
    );

    
    await orderModuleService.deleteOrderVariantTankus(orderVariantIds);
  }
);

export default createOrderVariantStep;
