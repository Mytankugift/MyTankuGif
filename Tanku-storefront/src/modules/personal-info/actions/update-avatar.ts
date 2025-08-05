"use server"

export interface UpdateAvatarData {
  customer_id: string;
  avatar: File;
}

export interface UpdateAvatarResponse {
  success: boolean;
  message?: string;
  data?: {
    avatar_url: string;
    personal_info: any;
  };
  error?: string;
  details?: any;
}

export async function updateAvatar(data: UpdateAvatarData): Promise<UpdateAvatarResponse> {
  try {
    console.log("=== Frontend Update Avatar Action ===");
    console.log("Customer ID:", data.customer_id);
    console.log("Avatar file:", data.avatar.name);

    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append("customer_id", data.customer_id);
    formData.append("avatar", data.avatar);

    // Hacer petición al endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/personal-info/update-avatar`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    console.log("Backend response:", result);

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Error al actualizar avatar",
        details: result.details
      };
    }

    return {
      success: true,
      message: result.message,
      data: result.data
    };

  } catch (error) {
    console.error("Error in updateAvatar action:", error);
    return {
      success: false,
      error: "Error de conexión al actualizar avatar"
    };
  }
}
