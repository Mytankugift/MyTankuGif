"use server"

export interface UpdatePseudonymData {
  customer_id: string;
  pseudonym: string;
}

export interface UpdatePseudonymResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  details?: any;
}

export async function updatePseudonym(data: UpdatePseudonymData): Promise<UpdatePseudonymResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/personal-info/update-pseudonym`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_id: data.customer_id,
        pseudonym: data.pseudonym,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Error al actualizar seudónimo",
        details: result.details,
      };
    }

    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: "Error de conexión al actualizar seudónimo",
    };
  }
}


