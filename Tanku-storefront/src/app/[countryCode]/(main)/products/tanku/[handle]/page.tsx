import { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchTankuProduct } from "@lib/data/product-tanku"
import ProductTankuTemplate from "@modules/products/templates/template-product-tanku"

type Props = {
   params: { handle: string, countryCode: string }
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = params
 
const product = await fetchTankuProduct(handle)

return {
    title: `${product.title} | Tanku`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | Tanku`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
  
}

export default async function ProductPage({ params }: Props) {
  const { handle } = params
  const pricedProduct = await fetchTankuProduct(handle)
  if (!pricedProduct.result) {
    notFound()
  }

  return (
    <ProductTankuTemplate
      product={pricedProduct.result}
    />
  )
}
