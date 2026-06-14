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
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
