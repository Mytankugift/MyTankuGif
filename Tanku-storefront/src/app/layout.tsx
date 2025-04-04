import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { StoreContextProvider } from "@lib/context/store-context";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
      <UserProvider>
        <StoreContextProvider>
        <main className="relative">{props.children}</main>
        </StoreContextProvider>
      </UserProvider>
      </body>
    </html>
  )
}
