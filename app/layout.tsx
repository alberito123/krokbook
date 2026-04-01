import type { Metadata } from 'next'
import { BattlePresenceSync } from '@/components/BattlePresenceSync'
import { StoreProvider } from '@/lib/store'
import './globals.css'

export const metadata: Metadata = {
  title: 'KrokBook - Medical Exam Preparation',
  description: 'Interactive medical exam preparation with integrated note-taking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light">
      <body className="font-apple antialiased">
        <StoreProvider>
          <BattlePresenceSync />
          {children}
        </StoreProvider>
      </body>
    </html>
  )
}
