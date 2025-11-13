import { Metadata } from "next"
import MultiPayTab from "@modules/home/components/tabs/MultiPayTab"

export const metadata: Metadata = {
  title: "MultiPay",
  description: "Descubre la funcionalidad MultiPay de TANKU.",
}

export default function MultiPayPage() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#1E1E1E" }}>
      <MultiPayTab />
    </div>
  )
}



