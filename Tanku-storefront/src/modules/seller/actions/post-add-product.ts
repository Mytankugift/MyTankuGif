import { Product } from "../components/create-product-modal"


export const postAddProduct = async (
  data: Product,
  storeId: string
): Promise<void> => {
  try {
    const formData = new FormData()

    formData.append("productData", JSON.stringify({ ...data, images : [], storeId }))

    

    data.images.forEach((image, index) => {
      if (image.file instanceof File) {
        formData.append("images", image.file)
      } else {
        throw new Error(`La imagen en el índice ${index} no es un File válido:`, image.file)
      }
    })

 

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/seller/product`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
        },
        body: formData,
      }
    )

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al enviar los datos del producto:", error)
    throw error
  }
}
