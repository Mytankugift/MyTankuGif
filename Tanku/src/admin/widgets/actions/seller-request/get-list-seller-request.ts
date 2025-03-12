// import { BACKEND } from ".";
const BACKEND = "http://localhost:9000";
export const getListSellerRequest = async () => {
  try {
    const response = await fetch(`${BACKEND}/admin/seller/request`, {
      method: "GET",
      credentials: "include", // Equivalente a withCredentials: true
    });

    if (!response.ok) {
      throw new Error(
        `Error al obtener la lista de aplicaciones: ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log(result);
    return result;
  } catch (error) {
    console.error("Error al obtener la lista de aplicaciones:", error);
    throw error;
  }
};
