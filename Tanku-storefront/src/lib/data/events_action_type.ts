type ActionType = "view_product" | "add_to_cart" | "purchase" | "wishlist" | "search" | "navigation";
import { retrieveCustomer } from "@lib/data/customer"
// Define base URL for API - this would typically come from environment variables
const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

export const captureUserBehavior = async (
  keyword: string,
  actionType: ActionType,

): Promise<any> => {
 console.log("keyword", keyword)
 console.log("actionType", actionType)
 const customer = await retrieveCustomer().catch(() => null)

if(!customer || !customer.id) return
  try {
    const data = {
      customer_id: customer.id,
      action_type: actionType,
      keywords: keyword,
    };

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/user-behaviors`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key":
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error capturing user behavior:", error);
    throw error;
  }
};
