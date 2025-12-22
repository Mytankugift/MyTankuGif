import type { FormDataValues, formFiles } from "../templates/seller-layout"

export const submitFormData = async (
  data: FormDataValues,
  files: formFiles,
  customerId: string
): Promise<void> => {
  try {
    // Crear un objeto FormData
    const formData = new FormData()

    // Agregar los campos del formulario al FormData
    formData.append("requestData", JSON.stringify({ ...data, customerId }))

    // Agregar los archivos PDF al FormData
    if (files.rutFile) {
      formData.append("files", files.rutFile)
    }
    if (files.commerceFile) {
      formData.append("files", files.commerceFile)
    }
    if (files.idFile) {
      formData.append("files", files.idFile)
    }

    // Asume que ya has añadido los campos necesarios al formData

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/seller/request`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
        },
        body: formData,
      }
    )

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al enviar los datos:", error)
    throw error
  }
}
