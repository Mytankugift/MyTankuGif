import { Metadata } from "next"
import { redirect } from "next/navigation"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import UsersList from "@modules/social/components/users-list"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Friends",
  description: "Explore all friends.",
}

type Params = {
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    redirect("/account")
  }

  return (
    <UsersList customer={customer}/>
  )
}
