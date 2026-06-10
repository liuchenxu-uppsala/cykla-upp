'use client'
import { useLang } from '@/lib/lang'
import Link from 'next/link'

export default function Navbar() {
  const { t, lang, setLang } = useLang()

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <Link href="/" className="flex items-center gap-2 font-semibold text-[#0F2D6B] text-lg">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <circle cx="7" cy="16" r="4" stroke="#0F2D6B" strokeWidth="1.5" fill="none"/>
          <circle cx="17" cy="16" r="4" stroke="#0F2D6B" strokeWidth="1.5" fill="none"/>
          <path d="M7 16 L11 8 L17 16" stroke="#0F2D6B" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
          <path d="M11 8 L14 12" stroke="#FFD500" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="11" cy="7" r="1.5" fill="#0F2D6B"/>
        </svg>
        CyklaUpp
      </Link>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex gap-6">
          <a href="#bikes" className="text-sm text-gray-500 hover:text-gray-900">{t.nav_bikes}</a>
          <a href="#book" className="text-sm text-gray-500 hover:text-gray-900">{t.nav_book}</a>
        </div>
        <button
          onClick={() => setLang(lang === 'en' ? 'sv' : 'en')}
          className="text-xs font-medium border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 transition-colors"
        >
          {lang === 'en' ? 'SV' : 'EN'}
        </button>
      </div>
    </nav>
  )
}
