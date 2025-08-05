import { model } from "@medusajs/framework/utils";

export const PersonalInformation = model.define("personal_information", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  avatar_url: model.text().nullable(),
  status_message: model.text().nullable(),
  banner_profile_url: model.text().nullable(),
  social_url: model.json().nullable(), // Objeto: {social: "facebook", url: "la url", alias: "@alias"}
  birthday: model.dateTime().nullable(),
  marital_status: model.text().nullable(), // estado civil
  languages: model.json().nullable(), // Array de idiomas
  interests: model.json().nullable(), // Array de intereses
  favorite_colors: model.json().nullable(), // Array de colores favoritos
  favorite_activities: model.json().nullable(), // Array de actividades favoritas
}).indexes([
  { on: ["customer_id"], unique: true } // Aseguramos que cada customer tenga solo una entrada
]);

export default PersonalInformation;
