import { model } from "@medusajs/framework/utils";

const OnboardingPhaseOne = model.define("onboarding_phase_one", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  
  // Paso 1 - Datos Personales
  birth_date: model.dateTime(),
  gender: model.text(), // masculino, femenino, no_binario, prefiero_no_decir
  marital_status: model.text(), // soltero, en_relacion, casado, divorciado, viudo, union_libre
  country: model.text(),
  city: model.text(),
  
  // Paso 2 - Idiomas que Habla
  languages: model.json(), // Array de idiomas: ["español", "inglés", "francés", etc.]
  
  // Paso 3 - Intereses Principales
  main_interests: model.json(), // Array de intereses (3-8): ["tecnología", "viajes", "música", etc.]
  
  // Paso 4 - Colores que te representan
  representative_colors: model.json(), // Array de colores: ["rojo", "azul", "verde", etc.]
  
  // Paso 5 - Actividades que disfrutas
  favorite_activities: model.json(), // Array de actividades (3-5): ["leer", "ejercicio", "arte", etc.]
  
  // Paso 6 - Celebraciones importantes
  important_celebrations: model.json().nullable(), // Array opcional: ["navidad", "año_nuevo", etc.]
  
  // Campo temporal para compatibilidad con BD existente
  completed_at: model.dateTime().nullable(),

  
}).indexes([
  { on: ["customer_id"], unique: true } // Un registro por customer
]);

export default OnboardingPhaseOne;
