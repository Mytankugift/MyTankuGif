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
  
  try {
    const product = await fetchTankuProduct(handle)
    
    if (!product || !product.title) {
      return {
        title: "Producto no encontrado | Tanku",
        description: "El producto que buscas no está disponible",
      }
    }

    return {
      title: `${product.title} | Tanku`,
      description: `${product.title}`,
      openGraph: {
        title: `${product.title} | Tanku`,
        description: `${product.title}`,
        images: product.thumbnail ? [product.thumbnail] : [],
      },
    }
  } catch (error) {
    console.warn("Error generando metadata para producto:", handle, error)
    return {
      title: "Producto | Tanku",
      description: "Descubre productos únicos en Tanku",
    }
  }
}

export default async function ProductPage({ params }: Props) {
  const awaitedParams = await params
  const handle = awaitedParams.handle
  const pricedProduct = await fetchTankuProduct(handle)
  
  if (!pricedProduct) {
    notFound()
  }
  
  if (pricedProduct.title) {
    captureUserBehavior(pricedProduct.title, "view_product")
  }

  return (
    <ProductTankuTemplate
      product={pricedProduct}
    />
  )
}
