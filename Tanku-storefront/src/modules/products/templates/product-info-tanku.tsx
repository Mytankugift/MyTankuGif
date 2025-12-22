import { TankuProduct } from "../../../types/global"
import { Text, Heading } from "@medusajs/ui"

type ProductInfoTankuProps = {
  product: TankuProduct
}

const ProductInfoTanku = ({ product }: ProductInfoTankuProps) => {
  return (
    <div id="product-info">
      <div className="flex flex-col gap-y-6 lg:max-w-[500px] mx-auto">
        {/* Product Title and Description */}
        <div className="flex flex-col gap-y-2">
          <h1 className="text-2xl font-bold capitalize">{product.title}</h1>
          <Text className="text-base-regular">
            {product.description}
          </Text>
        </div>

        {/* Store Information */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <Heading className="text-lg font-semibold mb-3">Store Information</Heading>
          <div className="flex flex-col gap-y-2">
            <div className="flex items-center">
              <Text className="font-medium w-32">Store Name:</Text>
              <Text>{product.store?.name || 'N/A'}</Text>
            </div>
            
           
            <div className="flex items-center">
              <Text className="font-medium w-32">Created:</Text>
              <Text className="text-sm text-gray-600">
                {product.store?.created_at 
                  ? new Date(product.store.created_at).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductInfoTanku
