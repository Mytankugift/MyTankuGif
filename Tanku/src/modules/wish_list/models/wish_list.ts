import { model } from "@medusajs/framework/utils";
import WishListState from "./wish_list_state";

const WishList = model.define("wish_list", {
  id: model.id().primaryKey(),
  title: model.text(),
  state: model.belongsTo(() => WishListState, {
    mappedBy: "wishlists",
  }),
});

export default WishList;