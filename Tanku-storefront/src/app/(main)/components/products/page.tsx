import { Metadata } from "next"
import WPProductsTanku from "@modules/wp/components/wp-products"
import { fetchListStoreProduct } from "@modules/home/components/actions/get-list-store-products"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
}

export default async function  Products() {
  const products = await fetchListStoreProduct()

  return <div className="w-full py-5 my-5"><WPProductsTanku products={products} /></div>
}

