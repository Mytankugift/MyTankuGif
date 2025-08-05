"use server"

export interface UpdateStatusMessageData {
  customer_id: string;
  status_message: string;
}

export interface UpdateStatusMessageResponse {
  success: boolean;
  message?: string;
  data?: {
    status_message: string;
    personal_info: any;
  };
  error?: string;
  details?: any;
}

export async function updateStatusMessage(data: UpdateStatusMessageData): Promise<UpdateStatusMessageResponse> {
  try {
    console.log("=== Frontend Update Status Message Action ===");
    console.log("Customer ID:", data.customer_id);
    console.log("Status Message:", data.status_message);

    // Hacer petición al endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/personal-info/update-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_id: data.customer_id,
        status_message: data.status_message
      }),
    });

    const result = await response.json();
    console.log("Backend response:", result);

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Error al actualizar mensaje de estado",
        details: result.details
      };
    }

    return {
      success: true,
      message: result.message,
      data: result.data
    };

  } catch (error) {
    console.error("Error in updateStatusMessage action:", error);
    return {
      success: false,
      error: "Error de conexión al actualizar mensaje de estado"
    };
  }
}
