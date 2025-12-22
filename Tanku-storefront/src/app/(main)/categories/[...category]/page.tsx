import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import CategoryTemplate from "@modules/categories/templates"
import CategoryTemplateTanku from "@modules/categories/templates/category-template-tanku"
import { StoreProductCategory, StoreRegion, StoreProduct } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

// SSG (Static Site Generation) - OPCIÓN MÁS RÁPIDA
// - Todas las páginas se generan durante el build
// - Se sirven instantáneamente desde el CDN (máximo rendimiento)
// - Requiere que el backend esté disponible durante el build
export const dynamic = 'force-static' // Fuerza generación estática

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

// Intenta generar rutas estáticas, pero no falla si no puede
// Las páginas se generarán on-demand si no están en el build
export async function generateStaticParams() {
  try {
    // Durante el build, forzar a obtener datos frescos sin cache
    const product_categories = await listCategories({ limit: 1000 }, { noCache: true })

    if (!product_categories || product_categories.length === 0) {
      console.log("ℹ️  No se encontraron categorías en el backend. No se generarán rutas estáticas.")
      return []
    }

    console.log(`✓ Se encontraron ${product_categories.length} categorías en el backend`)
    
    // Identificar categorías con problemas (espacios al final)
    const categoriesWithIssues = product_categories.filter((c: any) => 
      c.handle && (c.handle !== c.handle.trim() || c.handle.includes('%'))
    )
    if (categoriesWithIssues.length > 0) {
      console.warn(`⚠ ${categoriesWithIssues.length} categorías con problemas (espacios o caracteres especiales):`)
      categoriesWithIssues.forEach((c: any) => {
        console.warn(`  - "${c.handle}" (debería ser: "${c.handle.trim()}")`)
      })
    }

    const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes || countryCodes.length === 0) {
      console.warn("No se encontraron códigos de país")
      return []
    }

    // Limpiar handles: eliminar espacios al inicio/final y normalizar
    const categoryHandles = product_categories
      .map((category: any) => category.handle?.trim())
      .filter(Boolean)
      .filter((handle: string) => handle.length > 0) // Filtrar strings vacíos después del trim

    const staticParams = countryCodes
      .map((countryCode: string | undefined) =>
        categoryHandles.map((handle: string) => ({
          countryCode,
          category: [handle],
        }))
      )
      .flat()

    console.log(`✓ Se generarán ${staticParams.length} rutas estáticas (${categoryHandles.length} categorías × ${countryCodes.length} países)`)
    return staticParams
  } catch (error) {
    // Si falla, devuelve array vacío - las páginas se generarán on-demand
    console.warn(
      `No se pudieron pre-generar rutas estáticas: ${
        error instanceof Error ? error.message : "Unknown error"
      }. Las páginas se generarán bajo demanda.`
    )
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    // Decodificar las categorías de la URL
    const decodedCategory = params.category.map(cat => decodeURIComponent(cat).trim())
    const productCategory = await getCategoryByHandle(decodedCategory)

    if (!productCategory) {
      notFound()
    }

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
  
  try {
    // Decodificar las categorías de la URL (Next.js las codifica automáticamente)
    const decodedCategory = params.category.map(cat => decodeURIComponent(cat).trim())
    const productCategoryHandler = await getCategoryByHandle(decodedCategory) as ExtendedStoreProductCategory
    
    if (!productCategoryHandler) {
      // Log which category was not found for debugging
      console.warn(`Category not found: /categories/${params.category.join('/')}`)
      notFound()
    }

    if(productCategoryHandler.category_children && productCategoryHandler.category_children.length > 0){
      const categoryHandler = await allDataCategories(productCategoryHandler, 0, 3) // Max depth: 3
      return (
        <CategoryTemplateTanku category={categoryHandler} />
      )
    }

    return (
      <CategoryTemplateTanku category={productCategoryHandler} />
    )
  } catch (error) {
    console.error("Error loading category page:", error)
    notFound()
  }
}

async function allDataCategories(
  categoryHandler: ExtendedStoreProductCategory,
  currentDepth: number = 0,
  maxDepth: number = 3
): Promise<ExtendedStoreProductCategory> {
  // Prevent infinite recursion and limit depth
  if (currentDepth >= maxDepth) {
    return categoryHandler
  }

  if (!categoryHandler.category_children || categoryHandler.category_children.length === 0) {
    return categoryHandler
  }

  // Process children in parallel for better performance
  const childrenPromises = categoryHandler.category_children.map(async (category, i) => {
    try {
      const productCategory = await getCategoryByHandle([category.handle])
      
      if (!productCategory) {
        return category
      }
      
      // Asignar productos a la categoría hija
      const updatedCategory = {
        ...category,
        products: productCategory.products
      }
      
      // Si la categoría hija tiene sus propias categorías hijas, procesarlas recursivamente
      if(productCategory.category_children && productCategory.category_children.length > 0){
        const extendedProductCategory = productCategory as ExtendedStoreProductCategory
        const processedCategory = await allDataCategories(extendedProductCategory, currentDepth + 1, maxDepth)
        
        return {
          ...updatedCategory,
          products: processedCategory.products || productCategory.products,
          category_children: processedCategory.category_children
        }
      }
      
      return updatedCategory
    } catch (error) {
      // Skip this child category if there's an error, but return the original category
      console.warn(`Error processing child category ${category.handle}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return category
    }
  })

  // Wait for all children to be processed
  const processedChildren = await Promise.all(childrenPromises)
  categoryHandler.category_children = processedChildren
 
  return categoryHandler
}
