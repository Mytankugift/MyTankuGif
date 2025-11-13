"use client"

import ProfilePanel from "@modules/layout/components/profile-panel"

export default function ProfilePage() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#1E1E1E" }}>
      <ProfilePanel onClose={() => {}} hideCloseButton={true} />
    </div>
  )
}



