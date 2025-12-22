import { Metadata } from "next"
import MultiPayTab from "@modules/home/components/tabs/MultiPayTab"

export const metadata: Metadata = {
  title: "MultiPay",
  description: "Descubre la funcionalidad MultiPay de TANKU",
}

export default async function MultiPayPage() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#1E1E1E" }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <MultiPayTab />
      </div>
    </div>
  )
}

