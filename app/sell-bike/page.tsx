'use client'
import Navbar from '@/components/Navbar'
import SellBikeForm from '@/components/SellBikeForm'
import { useLang } from '@/lib/lang'

export default function SellBikePage() {
  const { t } = useLang()

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{t.sell_title}</h1>
        <p className="text-sm text-gray-500 mb-8">{t.sell_subtitle}</p>
        <SellBikeForm />
      </div>
    </div>
  )
}
