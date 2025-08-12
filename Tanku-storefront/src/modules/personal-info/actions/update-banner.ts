"use server"

export interface UpdateBannerData {
  customer_id: string;
  banner: File;
}

export interface UpdateBannerResponse {
  success: boolean;
  message?: string;
  data?: {
    banner_url: string;
    personal_info: any;
  };
  error?: string;
  details?: any;
}

export async function updateBanner(data: UpdateBannerData): Promise<UpdateBannerResponse> {
  try {
    console.log("=== Frontend Update Banner Action ===");
    console.log("Customer ID:", data.customer_id);
    console.log("Banner file:", data.banner.name);

    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append("customer_id", data.customer_id);
    formData.append("banner", data.banner);

    // Hacer petición al endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/personal-info/update-banner`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    console.log("Backend response:", result);

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Error al actualizar banner",
        details: result.details
      };
    }

    return {
      success: true,
      message: result.message,
      data: result.data
    };

  } catch (error) {
    console.error("Error in updateBanner action:", error);
    return {
      success: false,
      error: "Error de conexión al actualizar banner"
    };
  }
}
