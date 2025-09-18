import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { StoreContextProvider } from "@lib/context/store-context";
import { RegionProvider } from "@lib/context/region-context"
import { PersonalInfoProvider } from "@lib/context/personal-info-context"
import { StalkerGiftProvider } from "@lib/context/stalker-gift-context"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <RegionProvider>
        <UserProvider>
          <StoreContextProvider>
            <PersonalInfoProvider>
              <StalkerGiftProvider>
                <main className="relative">{props.children}</main>
              </StalkerGiftProvider>
            </PersonalInfoProvider>
          </StoreContextProvider>
        </UserProvider>
        </RegionProvider>
      </body>
    </html>
  )
}
