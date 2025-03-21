import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"
import { Button } from "@medusajs/ui"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Medusa Store account.",
}

export default function Login() {
  // return <LoginTemplate />


  return (
    <div className="flex flex-col items-center">
      <Link href="/dk/auth/login">
        <Button
          variant="secondary"
          className="mb-4"
        >
          Sign in
        </Button>
      </Link> 
      <Link href="/dk/auth/logout">
        <Button
          variant="danger"
          className="mb-4"
        >
          Sign out
        </Button>
      </Link>
    </div>
  )
}




