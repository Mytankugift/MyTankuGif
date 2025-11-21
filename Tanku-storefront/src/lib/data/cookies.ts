import "server-only"
import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  try {
    // During build time (generateStaticParams), cookies() is not available
    // Return empty object to skip auth headers during build
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      // Only log in development, not during build
      if (process.env.NODE_ENV === "development" && typeof window === "undefined") {
        console.log("⚠️ getAuthHeaders - No token encontrado en cookies")
      }
      return {}
    }

    // Only log in development, not during build
    if (process.env.NODE_ENV === "development" && typeof window === "undefined") {
      console.log("✅ getAuthHeaders - Token encontrado:", token.substring(0, 20) + "...")
    }
    return { authorization: `Bearer ${token}` }
  } catch (error) {
    // Silently fail during build time when cookies are not available
    // Only log actual errors in development
    if (process.env.NODE_ENV === "development") {
      console.error("❌ getAuthHeaders - Error:", error)
    }
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    // During build time (generateStaticParams), cookies() is not available
    // Return empty string to skip cache tagging during build
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch (error) {
    // Silently fail during build time when cookies are not available
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
  // Log para debugging solo en desarrollo
  if (process.env.NODE_ENV === "development") {
    console.log("🍪 setAuthToken - Token establecido en cookie:", token.substring(0, 20) + "...")
  }
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}
