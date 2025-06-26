import { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchTankuProduct } from "@lib/data/product-tanku"
import ProductTankuTemplate from "@modules/products/templates/template-product-tanku"
import { captureUserBehavior } from "@lib/data/events_action_type"

type Props = {
   params: { handle: string, countryCode: string }
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const awaitedParams = await params
  const handle = awaitedParams.handle
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
  const awaitedParams = await params
  const handle = awaitedParams.handle
  const pricedProduct = await fetchTankuProduct(handle).then((res) => {
    
    captureUserBehavior(res.result.title, "view_product")
    return res
  })
  if (!pricedProduct.result) {
    notFound()
  }

  return (
    <ProductTankuTemplate
      product={pricedProduct.result}
    />
  )
}
