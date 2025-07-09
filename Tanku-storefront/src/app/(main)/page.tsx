import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import PreviewProductsTanku from "@modules/home/components/preview-products-tanku.ts"
import { fetchListStoreProduct } from "@modules/home/components/actions/get-list-store-products"

export const metadata: Metadata = {
  title: "Medusa Next.js Starter Template",
  description:
    "A performant frontend ecommerce starter template with Next.js 15 and Medusa.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  // const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  const products = await fetchListStoreProduct()

  // if (!collections || !region) {
  //   return null
  // }

  return (
    <>
      {/* <Hero /> */} 
      {/* Ajustar paradas del degradado */}
      <div className="py-6 bg-gradient-to-b from-blueTanku/80 via-blueTanku/5 to-white/90">
        <PreviewProductsTanku products={products} />
      </div>
    </>
  )
}
