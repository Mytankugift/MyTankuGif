// import { ImportProductData } from "../components/table-products"


// export const postAddProducts = async (
//   data: ImportProductData[],
//   storeId: string
// ): Promise<void> => {
//   try {
    
//     const response = await fetch(
//       `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/seller/product`,
//       {
//         method: "POST",
//         credentials: "include",
//         headers: {
//           "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
//         },
//         body: JSON.stringify({ data,  storeId }),
//       }
//     )

//     const result = await response.json()
//     return result
//   } catch (error) {
//     console.error("Error al enviar los datos del producto:", error)
//     throw error
//   }
// }



import { ImportProductData } from "../components/table-products"


export const postAddProducts = async (
  data: ImportProductData[],
  storeId: string
): Promise<void> => {
  try {
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/seller/products`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify({ data,  storeId }),
      }
    )

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al enviar los datos del producto:", error)
    throw error
  }
}
