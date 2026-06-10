import type { Metadata } from 'next'
import './globals.css'
import { LangProvider } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'CyklaUpp — Bike Rental for Uppsala Students',
  description: 'Affordable bike rental for Uppsala University students. Semester, monthly, weekly and daily rentals.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
