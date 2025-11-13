import { Metadata } from "next"
import StalkerGiftTab from "@modules/home/components/tabs/StalkerGiftTab"

export const metadata: Metadata = {
  title: "StalkerGift",
  description: "Envía regalos sorpresa a tus amigos.",
}

export default function StalkerGiftPage() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#1E1E1E" }}>
      <StalkerGiftTab />
    </div>
  )
}



