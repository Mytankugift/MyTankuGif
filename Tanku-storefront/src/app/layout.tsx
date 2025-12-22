import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { StoreContextProvider } from "@lib/context/store-context";
import { RegionProvider } from "@lib/context/region-context"
import { PersonalInfoProvider } from "@lib/context/personal-info-context"
import { StalkerGiftProvider } from "@lib/context/stalker-gift-context"
import { ProfileNavigationProvider } from "@lib/context/profile-navigation-context"
import { StoryUploadProvider } from "@lib/context/story-upload-context"

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
                <ProfileNavigationProvider>
                  <StoryUploadProvider>
                    <main className="relative">{props.children}</main>
                  </StoryUploadProvider>
                </ProfileNavigationProvider>
              </StalkerGiftProvider>
            </PersonalInfoProvider>
          </StoreContextProvider>
        </UserProvider>
        </RegionProvider>
      </body>
    </html>
  )
}
