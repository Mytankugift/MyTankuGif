import { Metadata } from "next"
import { retrieveCustomer } from "@lib/data/customer"
import HomeContentFeed from "@modules/home/templates/feed"
import HomeContent from "@modules/home/templates/home"

export const metadata: Metadata = {
  title: "Home",
  description: "Home or Feed",
}



export default async function HomePage() {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    return <HomeContent />
  }else{
    return <HomeContentFeed />
  }

}
