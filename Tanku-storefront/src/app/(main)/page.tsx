import { Metadata } from "next"
import HomeContentFeed from "@modules/home/templates/feed"

export const metadata: Metadata = {
  title: "Home",
  description: "Home or Feed",
}

export default async function HomePage() {
  // Siempre mostrar el feed de productos (sin publicaciones si no hay sesión)
  return <HomeContentFeed />
}
