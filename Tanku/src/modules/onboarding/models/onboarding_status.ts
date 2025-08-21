import { model } from "@medusajs/framework/utils";

export const OnboardingStatus = model.define("onboarding_status", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  
  // Control de progreso del onboarding
  phase_one_completed: model.boolean().default(false),
  phase_two_completed: model.boolean().default(false),
  
  // Fechas de finalización
  phase_one_completed_at: model.dateTime().nullable(),
  phase_two_completed_at: model.dateTime().nullable(),
  
  // Control del pop-up incentivo
  incentive_popup_shown: model.boolean().default(false),
  incentive_popup_dismissed: model.boolean().default(false),
  incentive_popup_last_shown: model.dateTime().nullable(),
  
  // Progreso por pasos (para permitir guardar progreso parcial)
  phase_one_current_step: model.number().default(1), // 1-6
  phase_two_current_step: model.number().default(1), // 1-8
  
  // Metadatos
 
}).indexes([
  { on: ["customer_id"], unique: true } // Un registro por customer
]);

export default OnboardingStatus;
