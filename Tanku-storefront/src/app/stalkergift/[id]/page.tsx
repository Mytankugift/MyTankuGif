import { Metadata } from "next"
import StalkerGiftInvitation from "@modules/stalker-gift/templates/stalker-gift-invitation"

type Props = {
  params: { id: string }
}

export const metadata: Metadata = {
  title: "StalkerGift - MyTanku",
  description: "¡Tienes un regalo sorpresa esperándote!",
}

export default function StalkerGiftPage({ params }: Props) {
  return <StalkerGiftInvitation stalkerGiftId={params.id} />
}
