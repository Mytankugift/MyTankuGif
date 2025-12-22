import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
}

export async function generateStaticParams() {
  try {
    // During build time, we can't use cookies, so we make direct calls without auth
    // This is safe because we're only fetching public data (regions and product handles)
    const { sdk } = await import("@lib/config")
    
    // Fetch regions directly without using getCacheOptions (which requires cookies)
    const { regions } = await sdk.client.fetch<{ regions: Array<{ countries?: Array<{ iso_2?: string }> }> }>(
      `/store/regions`,
      {
        method: "GET",
        cache: "force-cache",
      }
    )

    if (!regions || regions.length === 0) {
      return []
    }

    const countryCodes = regions
      ?.map((r) => r.countries?.map((c) => c.iso_2))
      .flat()
      .filter(Boolean) as string[]

    if (!countryCodes || countryCodes.length === 0) {
      return []
    }

    // Find a region to use for fetching products (use first available)
    const firstRegion = regions[0]
    if (!firstRegion) {
      return []
    }

    // Fetch products directly without using listProducts (which requires cookies)
    const { products } = await sdk.client.fetch<{ products: Array<{ handle: string }> }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit: 100,
          offset: 0,
          fields: "handle",
        },
        cache: "force-cache",
      }
    )

    if (!products || products.length === 0) {
      return []
    }

    return countryCodes
      .map((countryCode) =>
        products.map((product) => ({
          countryCode,
          handle: product.handle,
        }))
      )
      .flat()
      .filter((param) => param.handle)
  } catch (error) {
    // During build time, the backend might not be available or fetch might fail
    // Return empty array to allow build to continue with dynamic rendering
    console.warn(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }. Build will continue with dynamic rendering.`
    )
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | Medusa Store`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | Medusa Store`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
    />
  )
}
