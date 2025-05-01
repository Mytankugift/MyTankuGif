import { Metadata } from "next"
import { getBaseURL } from "@lib/util/env"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import ConditionalLayout from "@modules/layout/components/conditional-layout"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function PageLayout(props: { children: React.ReactNode }) {
  return (
    <ConditionalLayout
      navComponent={<Nav />}
      footerComponent={<Footer />}
    >
      {props.children}
    </ConditionalLayout>
  )
}
