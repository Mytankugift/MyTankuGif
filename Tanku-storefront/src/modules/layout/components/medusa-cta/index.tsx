import { Text } from "@medusajs/ui"
 import Image from "next/image"
import Medusa from "../../../common/icons/medusa"
import NextJs from "../../../common/icons/nextjs"

const MedusaCTA = () => {
  return (
    <Text className="flex gap-x-2 txt-compact-small-plus items-center lg:ml-52">
      TANKU
      <Image src="/logoTanku.png" alt="Logo" width={24} height={24} />
    </Text>
  )
}

export default MedusaCTA
