"use client"
import { useEffect, useState } from "react"
import { loginWordpress, verifyWordpressToken } from "@lib/data/customer"
import RedirectTab from "app/(main)/authwordpress/[token]/redirect-tab-client"

type DecodedToken = {
  uid: number
  eml: string
  exp: number
}
export const LoginWPTemplate = ({ token }: { token: string }) => {

      const [aux, setAux] = useState(false)
      useEffect(() => {
        verifyWordpressToken(token).then((decoded) => {
          console.log("datos del token:", decoded)

          if (decoded && decoded.eml) {
            loginWordpress(decoded.eml, token)
            setAux(true)
          } else {
            console.error("Token verification failed: Invalid token data")
          }
        })
      }, [token])

  return <div className="">token {token}
  {/* {aux && <RedirectTab token={token} />} */}
  </div>
}
