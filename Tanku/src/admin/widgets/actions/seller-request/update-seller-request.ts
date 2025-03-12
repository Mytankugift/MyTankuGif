const BACKEND = "http://localhost:9000";

export const updateSellerRequest = async (
  status_id: "id_accept" | "id_reject" | "id_correction",
  id: string,
  comment?: string
) => {
  try {
    const response = await fetch(`${BACKEND}/admin/seller/request`, {
      method: "POST",
      credentials: "include", // Equivalente a withCredentials: true
      headers: {
        "Content-Type": "application/json", // Especifica el tipo de contenido
      },
      body: JSON.stringify({ status_id, id, comment }), // Convierte el cuerpo a JSON
    });

    if (!response.ok) {
      throw new Error(
        `Error al actualizar la aplicación: ${response.statusText}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error al actualizar la aplicación:", error);
    throw error; // Relanza el error para manejarlo en el componente que llama a esta función
  }
};
