import type { Metadata } from 'next'
import './globals.css'
import { LangProvider } from '@/lib/lang'
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
  title: 'CyklaUpp — Bike Rental for Uppsala Students',
  description: 'Affordable bike rental for Uppsala University students. Semester and monthly rentals.',
  openGraph: {
    title: 'CyklaUpp — Bike Rental for Uppsala Students',
    description: 'Monthly or semester rental — easy booking, flexible pickup.',
    url: 'https://www.cyklaupp.se',
    siteName: 'CyklaUpp',
    images: [
      {
        url: 'https://www.cyklaupp.se/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CyklaUpp — Bike Rental for Uppsala Students',
      },
    ],
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <head>
        <link rel="icon" href="/favicon.ico?v=2" sizes="32x32" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" type="image/x-icon" />
        <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <LangProvider>
          {children}
        </LangProvider>
        <Analytics />
      </body>
    </html>
  )
}
