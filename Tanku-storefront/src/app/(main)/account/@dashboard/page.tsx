import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Account",
  description: "Overview of your account activity.",
}

export default async function OverviewTemplate() {

  redirect(`/`)
}
