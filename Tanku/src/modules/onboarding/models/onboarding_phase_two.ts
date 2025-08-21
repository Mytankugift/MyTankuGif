import { model } from "@medusajs/framework/utils";

export const OnboardingPhaseTwo = model.define("onboarding_phase_two", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  
  // Paso 1 - Tipos de Productos que te Interesan
  product_interests: model.json(), // Array: ["ropa", "zapatos", "tecnología", etc.]
  
  // Paso 2 - Redes Sociales e Interacción
  favorite_social_networks: model.json(), // Array: ["instagram", "tiktok", "facebook", etc.]
  preferred_interaction: model.json(), // Array: ["compartir_contenido", "ver_publicaciones", etc.]
  
  // Paso 3 - Compras y Presupuesto
  purchase_frequency: model.text(), // una_vez_semana, varias_veces_mes, una_vez_mes, muy_ocasional
  monthly_budget: model.text(), // segmentos de presupuesto
  brand_preference: model.text(), // reconocidas, independientes, ambas
  purchase_motivation: model.text(), // para_mi, para_regalar, ambos
  
  // Paso 4 - Círculo Social
  social_circles: model.json(), // Array: ["familia", "amigos", "trabajo", etc.]
  
  // Paso 5 - Conexiones
  wants_connections: model.text(), // si, no, tal_vez
  connection_types: model.json().nullable(), // Array: ["amistades", "networking", "colaboraciones", etc.]
  
  // Paso 6 - Estilo de Vida y Valores
  lifestyle_style: model.json(), // Array: ["creativo", "minimalista", "aventurero", etc.]
  personal_values: model.json(), // Array: ["gratitud", "resiliencia", "bienestar", etc.]
  
  // Paso 7 - Expectativas de la Plataforma
  platform_expectations: model.json(), // Array: ["inspiración", "conocer_personas", "comprar", etc.]
  preferred_content_type: model.json(), // Array: ["tips", "opiniones", "estilo_vida", etc.]
  
  // Paso 8 - Hábitos y Notificaciones
  connection_moments: model.json(), // Array: ["mañana", "tarde", "noche"]
  shopping_days: model.text(), // semana, fines_semana, sin_preferencia
  ecommerce_experience: model.text(), // frecuente, a_veces, nunca
  social_activity_level: model.text(), // muy_activo, observador, poco_activo
  notifications_preference: model.text(), // si, no, solo_productos, solo_amigos
  
  // Control de estado
  completed_at: model.dateTime(),
 
}).indexes([
  { on: ["customer_id"], unique: true } // Un registro por customer
]);

export default OnboardingPhaseTwo;
