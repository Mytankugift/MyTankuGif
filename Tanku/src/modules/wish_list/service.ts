import { MedusaService } from "@medusajs/framework/utils";
import WishList from "./models/wish_list";
import WishListState from "./models/wish_list_state";

class WishListModuleService extends MedusaService({
  WishList,
  WishListState,
}) {
  // Aquí puedes agregar métodos específicos para el servicio
}

export default WishListModuleService;