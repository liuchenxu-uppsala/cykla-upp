'use client'
import { Bike } from '@/lib/supabase'
import { useLang } from '@/lib/lang'
import Link from 'next/link'

export default function BikeCard({ bike }: { bike: Bike }) {
  const { t, lang } = useLang()

  const name = lang === 'en' ? bike.name_en : bike.name_sv
  const desc = lang === 'en' ? bike.description_en : bike.description_sv

  const statusStyles = {
    available: 'bg-green-50 text-green-700',
    rented: 'bg-red-50 text-red-600',
    maintenance: 'bg-yellow-50 text-yellow-700',
  }
  const statusLabel = {
    available: t.status_available,
    rented: t.status_rented,
    maintenance: t.status_maintenance,
  }
  const typeLabel = bike.type === 'single_speed' ? t.type_single : bike.type === '3_speed' ? t.type_3speed : t.type_multi

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white hover:border-gray-300 transition-colors">
      <div className="aspect-[4/3] bg-gray-50 relative">
        {bike.image_url ? (
          <img
            src={bike.image_url}
            alt={name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="64" height="48" viewBox="0 0 64 48" fill="none" aria-hidden="true">
              <circle cx="12" cy="36" r="10" stroke="#CBD5E1" strokeWidth="2" fill="none"/>
              <circle cx="52" cy="36" r="10" stroke="#CBD5E1" strokeWidth="2" fill="none"/>
              <path d="M12 36 L28 12 L52 36" stroke="#CBD5E1" strokeWidth="2" fill="none"/>
              <path d="M28 12 L38 24" stroke="#FFD500" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="28" cy="10" r="4" fill="#CBD5E1"/>
            </svg>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900">{name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusStyles[bike.status]}`}>
            {statusLabel[bike.status]}
          </span>
        </div>

        <p className="text-xs text-gray-400 mb-2">{typeLabel}</p>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{desc}</p>

        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-500">
            {t.from} <span className="text-lg font-semibold text-[#0F2D6B]">{bike.price_day}</span> {t.sek}{t.per_day}
          </span>
          <Link
            href={`/bikes/${bike.id}`}
            className="text-sm text-[#0F2D6B] font-medium hover:underline"
          >
            {t.view_details} →
          </Link>
        </div>
      </div>
    </div>
  )
}
