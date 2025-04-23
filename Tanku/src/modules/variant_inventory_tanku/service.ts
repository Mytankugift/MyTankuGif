import { MedusaService } from "@medusajs/framework/utils"
import { VariantInventoryTanku } from "./models/variant-inventory-tanku"

class VariantInventoryTankuModuleService extends MedusaService({
  VariantInventoryTanku,
}) {
  // Puedes añadir métodos personalizados aquí si es necesario
}

export default VariantInventoryTankuModuleService