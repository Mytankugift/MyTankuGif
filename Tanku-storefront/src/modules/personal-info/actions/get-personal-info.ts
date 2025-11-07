"use server"

export interface PersonalInfoData {
  id: string;
  customer_id: string;
  avatar_url?: string;
  status_message?: string;
  pseudonym?: string;
  bio?: string;
  location?: string;
  website?: string;
  banner_profile_url?: string;
  social_url?: any;
  birthday?: string;
  marital_status?: string;
  languages?: any;
  interests?: any;
  favorite_colors?: any;
  favorite_activities?: any;
  friends_count?: number;
}

export interface GetPersonalInfoResponse {
  success: boolean;
  data?: PersonalInfoData | null;
  error?: string;
  details?: any;
}

export async function getPersonalInfo(customer_id: string): Promise<GetPersonalInfoResponse> {
  try {
    console.log("=== Frontend Get Personal Info Action ===");
    console.log("Customer ID:", customer_id);

    // Hacer petición al endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/personal-info/get-info?customer_id=${encodeURIComponent(customer_id)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();
    console.log("Backend response:", result);

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Error al obtener información personal",
        details: result.details
      };
    }

    return {
      success: true,
      data: result.data
    };

  } catch (error) {
    console.error("Error in getPersonalInfo action:", error);
    return {
      success: false,
      error: "Error de conexión al obtener información personal"
    };
  }
}
