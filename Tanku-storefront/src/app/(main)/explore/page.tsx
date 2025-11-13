import { Metadata } from "next"
import ExploreSearch from "@modules/home/components/tabs/explore/ExploreSearch"

export const metadata: Metadata = {
  title: "Explore",
  description: "Descubre productos y conecta con personas.",
}

export default function ExplorePage() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#1E1E1E" }}>
      <ExploreSearch />
    </div>
  )
}



