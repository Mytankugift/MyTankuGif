import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ORDER_TANKU_MODULE } from "../../../modules/order_tanku";
import OrderTankuModuleService from "../../../modules/order_tanku/service";


export type UpdateOrderStatusInput = {
  orderId: string;
};

const updateOrderStatusStep = createStep(
  "update-order-status-step",
  async (
    { orderId }: UpdateOrderStatusInput,
    { container }
  ) => {
    const orderModuleService: OrderTankuModuleService = container.resolve(
      ORDER_TANKU_MODULE
    );
    const orderUpdate = await orderModuleService.updateOrderTankus({
      id: orderId,
      status_id: "paid_status_id",
    });
   
    return new StepResponse(orderUpdate, {
          orderId,
        });
  },
  async (prevData: UpdateOrderStatusInput, { container }) => {
    const orderModuleService: OrderTankuModuleService = container.resolve(
      ORDER_TANKU_MODULE
    );
    await orderModuleService.updateOrderTankus({id: prevData.orderId, status_id: "pending_status_id"});
  }
);

export default updateOrderStatusStep;
