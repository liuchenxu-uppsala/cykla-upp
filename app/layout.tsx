import type { Metadata } from 'next'
import './globals.css'
import { LangProvider } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'CyklaUpp — Bike Rental for Uppsala Students',
  description: 'Affordable bike rental for Uppsala University students. Semester and monthly rentals.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
