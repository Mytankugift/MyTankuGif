import { TankuProduct } from "../../../types/global"
import ProductActionsTanku from "../components/product-actions-tanku/index"

type Props = {
  product: TankuProduct
}

const ProductActionsWrapperTanku = ({ product }: Props) => {
  return <ProductActionsTanku product={product} />
}

export default ProductActionsWrapperTanku
