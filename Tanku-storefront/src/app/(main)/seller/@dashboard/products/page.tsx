
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import TableProducts from "@modules/seller/components/table-products"

export const metadata: Metadata = {
  title: "Products-seller",
  description: "View and edit your Medusa Store profile.",
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()

  if (!customer || !regions) {
    notFound()
  }

  return (
    <div className="w-full" >
          <div className="m-10">
            <TableProducts/>
          </div>
    </div>
  )
}

const Divider = () => {
  return <div className="w-full h-px bg-gray-200" />
}
;``
