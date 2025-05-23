"use client"
import { useEffect } from "react"
import { loginWordpress, verifyWordpressToken } from "@lib/data/customer"

type DecodedToken = {
  uid: number
  eml: string
  exp: number
}
export const LoginWPTemplate = ({ token }: { token: string }) => {

  const authenticateWordpress = async (token: string) => {
    try {
      // Use the server action to verify the token instead of doing it client-side
      const decoded = await verifyWordpressToken(token)
      console.log("datos del token:", decoded)

      if (decoded && decoded.eml) {
        await loginWordpress(decoded.eml, token)
      } else {
        console.error("Token verification failed: Invalid token data")
      }
    } catch (error) {
      console.error("Token verification failed:", error)
    }
  }
  useEffect(() => {
    authenticateWordpress(token)
  }, [token])

  return <div className="">token {token}</div>
}
