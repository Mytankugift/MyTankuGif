import { EventsAuthGate } from '@/components/events/events-auth-gate'

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <EventsAuthGate>{children}</EventsAuthGate>
}
