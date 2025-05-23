"use client"
import { useEffect } from "react"
import { loginWordpress, verifyWordpressToken } from "@lib/data/customer"

type DecodedToken = {
  uid: number
  eml: string
  exp: number
}
export const LoginWPTemplate = ({ token }: { token: string }) => {

      verifyWordpressToken(token).then((decoded) => {
        console.log("datos del token:", decoded)

        if (decoded && decoded.eml) {
          loginWordpress(decoded.eml, token)
        } else {
          console.error("Token verification failed: Invalid token data")
        }
      })

  return <div className="">token {token}</div>
}
