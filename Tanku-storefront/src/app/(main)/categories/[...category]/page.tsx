import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import CategoryTemplate from "@modules/categories/templates"
import CategoryTemplateTanku from "@modules/categories/templates/category-template-tanku"
import { StoreProductCategory, StoreRegion, StoreProduct } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
}

type ExtendedStoreProductCategory = StoreProductCategory & {
  category_children: (StoreProductCategory & {
    products?: StoreProduct[]
  })[]
}

export async function generateStaticParams() {
  const product_categories = await listCategories()

  if (!product_categories) {
    return []
  }

  const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
    regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
  )

  const categoryHandles = product_categories.map(
    (category: any) => category.handle
  )

  const staticParams = countryCodes
    ?.map((countryCode: string | undefined) =>
      categoryHandles.map((handle: any) => ({
        countryCode,
        category: [handle],
      }))
    )
    .flat()

  return staticParams
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const productCategory = await getCategoryByHandle(params.category)

    const title = productCategory.name + " | Medusa Store"

    const description = productCategory.description ?? `${title} category.`

    return {
      title: `${title} | Medusa Store`,
      description,
      alternates: {
        canonical: `${params.category.join("/")}`,
      },
    }
  } catch (error) {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const params = await props.params
  console.log("params",params)
  const productCategoryHandler = await getCategoryByHandle(params.category) as ExtendedStoreProductCategory
  console.log("productCategoryHandler",productCategoryHandler)
  if (!productCategoryHandler) {
    console.log("entra a la pagina notFound",productCategoryHandler)
    notFound()
  }
console.log("productCategoryHandler",productCategoryHandler)
  if(productCategoryHandler.category_children.length > 0){
    const categoryHandler = await allDataCategories(productCategoryHandler)
    console.log("categoryHandler",categoryHandler)
    return (
      <CategoryTemplateTanku category={categoryHandler} />
    )
  }

  return (
    <CategoryTemplateTanku category={productCategoryHandler} />
  )
}

async function allDataCategories(categoryHandler: ExtendedStoreProductCategory): Promise<ExtendedStoreProductCategory> {
 
 for(let i = 0; i < categoryHandler.category_children.length; i++){
  const category = categoryHandler.category_children[i]
  const productCategory = await getCategoryByHandle([category.handle])
  console.log("informacion de hijo",productCategory)
  
  // Asignar productos a la categoría hija
  category.products = productCategory.products
  
  // Si la categoría hija tiene sus propias categorías hijas, procesarlas recursivamente
  if(productCategory.category_children && productCategory.category_children.length > 0){
    const extendedProductCategory = productCategory as ExtendedStoreProductCategory
    const processedCategory = await allDataCategories(extendedProductCategory)
    
    // Actualizar la categoría hija con los datos procesados recursivamente
    categoryHandler.category_children[i] = {
      ...category,
      products: processedCategory.products || productCategory.products,
      category_children: processedCategory.category_children
    }
  }
 }
 
 return categoryHandler
}
