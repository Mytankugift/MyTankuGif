import { model } from "@medusajs/framework/utils";
import WishList from "./wish_list";

const WishListState = model.define("wish_list_state", {
  id: model.id().primaryKey(),
  state: model.text(),
  wishlists: model.hasMany(() => WishList, {
    mappedBy: "state",
  }),
});

export default WishListState;
