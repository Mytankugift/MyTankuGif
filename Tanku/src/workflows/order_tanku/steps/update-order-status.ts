// import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
// import { ORDER_TANKU_MODULE } from "../../../modules/order_tanku";
// import OrderTankuModuleService from "../../../modules/order_tanku/service";

// export type UpdateOrderStatusInput = {
//   orderId: string;
//   statusName: string;
// };

// const updateOrderStatusStep = createStep(
//   "update-order-status-step",
//   async (
//     { orderId, statusName }: UpdateOrderStatusInput,
//     { container }
//   ) => {
//     const orderModuleService: OrderTankuModuleService = container.resolve(
//       ORDER_TANKU_MODULE
//     );

//     // Obtener o crear el estado solicitado
//     const status = await orderModuleService.getOrCreateOrderStatus(statusName);

//     // Actualizar el estado de la orden
//     const updatedOrder = await orderModuleService.updateOrderStatus(orderId, status.id);

//     // Crear un objeto con la información necesaria para la compensación
//     const compensationData = { 
//       orderId, 
//       previousStatusId: updatedOrder.previousStatusId 
//     };

//     return new StepResponse(updatedOrder, compensationData);
//   },
//   async (compensationData: { orderId: string; previousStatusId?: string }, { container }) => {
//     // Compensación: restaurar el estado anterior si es necesario
//     if (compensationData && compensationData.previousStatusId) {
//       const orderModuleService: OrderTankuModuleService = container.resolve(
//         ORDER_TANKU_MODULE
//       );
//       await orderModuleService.updateOrderStatus(compensationData.orderId, compensationData.previousStatusId);
//     }
//   }
// );

// export default updateOrderStatusStep;
